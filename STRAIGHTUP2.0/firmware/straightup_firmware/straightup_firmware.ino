/*
  ============================================================================
  StraightUp — рабочая прошивка, версия "1 датчик" (без TCA9548A)
  ============================================================================

  Отличия от туториала на 3 датчика:
    - Мультиплексор TCA9548A не нужен, MPU6050 сидит прямо на A4(SDA)/A5(SCL).
    - Нет разделения "верх/низ/бок спины" — один угол наклона (pitch) и один
      порог отклонения.
    - Работа с MPU6050 через "сырые" регистры (Wire.h), без внешней
      библиотеки MPU6050 — меньше шансов словить ошибку версии библиотеки.

  Подключение (см. docs/PROTOCOL.md и README для полной схемы):
    MPU6050:      VCC->5V   GND->GND   SDA->A4   SCL->A5
    Зуммер (+):   D9                    (-) -> GND
    HC-05 RX:     D10 (Arduino TX -> HC-05 RX, при необходимости - делитель 1к/2к)
    HC-05 TX:     D11 (Arduino RX <- HC-05 TX)
    (опционально) делитель батареи LiPo -> A0, см. ENABLE_BATTERY_MONITOR ниже

  Протокол по Bluetooth — см. docs/PROTOCOL.md. Формат: JSON-строка + '\n'.
  ============================================================================
*/

#include <Wire.h>
#include <SoftwareSerial.h>
#include <EEPROM.h>

// ---------- Настройки, которые можно менять ----------
#define ENABLE_BATTERY_MONITOR 0   // 1, если распаян делитель напряжения на A0
const float BATT_EMPTY_V = 3.3;    // напряжение LiPo, соответствующее 0%
const float BATT_FULL_V  = 4.2;    // напряжение LiPo, соответствующее 100%
const float BATT_DIVIDER_RATIO = 2.0; // R1=R2=100k -> делитель /2

// ---------- Пины ----------
#define BUZZER_PIN 9
#define BT_RX_PIN 11   // Arduino RX  <- HC-05 TX
#define BT_TX_PIN 10   // Arduino TX  -> HC-05 RX
#define BATT_PIN A0

// ---------- MPU6050 ----------
#define MPU_ADDR 0x68
#define REG_PWR_MGMT_1 0x6B
#define REG_ACCEL_XOUT_H 0x3B

// ---------- Логика детекта сутулости ----------
float thresholdDeg = 12.0;          // порог отклонения, градусы (настраивается)
unsigned long holdTimeMs = 3000;    // сколько держать отклонение перед алертом
float baseline = 0;
bool isDeviating = false;
unsigned long deviationStart = 0;
bool alertActive = false;
bool mpuOk = false;

SoftwareSerial BTSerial(BT_RX_PIN, BT_TX_PIN);

// ---------- EEPROM (сохранение настроек) ----------
#define EEPROM_MAGIC 0xA5
#define EEPROM_ADDR_MAGIC 0
#define EEPROM_ADDR_THRESH 1   // float, 4 байта
#define EEPROM_ADDR_HOLD 5     // unsigned long, 4 байта

void loadSettings() {
  if (EEPROM.read(EEPROM_ADDR_MAGIC) == EEPROM_MAGIC) {
    EEPROM.get(EEPROM_ADDR_THRESH, thresholdDeg);
    EEPROM.get(EEPROM_ADDR_HOLD, holdTimeMs);
    if (thresholdDeg < 2 || thresholdDeg > 60) thresholdDeg = 12.0;
    if (holdTimeMs < 200 || holdTimeMs > 60000UL) holdTimeMs = 3000;
  }
}

void saveSettings() {
  EEPROM.update(EEPROM_ADDR_MAGIC, EEPROM_MAGIC);
  EEPROM.put(EEPROM_ADDR_THRESH, thresholdDeg);
  EEPROM.put(EEPROM_ADDR_HOLD, holdTimeMs);
}

// ---------- MPU6050 raw I2C ----------
bool mpuInit() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_PWR_MGMT_1);
  Wire.write(0);              // разбудить датчик (снять sleep bit)
  byte err = Wire.endTransmission();
  return err == 0;
}

bool mpuReadAccel(int16_t &ax, int16_t &ay, int16_t &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;
  uint8_t n = Wire.requestFrom((int)MPU_ADDR, 6);
  if (n < 6) return false;
  ax = (Wire.read() << 8) | Wire.read();
  ay = (Wire.read() << 8) | Wire.read();
  az = (Wire.read() << 8) | Wire.read();
  return true;
}

float readPitch(bool &ok) {
  int16_t ax, ay, az;
  ok = mpuReadAccel(ax, ay, az);
  if (!ok) return 0;
  float pitch = atan2((float)ay, sqrt((float)ax * ax + (float)az * az)) * 180.0 / PI;
  return pitch;
}

// ---------- Зуммер ----------
void beep(unsigned int durationMs = 150) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(durationMs);
  digitalWrite(BUZZER_PIN, LOW);
}

