#include <L298NX2.h>

// -----------------------
// Configuration Constants
// -----------------------
#define PRINTALLDATA 0            // Disable serial printing for maximum loop speed
#define NOMINALSPEED 220          // Increase base speed for maximum physical motion
#define NUM_CALIBRATION_SAMPLES 100
#define MOVING_AVG_SIZE 5         // Moving average window size
#define USE_DIFFERENTIAL_SENSING 0  // Use simple (non-differential) sensor reading for speed

// -----------------------
// Motor Driver Setup
// -----------------------
L298NX2 DriveMotors(2, 3, 4, 7, 5, 6);
enum side { LEFT, RIGHT };

// -----------------------
// Sensor & Potentiometer Pins
// -----------------------
int LDR_Pin[] = {A8, A9, A10, A11, A12, A13, A14};  // 7 photoresistors (left-to-right)
const int S_pin = A0;   // Speed offset potentiometer
const int P_pin = A1;   // PID proportional gain potentiometer
const int I_pin = A2;   // PID integral gain potentiometer
const int D_pin = A3;   // PID derivative gain potentiometer

// -----------------------
// LED (for sensor illumination/calibration)
// -----------------------
int led_Pins[] = {13, 41, 43, 45, 47, 49, 51, 53};

// -----------------------
// Global Variables
// -----------------------
int SpRead = 0, kPRead = 0, kIRead = 0, kDRead = 0;
float Mn[20];        // Calibrated white (baseline) values
float Mx[20];        // Calibrated black (line) values
int LDR[20];         // Mapped sensor values (0 to 100)
int totalPhotoResistors = sizeof(LDR_Pin) / sizeof(LDR_Pin[0]);
int numLEDs = sizeof(led_Pins) / sizeof(led_Pins[0]);

// For moving average filter
int movingAvgBuffer[20][MOVING_AVG_SIZE] = {0};
int movingAvgIndex[20] = {0};
int runningAvgSum[20] = {0};  // Running sum for each sensor

// Kalman filter estimates for each sensor
float kalman_estimate[20];
float kalman_error_estimate[20];

// PID control variables
int M1SpeedtoMotor, M2SpeedtoMotor;
int M1P = 0, M2P = 0;
float error = 0, lasterror = 0, sumerror = 0;

// -----------------------
// Sensor Weights for Error Calculation
// (Extra emphasis is given to the center three sensors to “lock in” on the line)
// For 7 sensors (indices 0–6), assign higher weights to indices 2,3,4.
float sensorWeights[] = {1.0, 1.5, 2.5, 3.0, 2.5, 1.5, 1.0};

// -----------------------
// Function Prototypes
// -----------------------
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

// -----------------------
// Utility: Median Calculation
// -----------------------
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

// -----------------------
// LED Control
// -----------------------
void setLeds(int x) {
  for (int i = 0; i < numLEDs; i++){
    digitalWrite(led_Pins[i], x);
  }
}

// -----------------------
// Read Potentiometers (for speed and PID gains)
// -----------------------
void ReadPotentiometers() {
  SpRead = ReadPotentiometerHelper(S_pin, 0, 1023, 0, 35);
  kPRead = ReadPotentiometerHelper(P_pin, 0, 1023, 0, 100);
  kIRead = ReadPotentiometerHelper(I_pin, 0, 1023, 0, 100);
  kDRead = ReadPotentiometerHelper(D_pin, 0, 1023, 0, 100);
}

int ReadPotentiometerHelper(int pin, int min_res, int max_res, int min_pot, int max_pot) {
  return map(analogRead(pin), min_res, max_res, min_pot, max_pot);
}

// -----------------------
// Read and Filter Photoresistor Values
// -----------------------
void ReadPhotoResistors() {
#if USE_DIFFERENTIAL_SENSING
  // (Differential sensing code omitted for speed; use non-differential branch)
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
    // For simplicity, using direct difference as reading:
    int avgVal = diff;
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
  // Non-differential sensing: optimized running-sum moving average + Kalman filter
  for (int i = 0; i < totalPhotoResistors; i++){
    int currentReading = analogRead(LDR_Pin[i]);
    // Update running average: subtract oldest sample and add the new reading
    runningAvgSum[i] = runningAvgSum[i] - movingAvgBuffer[i][movingAvgIndex[i]] + currentReading;
    movingAvgBuffer[i][movingAvgIndex[i]] = currentReading;
    int avgVal = runningAvgSum[i] / MOVING_AVG_SIZE;
    
    // Apply Kalman filtering to the moving average value
    float Q = 0.022;
    float R = 0.617;
    float kalman_gain = kalman_error_estimate[i] / (kalman_error_estimate[i] + R);
    kalman_estimate[i] = kalman_estimate[i] + kalman_gain * (avgVal - kalman_estimate[i]);
    kalman_error_estimate[i] = (1 - kalman_gain) * kalman_error_estimate[i] + fabs(avgVal - kalman_estimate[i]) * 0.001;
    
    // Dynamically adjust calibration bounds based on running values
    if(kalman_estimate[i] < Mn[i]) { Mn[i] = 0.99 * Mn[i] + 0.01 * kalman_estimate[i]; }
    if(kalman_estimate[i] > Mx[i]) { Mx[i] = 0.99 * Mx[i] + 0.01 * kalman_estimate[i]; }
    
    LDR[i] = map((int)kalman_estimate[i], Mn[i], Mx[i], 0, 100);
    
    // Move to next index in the circular buffer
    movingAvgIndex[i] = (movingAvgIndex[i] + 1) % MOVING_AVG_SIZE;
  }
#endif
}

