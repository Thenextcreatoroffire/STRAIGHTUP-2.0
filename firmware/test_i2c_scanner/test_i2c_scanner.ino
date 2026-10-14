/*
  StraightUp — тест №1: проверка одного MPU6050 напрямую на A4/A5
  (без TCA9548A — мультиплексор не нужен, т.к. датчик всего один)

  Подключение:
    MPU6050 VCC -> Arduino 5V
    MPU6050 GND -> Arduino GND
    MPU6050 SDA -> Arduino A4
    MPU6050 SCL -> Arduino A5

  Залейте этот скетч первым. В Serial Monitor (9600 бод) должно появиться:
    found 0x68
  Если ничего не найдено — проверьте пайку AD0 и провода SDA/SCL/VCC/GND.
*/

#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(9600);
  delay(500);
  Serial.println(F("StraightUp I2C scanner — one MPU6050"));
}

void loop() {
  Serial.println(F("Scanning..."));
  byte found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte err = Wire.endTransmission();
    if (err == 0) {
      Serial.print(F("found 0x"));
      Serial.println(addr, HEX);
      found++;
    }
  }
  if (found == 0) {
    Serial.println(F("Ничего не найдено — проверьте проводку."));
  }
  if (found > 0) {
    Serial.println(F("Ожидалось: found 0x68 (адрес MPU6050 по умолчанию)."));
  }
  delay(2000);
}