// ---------- Батарея ----------
int readBatteryPercent() {
#if ENABLE_BATTERY_MONITOR
  int raw = analogRead(BATT_PIN);
  float vAtPin = (raw / 1023.0) * 5.0;
  float vBatt = vAtPin * BATT_DIVIDER_RATIO;
  float pct = (vBatt - BATT_EMPTY_V) / (BATT_FULL_V - BATT_EMPTY_V) * 100.0;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return (int)pct;
#else
  return -1; // датчик напряжения не подключён — приложение покажет "—"
#endif
}

// ---------- Калибровка ----------
void calibrate() {
  BTSerial.println(F("{\"t\":\"info\",\"msg\":\"calibrating\"}"));
  delay(3000); // время принять ровную позу
  bool ok;
  // берём среднее из нескольких измерений, чтобы снизить шум
  float sum = 0;
  const int N = 10;
  for (int i = 0; i < N; i++) {
    sum += readPitch(ok);
    delay(20);
  }
  baseline = sum / N;
  isDeviating = false;
  alertActive = false;

  char buf[64];
  dtostrf(baseline, 4, 1, buf);
  BTSerial.print(F("{\"t\":\"info\",\"msg\":\"calibrated\",\"base\":"));
  BTSerial.print(buf);
  BTSerial.println(F("}"));
}

// ---------- Разбор команд с телефона ----------
String cmdBuf = "";

void handleCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd == "CAL") {
    calibrate();
  } else if (cmd == "BEEP") {
    beep(150);
  } else if (cmd == "PING") {
    BTSerial.println(F("{\"t\":\"info\",\"msg\":\"pong\"}"));
  } else if (cmd.startsWith("SET_THRESH:")) {
    float v = cmd.substring(11).toFloat();
    if (v >= 2 && v <= 60) {
      thresholdDeg = v;
      saveSettings();
      BTSerial.println(F("{\"t\":\"info\",\"msg\":\"thresh_set\"}"));
    }
  } else if (cmd.startsWith("SET_HOLD:")) {
    long v = cmd.substring(9).toInt();
    if (v >= 200 && v <= 60000) {
      holdTimeMs = (unsigned long)v;
      saveSettings();
      BTSerial.println(F("{\"t\":\"info\",\"msg\":\"hold_set\"}"));
    }
  }
}

void pollBluetoothCommands() {
  while (BTSerial.available()) {
    char c = BTSerial.read();
    if (c == '\n') {
      handleCommand(cmdBuf);
      cmdBuf = "";
    } else if (c != '\r') {
      cmdBuf += c;
      if (cmdBuf.length() > 60) cmdBuf = ""; // защита от мусора на линии
    }
  }
}

// ---------- Setup / loop ----------
unsigned long lastSendMs = 0;
const unsigned long SEND_INTERVAL_MS = 200; // ~5 Hz

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.begin(9600);     // USB, для отладки через Arduino IDE
  BTSerial.begin(9600);   // HC-05 по умолчанию 9600
  Wire.begin();

  loadSettings();

  mpuOk = mpuInit();
  if (!mpuOk) {
    Serial.println(F("MPU6050 не отвечает на 0x68 — проверьте проводку"));
    BTSerial.println(F("{\"t\":\"error\",\"msg\":\"mpu_not_found\"}"));
  }

  Serial.println(F("StraightUp: калибровка при включении, примите ровную позу..."));
  calibrate();
}

void loop() {
  pollBluetoothCommands();

  bool ok;
  float pitch = readPitch(ok);
  if (ok) mpuOk = true;

  if (ok) {
    float deviation = abs(pitch - baseline);
    if (deviation > thresholdDeg) {
      if (!isDeviating) {
        isDeviating = true;
        deviationStart = millis();
      } else if (millis() - deviationStart > holdTimeMs) {
        alertActive = true;
      }
    } else {
      isDeviating = false;
      alertActive = false;
    }
  }

  digitalWrite(BUZZER_PIN, alertActive ? HIGH : LOW);

  unsigned long now = millis();
  if (now - lastSendMs >= SEND_INTERVAL_MS) {
    lastSendMs = now;

    if (!ok) {
      BTSerial.println(F("{\"t\":\"error\",\"msg\":\"mpu_read_fail\"}"));
    } else {
      char pitchBuf[8], baseBuf[8], devBuf[8];
      dtostrf(pitch, 4, 1, pitchBuf);
      dtostrf(baseline, 4, 1, baseBuf);
      dtostrf(abs(pitch - baseline), 4, 1, devBuf);

      BTSerial.print(F("{\"t\":\"data\",\"pitch\":"));
      BTSerial.print(pitchBuf);
      BTSerial.print(F(",\"base\":"));
      BTSerial.print(baseBuf);
      BTSerial.print(F(",\"dev\":"));
      BTSerial.print(devBuf);
      BTSerial.print(F(",\"alert\":"));
      BTSerial.print(alertActive ? 1 : 0);
      BTSerial.print(F(",\"batt\":"));
      BTSerial.print(readBatteryPercent());
      BTSerial.print(F(",\"ms\":"));
      BTSerial.print(now);
      BTSerial.println(F("}"));
    }
  }

  delay(10);
}