// -----------------------
// Compute the Error Signal with Weighted Sensor Values
// (Extra weight is given to the center sensors so the line is locked on)
// -----------------------
void CalcError() {
  float sumWeighted = 0;
  float sumVal = 0;
  for (int i = 0; i < totalPhotoResistors; i++){
    float pos = i - ((totalPhotoResistors - 1) / 2.0);  // positions: -3, -2, -1, 0, 1, 2, 3
    sumWeighted += sensorWeights[i] * LDR[i] * pos;
    sumVal += sensorWeights[i] * LDR[i];
  }
  if(sumVal > 0)
    error = sumWeighted / sumVal;
  else
    error = 0;
}

// -----------------------
// PID Controller: Compute Correction and Enforce Aggressive Lock-On
// -----------------------
void PID_Turn() {
  // Base PID gains from potentiometer readings, scaled for an aggressive response
  float adaptiveMultiplier = 1.0 + (fabs(error) / (((totalPhotoResistors - 1) / 2.0))) * 0.5;
  float effective_kP = ((float)kPRead * 1.5) * adaptiveMultiplier;
  float effective_kI = ((float)kIRead * 0.001);
  float effective_kD = ((float)kDRead * 0.01) * adaptiveMultiplier;
  
  float derivative = error - lasterror;
  float turnVal = error * effective_kP + sumerror * effective_kI + derivative * effective_kD;
  
  // Clamp the integral term to avoid windup
  if(sumerror > 10) sumerror = 10;
  else if(sumerror < -10) sumerror = -10;
  if(error == 0) sumerror = 0;
  
  // If the center sensor (index 3) isn’t dark enough, force a stronger correction
  if(LDR[3] < 70) {  // Threshold (adjust based on your calibration)
    turnVal *= 1.75;
  }
  
  // Set motor correction values (differential drive correction)
  M1P = -turnVal;
  M2P = turnVal;
  
  lasterror = error;
  sumerror += error;
}

// -----------------------
// Calculate and Dispatch Motor Speeds
// -----------------------
void RunMotors() {
  // Combine nominal speed, potentiometer speed offset, and PID corrections
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

// -----------------------
// (Optional) Debug Print
// -----------------------
void Print() {
  Serial.print("Sp:" + String(SpRead) + " P:" + String(kPRead) + " I:" + String(kIRead) + " D:" + String(kDRead) + " | Sensors:");
  for (int i = 0; i < totalPhotoResistors; i++){
    Serial.print(" " + String(LDR[i]));
  }
  Serial.print(" | Error:" + String(error));
  Serial.print(" | Motors: L:" + String(M1SpeedtoMotor) + " R:" + String(M2SpeedtoMotor));
  Serial.println();
}

// -----------------------
// Calibration Routine
// (This routine runs as long as necessary to ensure the best sensor baseline)
// -----------------------
void Calibrate() {
  CalibrateHelper(NUM_CALIBRATION_SAMPLES, false);
  // Flash LEDs between calibration phases
  for (int i = 0; i < 4; i++){
    setLeds(1);
    delay(250);
    setLeds(0);
    delay(250);
  }
  delay(500);
  CalibrateHelper(NUM_CALIBRATION_SAMPLES, true);
  Serial.print("White Calibration:");
  for (int i = 0; i < totalPhotoResistors; i++){
    Serial.print(" " + String(Mn[i]));
  }
  Serial.println();
  Serial.print("Black Calibration:");
  for (int i = 0; i < totalPhotoResistors; i++){
    Serial.print(" " + String(Mx[i]));
  }
  Serial.println();
  Serial.print("Delta:");
  for (int i = 0; i < totalPhotoResistors; i++){
    Serial.print(" " + String(Mx[i] - Mn[i]));
  }
  Serial.println();
  
  // Turn on LEDs to indicate end of calibration
  setLeds(1);
  delay(500);
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

// -----------------------
// Setup and Main Loop
// -----------------------
void setup() {
  Serial.begin(9600);
  // Initialize LED pins
  for (int i = 0; i < numLEDs; i++){
    pinMode(led_Pins[i], OUTPUT);
  }
  
  // Run full calibration routine
  Calibrate();
  
  // Initialize potentiometers
  ReadPotentiometers();
  
  // Initialize Kalman filter and moving average buffers
  for (int i = 0; i < totalPhotoResistors; i++){
    kalman_estimate[i] = (Mn[i] + Mx[i]) / 2.0;
    kalman_error_estimate[i] = 1.0;
    for (int j = 0; j < MOVING_AVG_SIZE; j++){
      movingAvgBuffer[i][j] = (Mn[i] + Mx[i]) / 2;
      runningAvgSum[i] += movingAvgBuffer[i][j];
    }
  }
}

void loop() {
  // Main control loop runs as fast as possible—no delays here.
  ReadPotentiometers();
  ReadPhotoResistors();
  CalcError();
  PID_Turn();
  RunMotors();
  
  if(PRINTALLDATA) {
    Print();
  }
}
