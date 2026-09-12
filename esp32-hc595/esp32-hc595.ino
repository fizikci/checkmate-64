#include <Arduino.h>

// Classic ESP32 DevKit / ESP32-WROOM. Adapt for other ESP32 variants.
constexpr uint8_t DATA_PIN = 23;   // 74HC595 pin 14 (SER / DS)
constexpr uint8_t CLOCK_PIN = 18;  // 74HC595 pin 11 (SRCLK / SH_CP)
constexpr uint8_t LATCH_PIN = 19;  // 74HC595 pin 12 (RCLK / ST_CP)

char command[9];
uint8_t commandLength = 0;
bool overflow = false;
bool demo = false;
uint8_t demoBit = 0;
unsigned long lastStep = 0;

void writeLeds(uint8_t value) {
  digitalWrite(LATCH_PIN, LOW);
  // Send bit 7 first, so bit 0 ends up at QA and bit 7 at QH.
  for (int bit = 7; bit >= 0; --bit) {
    digitalWrite(CLOCK_PIN, LOW);
    digitalWrite(DATA_PIN, (value >> bit) & 1U);
    delayMicroseconds(1);
    digitalWrite(CLOCK_PIN, HIGH);  // Rising edge shifts one bit in.
    delayMicroseconds(1);
  }
  digitalWrite(CLOCK_PIN, LOW);
  digitalWrite(LATCH_PIN, HIGH);    // All eight outputs update together.
  delayMicroseconds(1);
  digitalWrite(LATCH_PIN, LOW);

  Serial.print("QH..QA: ");
  for (int bit = 7; bit >= 0; --bit) Serial.print((value >> bit) & 1U);
  Serial.print("  decimal: ");
  Serial.println(value);
}

void handleCommand() {
  command[commandLength] = '\0';
  if (!overflow && strcmp(command, "demo") == 0) {
    demo = true;
    demoBit = 0;
    lastStep = millis();
    writeLeds(1);
    return;
  }
  if (!overflow && strcmp(command, "off") == 0) {
    demo = false;
    writeLeds(0);
    return;
  }
  bool valid = !overflow && commandLength == 8;
  uint8_t value = 0;
  for (uint8_t i = 0; i < commandLength; ++i) {
    if (command[i] != '0' && command[i] != '1') valid = false;
    value = (value << 1) | (command[i] == '1');
  }
  if (!valid) {
    Serial.println("Enter exactly 8 binary digits (e.g. 10101010), demo, or off.");
    return;
  }
  demo = false;
  writeLeds(value);
}

void setup() {
  Serial.begin(115200);
  pinMode(DATA_PIN, OUTPUT);
  pinMode(CLOCK_PIN, OUTPUT);
  pinMode(LATCH_PIN, OUTPUT);
  digitalWrite(DATA_PIN, LOW);
  digitalWrite(CLOCK_PIN, LOW);
  digitalWrite(LATCH_PIN, LOW);
  writeLeds(0);
  Serial.println("Send 8 binary digits, demo, or off. Enable a line ending.");
}

void loop() {
  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\r' || c == '\n') {
      if (commandLength > 0 || overflow) handleCommand();
      commandLength = 0;
      overflow = false;
    } else if (commandLength < sizeof(command) - 1) {
      command[commandLength++] = c;
    } else {
      overflow = true;
    }
  }
  if (demo && millis() - lastStep >= 500) {
    lastStep = millis();
    demoBit = (demoBit + 1) % 8;
    writeLeds(static_cast<uint8_t>(1U << demoBit));
  }
}
