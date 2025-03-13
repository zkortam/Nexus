#include <L298NX2.h>
#define PRINTALLDATA 1
#define NOMINALSPEED 120
#define NUM_CALIBRATION_SAMPLES 100
#define MOVING_AVG_SIZE 5
#define USE_DIFFERENTIAL_SENSING 0
L298NX2 DriveMotors(2, 3, 4, 7, 5, 6);
enum side { LEFT, RIGHT };
int LDR_Pin[] = {A8, A9, A10, A11, A12, A13, A14};
const int S_pin = A0;
const int P_pin = A1;
const int I_pin = A2;
const int D_pin = A3;
int led_Pins[] = {13, 41, 43, 45, 47, 49, 51, 53};
int SpRead = 0, kPRead = 0, kIRead = 0, kDRead = 0;
float Mn[20];
float Mx[20];
int LDR[20];
int totalPhotoResistors = sizeof(LDR_Pin) / sizeof(LDR_Pin[0]);
int numLEDs = sizeof(led_Pins) / sizeof(led_Pins[0]);
int movingAvgBuffer[20][MOVING_AVG_SIZE] = {0};
int movingAvgIndex[20] = {0};
float kalman_estimate[20];
float kalman_error_estimate[20];
int M1SpeedtoMotor, M2SpeedtoMotor;
int M1P = 0, M2P = 0;
float error = 0, lasterror = 0, sumerror = 0;
float kP, kI, kD;
void Calibrate();
void CalibrateHelper(int numberOfMeasurements, boolean ifCalibratingBlack);
void ReadPotentiometers();
int ReadPotentiometerHelper(int pin, int min_resolution, int max_resolution, int min_pot, int max_pot);
void ReadPhotoResistors();
void CalcError();
void PID_Turn();
void RunMotors();
void runMotorAtSpeed(side _side, int speed);
void Print();
void setLeds(int x);
int getMedian(int arr[], int n);
int getMedian(int arr[], int n) {
  int temp;
  int sorted[NUM_CALIBRATION_SAMPLES];
  for (int i = 0; i < n; i++){
    sorted[i] = arr[i];
  }
  for (int i = 0; i < n - 1; i++){
    for (int j = i + 1; j < n; j++){
      if (sorted[j] < sorted[i]){
        temp = sorted[i];
        sorted[i] = sorted[j];
        sorted[j] = temp;
      }
    }
  }
  if(n % 2 == 1)
    return sorted[n/2];
  else
    return (sorted[(n-1)/2] + sorted[n/2]) / 2;
}
void setLeds(int x) {
  for (int i = 0; i < numLEDs; i++){
    digitalWrite(led_Pins[i], x);
  }
}
void ReadPotentiometers() {
  SpRead = ReadPotentiometerHelper(S_pin, 0, 1023, 0, 100);
  kPRead = ReadPotentiometerHelper(P_pin, 0, 1023, 0, 100);
  kIRead = ReadPotentiometerHelper(I_pin, 0, 1023, 0, 100);
  kDRead = ReadPotentiometerHelper(D_pin, 0, 1023, 0, 100);
}
int ReadPotentiometerHelper(int pin, int min_res, int max_res, int min_pot, int max_pot) {
  return map(analogRead(pin), min_res, max_res, min_pot, max_pot);
}
void ReadPhotoResistors() {
#if USE_DIFFERENTIAL_SENSING
  int ambient[20], reflected[20];
  for (int i = 0; i < totalPhotoResistors; i++){
    ambient[i] = analogRead(LDR_Pin[i]);
  }
  setLeds(1);
  for (int i = 0; i < totalPhotoResistors; i++){
    reflected[i] = analogRead(LDR_Pin[i]);
  }
  setLeds(0);
  for (int i = 0; i < totalPhotoResistors; i++){
    int diff = reflected[i] - ambient[i];
    movingAvgBuffer[i][movingAvgIndex[i]] = diff;
    movingAvgIndex[i] = (movingAvgIndex[i] + 1) % MOVING_AVG_SIZE;
    int sum = 0;
    for (int j = 0; j < MOVING_AVG_SIZE; j++){
      sum += movingAvgBuffer[i][j];
    }
    int avgVal = sum / MOVING_AVG_SIZE;
    float Q = 0.022;
    float R = 0.617;
    float kalman_gain = kalman_error_estimate[i] / (kalman_error_estimate[i] + R);
    kalman_estimate[i] = kalman_estimate[i] + kalman_gain * (avgVal - kalman_estimate[i]);
    kalman_error_estimate[i] = (1 - kalman_gain) * kalman_error_estimate[i] + fabs(avgVal - kalman_estimate[i]) * 0.001;
    if(kalman_estimate[i] < Mn[i]) { Mn[i] = 0.99 * Mn[i] + 0.01 * kalman_estimate[i]; }
    if(kalman_estimate[i] > Mx[i]) { Mx[i] = 0.99 * Mx[i] + 0.01 * kalman_estimate[i]; }
    LDR[i] = map((int)kalman_estimate[i], Mn[i], Mx[i], 0, 100);
  }
#else
  for (int i = 0; i < totalPhotoResistors; i++){
    int currentReading = analogRead(LDR_Pin[i]);
    movingAvgBuffer[i][movingAvgIndex[i]] = currentReading;
    movingAvgIndex[i] = (movingAvgIndex[i] + 1) % MOVING_AVG_SIZE;
    int sum = 0;
    for (int j = 0; j < MOVING_AVG_SIZE; j++){
      sum += movingAvgBuffer[i][j];
    }
    int avgVal = sum / MOVING_AVG_SIZE;
    float Q = 0.022;
    float R = 0.617;
    float kalman_gain = kalman_error_estimate[i] / (kalman_error_estimate[i] + R);
    kalman_estimate[i] = kalman_estimate[i] + kalman_gain * (avgVal - kalman_estimate[i]);
    kalman_error_estimate[i] = (1 - kalman_gain) * kalman_error_estimate[i] + fabs(avgVal - kalman_estimate[i]) * 0.001;
    if(kalman_estimate[i] < Mn[i]) { Mn[i] = 0.99 * Mn[i] + 0.01 * kalman_estimate[i]; }
    if(kalman_estimate[i] > Mx[i]) { Mx[i] = 0.99 * Mx[i] + 0.01 * kalman_estimate[i]; }
    LDR[i] = map((int)kalman_estimate[i], Mn[i], Mx[i], 0, 100);
  }
#endif
}
void CalcError() {
  float sumWeighted = 0;
  float sumVal = 0;
  for (int i = 0; i < totalPhotoResistors; i++){
    float pos = i - ((totalPhotoResistors - 1) / 2.0);
    sumWeighted += LDR[i] * pos;
    sumVal += LDR[i];
  }
  if(sumVal > 0) error = sumWeighted / sumVal;
  else error = 0;
}
void PID_Turn() {
  float adaptiveMultiplier = 1.0 + (fabs(error) / (((totalPhotoResistors - 1) / 2.0))) * 0.5;
  float effective_kP = ((float)kPRead * 1.0) * adaptiveMultiplier;
  float effective_kI = ((float)kIRead * 0.001);
  float effective_kD = ((float)kDRead * 0.01) * adaptiveMultiplier;
  float derivative = error - lasterror;
  float turnVal = error * effective_kP + sumerror * effective_kI + derivative * effective_kD;
  if(sumerror > 5) sumerror = 5;
  else if(sumerror < -5) sumerror = -5;
  if(error == 0) sumerror = 0;
  if(turnVal < 0) { M1P = -turnVal; M2P = turnVal; }
  else if(turnVal > 0) { M1P = -turnVal; M2P = turnVal; }
  else { M1P = 0; M2P = 0; }
  lasterror = error;
  sumerror += error;
}
void RunMotors() {
  M1SpeedtoMotor = min(NOMINALSPEED + SpRead + M1P, 255);
  M2SpeedtoMotor = min(NOMINALSPEED + SpRead + M2P, 255);
  runMotorAtSpeed(LEFT, M2SpeedtoMotor);
  runMotorAtSpeed(RIGHT, M1SpeedtoMotor);
}
void runMotorAtSpeed(side _side, int speed) {
  if(_side == LEFT) {
    DriveMotors.setSpeedA(abs(speed));
    if(speed > 0) DriveMotors.forwardA();
    else DriveMotors.backwardA();
  }
  else if(_side == RIGHT) {
    DriveMotors.setSpeedB(abs(speed));
    if(speed > 0) DriveMotors.forwardB();
    else DriveMotors.backwardB();
  }
}
void Print() {
  Serial.print("Sp:" + String(SpRead) + " P:" + String(kPRead) + " I:" + String(kIRead) + " D:" + String(kDRead) + " | Sensors:");
  for (int i = 0; i < totalPhotoResistors; i++){
    Serial.print(" " + String(LDR[i]));
  }
  Serial.print(" | Error:" + String(error));
  Serial.print(" | Motors: L:" + String(M1SpeedtoMotor) + " R:" + String(M2SpeedtoMotor));
  Serial.println();
  if(PRINTALLDATA) { delay(100); }
}
void Calibrate() {
  CalibrateHelper(NUM_CALIBRATION_SAMPLES, false);
  digitalWrite(led_Pins[0], HIGH);
  setLeds(0);
  delay(2000);
  CalibrateHelper(NUM_CALIBRATION_SAMPLES, true);
  Serial.print("White:");
  for (int i = 0; i < totalPhotoResistors; i++){
    Serial.print(" " + String(Mn[i]));
  }
  Serial.println();
  Serial.print("Black:");
  for (int i = 0; i < totalPhotoResistors; i++){
    Serial.print(" " + String(Mx[i]));
  }
  Serial.println();
  Serial.print("Delta:");
  for (int i = 0; i < totalPhotoResistors; i++){
    Serial.print(" " + String(Mx[i] - Mn[i]));
  }
  Serial.println();
  setLeds(1);
  delay(2000);
}
void CalibrateHelper(int numberOfMeasurements, boolean ifCalibratingBlack) {
  if(ifCalibratingBlack) Serial.println("\nCalibrating Black");
  else Serial.println("\nCalibrating White");
  for (int i = 0; i < 4; i++){
    setLeds(1);
    delay(250);
    setLeds(0);
    delay(250);
  }
  setLeds(1);
  delay(250);
  int readings[NUM_CALIBRATION_SAMPLES];
  for (int pin = 0; pin < totalPhotoResistors; pin++){
    for (int i = 0; i < numberOfMeasurements; i++){
      readings[i] = analogRead(LDR_Pin[pin]);
      delay(2);
      Serial.print(".");
    }
    int medianValue = getMedian(readings, numberOfMeasurements);
    if(ifCalibratingBlack) { Mx[pin] = medianValue; }
    else { Mn[pin] = medianValue; }
  }
  Serial.println(" Done!");
  setLeds(0);
  delay(250);
}
void setup() {
  Serial.begin(9600);
  for (int i = 0; i < numLEDs; i++){
    pinMode(led_Pins[i], OUTPUT);
  }
  Calibrate();
  ReadPotentiometers();
  for (int i = 0; i < totalPhotoResistors; i++){
    kalman_estimate[i] = (Mn[i] + Mx[i]) / 2;
    kalman_error_estimate[i] = 1.0;
  }
}
void loop() {
  digitalWrite(led_Pins[0], LOW);
  ReadPotentiometers();
  ReadPhotoResistors();
  CalcError();
  PID_Turn();
  RunMotors();
  if(PRINTALLDATA) Print();
}
