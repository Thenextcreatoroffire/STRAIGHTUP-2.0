/* StraightUp v2: Nano + TCA9548A + 3x MPU6050 + HC-06 + buzzer
   A4 SDA, A5 SCL; TCA channels 0,1,2; HC-06 TX -> D10,
   Arduino D11 -> level divider -> HC-06 RX; buzzer D6 -> GND.
   Serial Monitor 9600; Bluetooth UART 9600.
   Acceleration tilt: good while still; NOT clinical spine measurement.
*/
#include <Wire.h>
#include <SoftwareSerial.h>
#include <math.h>
const byte TCA=0x70, MPU=0x68;
const byte BUZZER=6;
SoftwareSerial BT(10,11); // Nano RX,TX
const unsigned long CAL_MS=7000UL, SEND_MS=1000UL;
float thresholdDeg=15.0f;
unsigned long holdMs=20000UL;
struct Sensor {float pitch,roll,refPitch,refRoll,dev,sumPitch,sumRoll; unsigned int n; bool valid;};
Sensor sensor[3];
bool calibrated=false, alerting=false, timerRunning=false;
unsigned long calibrationStarted=0, deviationStarted=0, lastSent=0, lastBeep=0, manualBeepUntil=0;
char command[40]; byte commandLength=0;
bool selectChannel(byte channel) {
  Wire.beginTransmission(TCA);
  Wire.write((byte)(1U<<channel));
  return Wire.endTransmission()==0;
}
bool initSensor(byte ch) {
  if (!selectChannel(ch)) return false;
  Wire.beginTransmission(MPU); Wire.write((byte)0x6B); Wire.write((byte)0);
  return Wire.endTransmission()==0;
}
bool readSensor(byte ch, float &pitch, float &roll) {
  if (!selectChannel(ch)) return false;
  Wire.beginTransmission(MPU); Wire.write((byte)0x3B);
  if (Wire.endTransmission(false)!=0) return false;
  if (Wire.requestFrom((uint8_t)MPU,(uint8_t)6,(uint8_t)true)!=6) return false;
  int16_t ax=(int16_t)((Wire.read()<<8)|Wire.read());
  int16_t ay=(int16_t)((Wire.read()<<8)|Wire.read());
  int16_t az=(int16_t)((Wire.read()<<8)|Wire.read());
  float norm=sqrt((float)ax*ax+(float)ay*ay+(float)az*az);
  if (norm<1000 || norm>32000) return false;
  pitch=atan2(-(float)ax,sqrt((float)ay*ay+(float)az*az))*180.0f/PI;
  roll=atan2((float)ay,(float)az)*180.0f/PI;
  return true;
}
void beginCalibration() {
  calibrated=false; alerting=false; timerRunning=false;
  digitalWrite(BUZZER,LOW); calibrationStarted=millis();
  for(byte i=0;i<3;i++) {
    sensor[i].n=0; sensor[i].sumPitch=0; sensor[i].sumRoll=0;
    sensor[i].dev=0; sensor[i].valid=false;
  }
}
float angularDifference(float a,float b) {
  float d=a-b;
  while(d>180) d-=360;
  while(d< -180) d+=360;
  return d;
}
void processCommand(const char *cmd) {
  if(strcmp(cmd,"CAL")==0) beginCalibration();
  else if(strcmp(cmd,"BEEP")==0) {tone(BUZZER,2200,150);manualBeepUntil=millis()+160UL;}
  else if(strncmp(cmd,"SET_THRESH:",11)==0) {
    float v=atof(cmd+11); if(v>=2 && v<=60) thresholdDeg=v;
  } else if(strncmp(cmd,"SET_HOLD:",9)==0) {
    unsigned long v=atol(cmd+9); if(v>=1000 && v<=60000) holdMs=v;
  } else if(strcmp(cmd,"PING")==0) BT.println(F("{\"t\":\"info\",\"msg\":\"pong\"}"));
}
void pollCommands() {
  while(BT.available()) {
    char c=BT.read();
    if(c=='\n'||c=='\r') {
      if(commandLength) {command[commandLength]=0;processCommand(command);commandLength=0;}
    } else if(commandLength<sizeof(command)-1) command[commandLength++]=c;
    else commandLength=0;
  }
}
void writeReport(Print &out,const char *status,unsigned long badForSec) {
  out.print(F("{\"type\":\"posture\",\"status\":\""));out.print(status);
  out.print(F("\",\"alert\":"));out.print(alerting?F("true"):F("false"));
  out.print(F(",\"calibrated\":"));out.print(calibrated?F("true"):F("false"));
  out.print(F(",\"badForSec\":"));out.print(badForSec);
  out.print(F(",\"sensors\":["));
  for(byte i=0;i<3;i++) {
    if(i)out.print(',');
    out.print(F("{\"id\":"));out.print(i+1);
    out.print(F(",\"valid\":"));out.print(sensor[i].valid?F("true"):F("false"));
    out.print(F(",\"pitch\":"));out.print(sensor[i].pitch,1);
    out.print(F(",\"roll\":"));out.print(sensor[i].roll,1);
    out.print(F(",\"deviation\":"));out.print(sensor[i].dev,1);out.print('}');
  }
  out.println(F("]}"));
}
void setup() {
  pinMode(BUZZER,OUTPUT);digitalWrite(BUZZER,LOW);
  Serial.begin(9600);BT.begin(9600);Wire.begin();
  for(byte i=0;i<3;i++)initSensor(i);
  beginCalibration();
  Serial.println(F("StraightUp v2: calibration 7 sec"));
}
void loop() {
  pollCommands();
  unsigned long now=millis();
  bool allValid=true, anyBad=false;
  for(byte i=0;i<3;i++) {
    float p,r;
    sensor[i].valid=readSensor(i,p,r);
    if(!sensor[i].valid) {allValid=false;continue;}
    sensor[i].pitch=p;sensor[i].roll=r;
    if(!calibrated) {
      sensor[i].sumPitch+=p;sensor[i].sumRoll+=r;sensor[i].n++;
    } else {
      float dp=angularDifference(p,sensor[i].refPitch);
      float dr=angularDifference(r,sensor[i].refRoll);
      sensor[i].dev=sqrt(dp*dp+dr*dr);
      if(sensor[i].dev>thresholdDeg) anyBad=true;
    }
  }
  if(!calibrated && now-calibrationStarted>=CAL_MS) {
    bool sufficient=true;
    for(byte i=0;i<3;i++)if(sensor[i].n<10)sufficient=false;
    if(sufficient) {
      for(byte i=0;i<3;i++) {
        sensor[i].refPitch=sensor[i].sumPitch/sensor[i].n;
        sensor[i].refRoll=sensor[i].sumRoll/sensor[i].n;
        sensor[i].dev=0;
      }
      calibrated=true;timerRunning=false;alerting=false;
    } else beginCalibration(); // retry if missing sensor, never set invalid baseline
  }
  if(calibrated && allValid) {
    if(anyBad) {
      if(!timerRunning) {timerRunning=true;deviationStarted=now;}
      alerting=now-deviationStarted>=holdMs;
    } else {timerRunning=false;alerting=false;}
  } else {timerRunning=false;alerting=false;}
  if(alerting) {
    if(now-lastBeep>=1500) {tone(BUZZER,2100,140);lastBeep=now;}
  } else if(now >= manualBeepUntil) noTone(BUZZER);
  if(now-lastSent>=SEND_MS) {
    lastSent=now;
    unsigned long badFor=timerRunning?(now-deviationStarted)/1000UL:0;
    const char *status=!calibrated?"CALIBRATING":!allValid?"SENSOR_ERROR":alerting?"ALERT":anyBad?"DEVIATING":"OK";
    writeReport(Serial,status,badFor);
    writeReport(BT,status,badFor);
  }
  delay(20);
}
