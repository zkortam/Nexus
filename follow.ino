/* ************************************************************************************************* */
// UCSD ECE 5 Lab 4 Code: Line Following Robot with PID 
// V 4.0
// Last Modified 9/06/2023 by MingWei Yeoh and Karcher Morris
/* ************************************************************************************************* */

/*
   This is code for your PID controlled line following robot.

   ******      Code Table of Contents      ******

  - Line_Follower_Code_Basic
   > Declare libraries     - declares global variables so each variable can be accessed from every function
   > Declare Pins          - where the user sets what pin everything is connected to 
   > Settings              - settings that can improve robot functionality and help to debug
   > Setup (Main)          - runs once at beginning when you press button on arduino or when you open serial monitor
   > Loop  (Main)          - loops forever calling on a series of function
   
  - Calibration 
   > Main Calibrate()      - runs calibration function calls and synchronizes calibration state with different led animations
  
  - Helper_Functions
   > setLEDs               - turns on all LEDs in the LED_Pin array on or off
   > Read Potentiometers   - reads each potentiometer
   > Read Photoresistors   - reads each photoresistor
   > Run Motors            - runs motors
   > Calculate Error       - calculate error from photoresistor readings
   > PID Turn              - takes the error and implements PID control
   > Print                 - used for printing information but should disable when not debugging because it slows down program

*/

// Include files needed
#include <L298NX2.h> // Using "L298N" library found through arduino library manager developed by Andrea Lombardo (https://github.com/AndreaLombardo/L298N)

// ************************************************************************************************* //
// ************************************************************************************************* //
// Change Robot Settings here

#define PRINTALLDATA        1  // Turn to 1  to prints ALL the data when changed to 1, Could be useful for debugging =)
                                // !! Turn to 0 when running robot untethered
#define NOMINALSPEED        30 // This is the base speed for both motors, can also be increased by using potentiometers

// ************************************************************************************************* //

// ****** DECLARE PINS HERE  ****** 

// Taken from LEFT TO RIGHT of the robot ****** Orient yourself so that you are looking from the rear of the robot (photoresistors are farthest away from you, wheels are closest to you)
//                  Left Motors   Right motors 
L298NX2 DriveMotors(  2, 3, 4,      7, 5, 6);
//                 ENA, IN1, IN2, ENB, IN3, IN4

enum side {LEFT, RIGHT};

int LDR_Pin[] = {A8, A9, A10, A11, A12, A13, A14}; // SET PINS CONNECTED TO PHOTORESISTORS // FROM LEFT TO RIGHT OF THE ROBOT, ROBOT IS ORIENTED WHERE PHOTORESISOTRS FARTHEST FROM YOU AND WHEELS ARE CLOSEST TO YOU      

// Potentiometer Pins
const int S_pin = A0; // Pin connected to Speed potentiometer
const int P_pin = A1; // Pin connected to P term potentiometer
const int I_pin = A2; // Pin connected to I term potentiometer
const int D_pin = A3; // Pin connected to D term potentiometer
                                                                 
int led_Pins[] = {13,41,43,45,47,49,51,53};  // LEDs to indicate what part of calibration you're on and to illuminate the photoresistors

// ****** DECLARE Variables HERE  ****** 

//Variables Potentiometer Reading
int SpRead = 0; // speed increase
int kPRead = 0; // proportional gain
int kIRead = 0; // integral gain
int kDRead = 0; // derivative gain

// Variables for Calibration and Error Calculation
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
  
  if (ifCalibratingBlack)
    Serial.println("\nCalibrating Black");
  else
    Serial.println("\nCalibrating White");
// Indicate that calibration is starting
  for (int i = 0; i < 4; i++) {
      setLeds(1); // turn the LEDs on
      delay(250); // wait
      setLeds(0); // turn the LEDs off
      delay(250); // wait 
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

// Set all LEDs to a certain brightness
void setLeds(int x) {
  for (int i = 0; i < numLEDs; i++)
    digitalWrite(led_Pins[i], x);
}

// **********Recall your Challenge #1 Code********************************************************************** //
// function to read and map values from potentiometers
void ReadPotentiometers() {
  // Call on user-defined function to read Potentiometer values
  SpRead = ReadPotentiometerHelper(S_pin, 0, 1023, 0, 100); // We want to read a potentiometer for S_pin with resolution from 0 to 1023 and potentiometer range from 0 to 100.
  kPRead = ReadPotentiometerHelper(P_pin, 0, 1023, 0, 100); // We want to read a potentiometer for P_pin with resolution from 0 to 1023 and potentiometer range from 0 to 100.
  kIRead = ReadPotentiometerHelper(I_pin, 0, 1023, 0, 100); // We want to read a potentiometer for I_pin with resolution from 0 to 1023 and potentiometer range from 0 to 100.
  kDRead = ReadPotentiometerHelper(D_pin, 0, 1023, 0, 100); // We want to read a potentiometer for D_pin with resolution from 0 to 1023 and potentiometer range from 0 to 100.

} // end ReadPotentiometers()

int ReadPotentiometerHelper(int pin, int min_resolution, int max_resolution, int min_potentiometer, int max_potentiometer) {
  return map(analogRead(pin), min_resolution, max_resolution, min_potentiometer, max_potentiometer); 
}

// **********Recall your Challenge #2 Code********************************************************************** //
// Function to read photo resistors and map from 0 to 100
void ReadPhotoResistors() {
  for (int i = 0; i < totalPhotoResistors; i++) { 
    rawPResistorData[i] = analogRead(LDR_Pin[i]);
    LDR[i] = map(rawPResistorData[i], Mn[i], Mx[i], 0, 100); // Mn and Mx are created from calibration Min and Max for each pin
  }    

} // end ReadPhotoResistors()


// **********Recall your Challenge #3 Code********************************************************************** //
// function to start motors using nominal speed + speed addition from potentiometer
void RunMotors() {
  M1SpeedtoMotor = min(NOMINALSPEED + SpRead + M1P, 255); // limits speed to 255
  M2SpeedtoMotor = min(NOMINALSPEED + SpRead + M2P, 255); // remember M1Sp & M2Sp is defined at beginning of code (default 60)
  
  runMotorAtSpeed(LEFT, M2SpeedtoMotor); // run right motor 
  runMotorAtSpeed(RIGHT, M1SpeedtoMotor); // run left motor
} // end RunMotors()

// A function that commands a specified motor to move towards a given direction at a given speed
void runMotorAtSpeed(side _side, int speed) {
  if (_side == LEFT) {
    DriveMotors.setSpeedA(abs(speed));
    if (speed > 0)                // swap direction if speed is negative
      DriveMotors.forwardA();           // sets the direction of the motor from arguments
    else
      DriveMotors.backwardA();          // sets the direction of the motor from arguments
  }
  if (_side == RIGHT) {
    DriveMotors.setSpeedB(abs(speed));
    if (speed > 0)                // swap direction if speed is negative
      DriveMotors.forwardB();           // sets the direction of the motor from arguments
    else
      DriveMotors.backwardB();          // sets the direction of the motor from arguments
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
