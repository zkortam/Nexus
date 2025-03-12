int LDR_Pin[] = {A8, A9, A10, A11, A12, A13, A14};  // Pins connected to photoresistors
const int totalPhotoResistors = sizeof(LDR_Pin) / sizeof(LDR_Pin[0]);

void setup() {
  Serial.begin(9600);  // Initialize serial communication at 9600 baud
}

void loop() {
  Serial.print("Photoresistor Readings: ");
  for (int i = 0; i < totalPhotoResistors; i++) {
    int reading = analogRead(LDR_Pin[i]);  // Read the analog value from each photoresistor
    Serial.print("LDR");
    Serial.print(i);
    Serial.print(": ");
    Serial.print(reading);
    Serial.print("  ");
  }
  Serial.println();  // Newline for the next set of readings
  delay(200);        // Small delay for readability
}
