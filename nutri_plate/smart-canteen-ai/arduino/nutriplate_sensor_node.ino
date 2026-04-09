// ============================================================
// NutriPlate — Smart Canteen AI: Arduino Sensor Node  v2.0
// ============================================================
//
// HARDWARE:
//   - Arduino UNO / Nano
//   - DHT11 on pin D2
//   - MQ4   (Methane / CH4)     on A2
//   - MQ3   (Alcohol / Ethanol) on A1
//   - MQ135  (NH3 / VOC)        on A0
//   - MQ136  (H2S)              on A3
//   - Green LED on D8
//   - Blue  LED on D7
//   - Red   LED on D9
//   - Passive Buzzer on D10
//   - 16x2 I2C LCD at 0x27
//
// BEHAVIOR:
//   Phase 1 — SETUP / WARMUP  (Blue LED solid, ~2 min)
//       Blue LED stays solid. LCD shows countdown timer.
//       All sensors heat up to operating temperature.
//       No data is sent to the backend during this phase.
//
//   Phase 2 — ACTIVE SENSING  (Green / Red / Buzzer)
//       Every 3 seconds, reads all sensors, sends JSON via Serial.
//       Backend responds with  RESULT:<freshness>:<status>
//       LEDs and buzzer respond to the AI classification:
//         Fresh   (>=70%) → Solid GREEN, no buzzer
//         Warning (40-69%) → RED+GREEN alternating blink, occasional beep
//         Spoiled  (<40%)  → Solid RED, alarm buzzer
//
// LCD DISPLAYS (rotates every 4 seconds after warmup):
//   Screen 1: Temperature + Humidity
//   Screen 2: CH4 (ppm) + Alcohol (mg/L)
//   Screen 3: NH3 (ppm) + H2S (ppm)
//   Screen 4: Freshness Score (%) + Status
//   Screen 5: All raw analog values
//
// SERIAL OUTPUT:
//   JSON: {"NH3":2.45,"H2S":0.78,"CH4":1520.3,"alcohol":0.15,"VOC":0.0,"H2":0.0,"temperature":29.5,"humidity":62.0}
//
// SERIAL INPUT (from backend via hardware_bridge.py):
//   RESULT:85:Fresh
//   RESULT:55:Warning
//   RESULT:22:Spoiled
// ============================================================

#include <DHT.h>
#include <LiquidCrystal_I2C.h>

// ──────────── PIN DEFINITIONS ────────────
#define DHTPIN      2
#define DHTTYPE     DHT11

#define MQ4_PIN     A2    // Methane (CH4)
#define MQ3_PIN     A1    // Alcohol / Ethanol
#define MQ135_PIN   A0    // NH3 / VOC / Air Quality
#define MQ136_PIN   A3    // H2S (Hydrogen Sulfide)

#define LED_GREEN   8
#define LED_BLUE    7
#define LED_RED     9

#define BUZZER_PIN  10

// ──────────── CONFIGURATION ────────────
#define WARMUP_MS       30000UL   // 30 seconds warmup (shortened for demo)
#define SERIAL_BAUD     9600
#define READ_INTERVAL   3000UL    // Send a reading every 3 seconds
#define LCD_ROTATE_MS   4000UL    // Rotate LCD screen every 4 seconds
#define BUZZER_FREQ     1200      // Buzzer tone frequency (Hz)
#define BLINK_INTERVAL  500UL     // Warning LED blink interval (ms)
#define ALARM_INTERVAL  300UL     // Spoiled alarm tone toggle interval (ms)
#define WARN_BEEP_MS    3000UL    // Warning beep every 3 seconds
#define LCD_SCREENS     5         // Total number of LCD display screens

// ──────────── SENSOR CALIBRATION ────────────
// These convert raw analog (0-1023) to approximate real-world values.
// MQ sensors output voltage proportional to gas concentration.
// Adjust these based on your specific sensor calibration.
//
// MQ4:   CH4 in ppm  (typical range 200-10000 ppm)
// MQ3:   Alcohol in mg/L (approximate)
// MQ135: NH3 in ppm   (approximate, also reads CO2/VOCs)
// MQ136: H2S in ppm   (approximate)
#define MQ4_SCALE     (5000.0 / 1023.0)   // Raw -> approx CH4 ppm
#define MQ3_SCALE     (5.0 / 1023.0)      // Raw -> approx alcohol mg/L
#define MQ135_SCALE   (100.0 / 1023.0)    // Raw -> approx NH3 ppm
#define MQ136_SCALE   (50.0 / 1023.0)     // Raw -> approx H2S ppm

// ──────────── THRESHOLD VALUES ────────────
// These thresholds work on RELATIVE values (current - baseline).
// Baseline is captured after warmup from clean air.
// Only significant CHANGES from baseline trigger spoilage detection.
// Tuned for demo: fresh bread stays Fresh, spoilt paneer triggers Spoiled.
#define NH3_FRESH_MAX       1.5    // NH3 diff above this = Warning zone  (lowered for demo)
#define NH3_SPOILED_MIN     4.0    // NH3 diff above this = Spoiled       (lowered for demo)
#define H2S_FRESH_MAX       1.0    // H2S diff above this = Warning zone  (lowered for demo)
#define H2S_SPOILED_MIN     3.0    // H2S diff above this = Spoiled       (lowered for demo)
#define CH4_FRESH_MAX       150.0  // CH4 diff above this = Warning zone  (lowered for demo)
#define CH4_SPOILED_MIN     500.0  // CH4 diff above this = Spoiled       (lowered for demo)
#define TEMP_WARNING        33.0   // Temperature above this is concerning
#define TEMP_DANGER         40.0   // Temperature above this is dangerous

// ──────────── STABILITY CHECK ────────────
// Require N consecutive bad readings before declaring spoilage.
// Prevents random sensor noise from causing false alerts.
#define SPOILAGE_STABILITY_COUNT  2  // 2 consecutive readings (~6 sec) for faster demo response

// ──────────── OBJECTS ────────────
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ──────────── STATE VARIABLES ────────────
unsigned long startTime;
bool warmupDone = false;

// AI Results from backend (received via Serial)
int   freshness    = -1;       // -1 = no result yet
String foodStatus  = "Pending"; // "Fresh", "Warning", "Spoiled"
bool  hasAIResult  = false;

// Local heuristic freshness (used before AI result arrives)
int   localFreshness = 100;
String localStatus   = "Analyzing";

// Baseline calibration (captured from clean air after warmup)
float baseNH3     = 0.0;
float baseH2S     = 0.0;
float baseCH4     = 0.0;
float baseAlcohol = 0.0;
bool  baselineSet = false;

// Stability counter — prevents flickering between states
int stableSpoilageCount = 0;
int stableWarningCount  = 0;

// LCD screen rotation
int  lcdScreen       = 0;
unsigned long lastLcdRotate = 0;

// Reading timer
unsigned long lastReadTime = 0;

// LED blink state for warning mode
unsigned long lastBlink = 0;
bool blinkState = false;

// Alarm tone state for spoiled mode
unsigned long lastAlarm = 0;
bool alarmHigh = false;

// Warning beep timer
unsigned long lastBeep = 0;

// Latest sensor values (stored for LCD display)
float lastTemp    = 0.0;
float lastHum     = 0.0;
float lastCH4     = 0.0;
float lastAlcohol = 0.0;
float lastNH3     = 0.0;
float lastH2S     = 0.0;

// Raw analog values for debug display
int rawMQ4val   = 0;
int rawMQ3val   = 0;
int rawMQ135val = 0;
int rawMQ136val = 0;

// Serial input buffer
String serialBuffer = "";

// ──────────── CUSTOM LCD CHARACTERS ────────────
// Degree symbol
byte degreeChar[8] = {
  0b00110,
  0b01001,
  0b01001,
  0b00110,
  0b00000,
  0b00000,
  0b00000,
  0b00000
};

// Skull icon (for spoiled)
byte skullChar[8] = {
  0b01110,
  0b10101,
  0b11111,
  0b10101,
  0b01110,
  0b01110,
  0b00100,
  0b00000
};

// Checkmark icon (for fresh)
byte checkChar[8] = {
  0b00000,
  0b00001,
  0b00010,
  0b10100,
  0b01000,
  0b00000,
  0b00000,
  0b00000
};

// Warning icon
byte warnChar[8] = {
  0b00100,
  0b01010,
  0b01010,
  0b10001,
  0b10101,
  0b10001,
  0b11111,
  0b00000
};

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(SERIAL_BAUD);
  
  // Initialize DHT sensor
  dht.begin();
  
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, degreeChar);
  lcd.createChar(1, skullChar);
  lcd.createChar(2, checkChar);
  lcd.createChar(3, warnChar);
  
  // Initialize LED pins
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_BLUE,  OUTPUT);
  pinMode(LED_RED,   OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // All LEDs off initially
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_BLUE,  LOW);
  digitalWrite(LED_RED,   LOW);
  noTone(BUZZER_PIN);
  
  // Record start time
  startTime = millis();
  
  // ──── STARTUP SPLASH SCREEN ────
  lcd.setCursor(0, 0);
  lcd.print("  NutriPlate AI ");
  lcd.setCursor(0, 1);
  lcd.print(" Smart Canteen  ");
  delay(2000);
  
  // Quick LED test (shows faculty all 3 LEDs work)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LED Self-Test...");
  
  lcd.setCursor(0, 1);
  lcd.print("GREEN ");
  digitalWrite(LED_GREEN, HIGH);
  delay(500);
  digitalWrite(LED_GREEN, LOW);
  
  lcd.print("BLUE ");
  digitalWrite(LED_BLUE, HIGH);
  delay(500);
  digitalWrite(LED_BLUE, LOW);
  
  lcd.print("RED");
  digitalWrite(LED_RED, HIGH);
  delay(500);
  digitalWrite(LED_RED, LOW);
  
  // Buzzer test
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Buzzer Test...");
  tone(BUZZER_PIN, BUZZER_FREQ, 200);
  delay(400);
  noTone(BUZZER_PIN);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("All Systems OK!");
  lcd.setCursor(0, 1);
  lcd.print("Starting warmup");
  delay(1500);
  lcd.clear();
  
  // ──── Enter warmup with Blue LED ────
  digitalWrite(LED_BLUE, HIGH);
  
  lcd.setCursor(0, 0);
  lcd.print("Warming Up...");
  lcd.setCursor(0, 1);
  lcd.print("Sensors init...");
  
  // Print startup info to serial (for debugging in Arduino IDE monitor)
  Serial.println(F("========================================"));
  Serial.println(F("  NutriPlate Smart Canteen AI v2.0"));
  Serial.println(F("  Sensor Node Starting..."));
  Serial.println(F("========================================"));
  Serial.print(F("Warmup Duration: "));
  Serial.print(WARMUP_MS / 1000);
  Serial.println(F(" seconds"));
  Serial.println(F("Waiting for sensors to stabilize..."));
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  unsigned long now = millis();
  
  // ──────── CHECK FOR BACKEND RESPONSE ────────
  checkSerialInput();
  
  // ──────── WARMUP PHASE ────────
  if (!warmupDone) {
    handleWarmup(now);
    return; // Don't send data during warmup
  }
  
  // ──────── POST-WARMUP: READ & SEND SENSOR DATA ────────
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;
    readAndSendSensors();
  }
  
  // ──────── ROTATE LCD DISPLAY ────────
  if (now - lastLcdRotate >= LCD_ROTATE_MS) {
    lastLcdRotate = now;
    rotateLCD();
  }
  
  // ──────── UPDATE LED/BUZZER BASED ON STATUS ────────
  updateIndicators(now);
}

// ============================================================
// WARMUP HANDLER — Blue LED stays on, LCD shows countdown
// ============================================================
void handleWarmup(unsigned long now) {
  unsigned long elapsed = now - startTime;
  
  if (elapsed >= WARMUP_MS) {
    // ──── Warmup complete! ────
    warmupDone = true;
    digitalWrite(LED_BLUE, LOW);
    
    // Celebratory sequence
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Warmup Complete!");
    lcd.setCursor(0, 1);
    lcd.print("Sensors Ready ");
    lcd.write(byte(2)); // checkmark
    
    // Ascending tone to signal ready
    tone(BUZZER_PIN, 800, 150);
    delay(200);
    tone(BUZZER_PIN, 1000, 150);
    delay(200);
    tone(BUZZER_PIN, 1200, 150);
    delay(200);
    noTone(BUZZER_PIN);
    
    // Flash green 3 times
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_GREEN, HIGH);
      delay(200);
      digitalWrite(LED_GREEN, LOW);
      delay(200);
    }
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Monitoring Food");
    lcd.setCursor(0, 1);
    lcd.print("Sending data...");
    delay(1500);
    lcd.clear();
    
    Serial.println(F("========================================"));
    Serial.println(F("  WARMUP COMPLETE — Sensors Active"));
    Serial.println(F("  Now sending JSON data every 3 sec"));
    Serial.println(F("========================================"));
    
    // ── Capture baseline from clean air ──
    // Read sensors immediately to get the "no food" reference values.
    // All future readings will be compared against these baselines.
    delay(500);  // let ADC settle
    rawMQ135val = analogRead(MQ135_PIN);
    rawMQ136val = analogRead(MQ136_PIN);
    rawMQ4val   = analogRead(MQ4_PIN);
    rawMQ3val   = analogRead(MQ3_PIN);
    
    baseNH3     = rawMQ135val * MQ135_SCALE;
    baseH2S     = rawMQ136val * MQ136_SCALE;
    baseCH4     = rawMQ4val   * MQ4_SCALE;
    baseAlcohol = rawMQ3val   * MQ3_SCALE;
    baselineSet = true;
    
    Serial.println(F("\n── Baseline Captured (clean air) ──"));
    Serial.print(F("  Base NH3:     ")); Serial.println(baseNH3, 2);
    Serial.print(F("  Base H2S:     ")); Serial.println(baseH2S, 2);
    Serial.print(F("  Base CH4:     ")); Serial.println(baseCH4, 1);
    Serial.print(F("  Base Alcohol: ")); Serial.println(baseAlcohol, 3);
    Serial.println(F("── Readings relative to baseline ──\n"));
    
    lastReadTime  = now;
    lastLcdRotate = now;
    return;
  }
  
  // ──── Show countdown on LCD ────
  unsigned long remaining = (WARMUP_MS - elapsed) / 1000;
  int mins = remaining / 60;
  int secs = remaining % 60;
  
  // Progress bar calculation
  int progressPct = (int)((elapsed * 100UL) / WARMUP_MS);
  int barLen      = (int)((elapsed * 16UL) / WARMUP_MS); // 16 chars wide
  
  lcd.setCursor(0, 0);
  lcd.print("Warming Up ");
  lcd.print(progressPct);
  lcd.print("%  ");
  
  lcd.setCursor(0, 1);
  // Show  M:SS  on the left, progress bar on the right
  lcd.print(mins);
  lcd.print(":");
  if (secs < 10) lcd.print("0");
  lcd.print(secs);
  lcd.print(" ");
  
  // Mini progress bar using block characters
  for (int i = 5; i < 16; i++) {
    lcd.setCursor(i, 1);
    if (i - 5 < barLen - 4) {
      lcd.print((char)0xFF); // filled block
    } else {
      lcd.print("-");
    }
  }
  
  // Blue LED pulses slightly during warmup for visual interest
  // Use PWM-like effect via quick on/off (blue LED stays mostly ON)
  digitalWrite(LED_BLUE, HIGH);
  
  delay(500); // Update countdown every 0.5s
}

// ============================================================
// READ SENSORS & SEND JSON OVER SERIAL
// ============================================================
void readAndSendSensors() {
  // ──── Read DHT11 ────
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  
  // Check for DHT read failure — use last known good value
  if (isnan(temp) || isnan(hum)) {
    temp = lastTemp;
    hum  = lastHum;
  }
  
  // ──── Read MQ sensors (raw analog 0-1023) ────
  rawMQ4val   = analogRead(MQ4_PIN);
  rawMQ3val   = analogRead(MQ3_PIN);
  rawMQ135val = analogRead(MQ135_PIN);
  rawMQ136val = analogRead(MQ136_PIN);
  
  // ──── Convert to real-world units ────
  float ch4     = rawMQ4val   * MQ4_SCALE;    // CH4 in ppm
  float alcohol = rawMQ3val   * MQ3_SCALE;    // Alcohol in mg/L
  float nh3     = rawMQ135val * MQ135_SCALE;  // NH3 in ppm
  float h2s     = rawMQ136val * MQ136_SCALE;  // H2S in ppm
  
  // ──── Store for LCD display ────
  lastTemp    = temp;
  lastHum     = hum;
  lastCH4     = ch4;
  lastAlcohol = alcohol;
  lastNH3     = nh3;
  lastH2S     = h2s;
  
  // ──── Compute LOCAL heuristic freshness (before AI result) ────
  computeLocalFreshness();
  
  // ──── SEND JSON OVER SERIAL ────
  // The hardware_bridge.py expects this exact format.
  // Backend Pydantic model (SensorReading) requires ALL 8 keys:
  // NH3, H2S, CH4, alcohol, VOC, H2, temperature, humidity
  // We send 0.0 for VOC and H2 since we don't have dedicated sensors.
  
  Serial.print(F("{"));
  Serial.print(F("\"NH3\":"));      Serial.print(nh3, 2);      Serial.print(F(","));
  Serial.print(F("\"H2S\":"));      Serial.print(h2s, 2);      Serial.print(F(","));
  Serial.print(F("\"CH4\":"));      Serial.print(ch4, 1);      Serial.print(F(","));
  Serial.print(F("\"alcohol\":")); Serial.print(alcohol, 2);  Serial.print(F(","));
  Serial.print(F("\"VOC\":0.0,"));
  Serial.print(F("\"H2\":0.0,"));
  Serial.print(F("\"temperature\":")); Serial.print(temp, 1); Serial.print(F(","));
  Serial.print(F("\"humidity\":"));    Serial.print(hum, 1);
  Serial.println(F("}"));
}

// ============================================================
// LOCAL HEURISTIC FRESHNESS — computed before AI responds
// ============================================================
// This gives immediate feedback on the LCD and LEDs even before
// the backend processes 30 readings. The AI result overrides this.
void computeLocalFreshness() {
  float score = 100.0;
  
  // ── Use RELATIVE values (current - baseline) ──
  // This ignores the noisy "ambient" readings and only reacts to
  // actual gas changes caused by food spoilage.
  float nh3_diff = max(0.0f, lastNH3 - baseNH3);
  float h2s_diff = max(0.0f, lastH2S - baseH2S);
  float ch4_diff = max(0.0f, lastCH4 - baseCH4);
  
  // NH3 penalty (relative to baseline)
  if (nh3_diff > NH3_SPOILED_MIN) {
    score -= 30.0;
  } else if (nh3_diff > NH3_FRESH_MAX) {
    score -= map(nh3_diff * 10, NH3_FRESH_MAX * 10, NH3_SPOILED_MIN * 10, 5, 25);
  }
  
  // H2S penalty (relative to baseline)
  if (h2s_diff > H2S_SPOILED_MIN) {
    score -= 30.0;
  } else if (h2s_diff > H2S_FRESH_MAX) {
    score -= map(h2s_diff * 10, H2S_FRESH_MAX * 10, H2S_SPOILED_MIN * 10, 5, 25);
  }
  
  // CH4 penalty (relative to baseline)
  if (ch4_diff > CH4_SPOILED_MIN) {
    score -= 15.0;
  } else if (ch4_diff > CH4_FRESH_MAX) {
    score -= map((long)ch4_diff, (long)CH4_FRESH_MAX, (long)CH4_SPOILED_MIN, 5, 15);
  }
  
  // Temperature penalty (absolute — not relative)
  if (lastTemp > TEMP_DANGER) {
    score -= 15.0;
  } else if (lastTemp > TEMP_WARNING) {
    score -= 5.0;
  }
  
  // Clamp to 0-100
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  
  int rawFreshness = (int)score;
  
  // ── STABILITY CHECK ──
  // Require multiple consecutive bad readings to change status.
  // Prevents random sensor noise from triggering false alarms.
  if (rawFreshness < 40) {
    stableSpoilageCount++;
    stableWarningCount++;
  } else if (rawFreshness < 70) {
    stableSpoilageCount = 0;  // not spoiled-level
    stableWarningCount++;
  } else {
    // Score is good — reset both counters
    stableSpoilageCount = 0;
    stableWarningCount  = 0;
  }
  
  localFreshness = rawFreshness;
  
  // Only escalate status after sustained readings
  if (stableSpoilageCount >= SPOILAGE_STABILITY_COUNT) {
    localStatus = "Spoiled";
  } else if (stableWarningCount >= SPOILAGE_STABILITY_COUNT) {
    localStatus = "Warning";
  } else {
    localStatus = "Fresh";
  }
}

// ============================================================
// CHECK SERIAL INPUT FROM PYTHON BRIDGE
// ============================================================
// Expects:  RESULT:<freshness_int>:<status_string>
// Example:  RESULT:85:Fresh
//           RESULT:32:Spoiled
//           RESULT:55:Warning
void checkSerialInput() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    
    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        processSerialMessage(serialBuffer);
        serialBuffer = "";
      }
    } else {
      serialBuffer += c;
      // Safety: prevent buffer overflow
      if (serialBuffer.length() > 64) {
        serialBuffer = "";
      }
    }
  }
}

void processSerialMessage(String msg) {
  msg.trim();
  
  if (msg.startsWith("RESULT:")) {
    // Parse "RESULT:85:Fresh"
    int firstColon  = msg.indexOf(':', 0);
    int secondColon = msg.indexOf(':', firstColon + 1);
    
    if (firstColon > 0 && secondColon > firstColon) {
      String freshStr  = msg.substring(firstColon + 1, secondColon);
      String statusStr = msg.substring(secondColon + 1);
      statusStr.trim();
      
      int newFreshness = freshStr.toInt();
      
      // Validate the parsed values
      if (newFreshness >= 0 && newFreshness <= 100) {
        freshness  = newFreshness;
        foodStatus = statusStr;
        hasAIResult = true;
      }
    }
  }
}

// ============================================================
// ROTATE LCD DISPLAY — Shows different info on each rotation
// ============================================================
void rotateLCD() {
  lcd.clear();
  lcdScreen++;
  if (lcdScreen > LCD_SCREENS) lcdScreen = 1;
  
  // Determine which freshness/status to display
  int    dispFreshness;
  String dispStatus;
  
  if (hasAIResult) {
    dispFreshness = freshness;
    dispStatus    = foodStatus;
  } else {
    dispFreshness = localFreshness;
    dispStatus    = localStatus;
  }
  
  switch (lcdScreen) {
    
    case 1:  // ──── Temperature & Humidity ────
      lcd.setCursor(0, 0);
      lcd.print("Temp: ");
      lcd.print(lastTemp, 1);
      lcd.write(byte(0)); // degree symbol
      lcd.print("C");
      
      lcd.setCursor(0, 1);
      lcd.print("Humidity: ");
      lcd.print(lastHum, 0);
      lcd.print("%");
      break;
      
    case 2:  // ──── CH4 & Alcohol ────
      lcd.setCursor(0, 0);
      lcd.print("CH4: ");
      lcd.print(lastCH4, 0);
      lcd.print(" ppm");
      
      lcd.setCursor(0, 1);
      lcd.print("Alcohol:");
      lcd.print(lastAlcohol, 2);
      lcd.print("mg");
      break;
      
    case 3:  // ──── NH3 & H2S ────
      lcd.setCursor(0, 0);
      lcd.print("NH3: ");
      lcd.print(lastNH3, 1);
      lcd.print(" ppm");
      
      lcd.setCursor(0, 1);
      lcd.print("H2S: ");
      lcd.print(lastH2S, 1);
      lcd.print(" ppm");
      break;
      
    case 4:  // ──── Freshness Score & Status ────
      lcd.setCursor(0, 0);
      if (hasAIResult) {
        lcd.print("AI Freshness:");
        lcd.print(dispFreshness);
        lcd.print("%");
      } else {
        lcd.print("Est Fresh:");
        lcd.print(dispFreshness);
        lcd.print("%");
      }
      
      lcd.setCursor(0, 1);
      if (dispStatus == "Fresh") {
        lcd.write(byte(2)); // checkmark
        lcd.print(" FRESH - Safe ");
      } else if (dispStatus == "Warning") {
        lcd.write(byte(3)); // warning
        lcd.print(" WARN - Check!");
      } else if (dispStatus == "Spoiled") {
        lcd.write(byte(1)); // skull
        lcd.print(" SPOILED!     ");
      } else {
        lcd.print("Status: ");
        lcd.print(dispStatus.substring(0, 8)); // truncate for LCD width
      }
      break;
      
    case 5:  // ──── Raw Analog Values (Debug) ────
      lcd.setCursor(0, 0);
      lcd.print("R:");
      lcd.print(rawMQ135val);
      lcd.print(" ");
      lcd.print(rawMQ136val);
      lcd.print(" ");
      lcd.print(rawMQ4val);
      
      lcd.setCursor(0, 1);
      lcd.print("R:");
      lcd.print(rawMQ3val);
      lcd.print(" T:");
      lcd.print(lastTemp, 0);
      lcd.print(" H:");
      lcd.print(lastHum, 0);
      break;
  }
}

// ============================================================
// UPDATE LED & BUZZER BASED ON AI STATUS (or local heuristic)
// ============================================================
void updateIndicators(unsigned long now) {
  // Determine active status source
  String activeStatus;
  
  if (hasAIResult) {
    activeStatus = foodStatus;
  } else {
    // Before AI responds, use local heuristic
    activeStatus = localStatus;
  }
  
  // ──── FRESH: Solid GREEN ────
  if (activeStatus == "Fresh") {
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_RED,   LOW);
    digitalWrite(LED_BLUE,  LOW);
    noTone(BUZZER_PIN);
  }
  // ──── WARNING: Alternating RED+GREEN blink + occasional beep ────
  else if (activeStatus == "Warning") {
    digitalWrite(LED_BLUE, LOW);
    
    // Blink RED and GREEN alternately
    if (now - lastBlink > BLINK_INTERVAL) {
      lastBlink = now;
      blinkState = !blinkState;
      digitalWrite(LED_GREEN, blinkState ? HIGH : LOW);
      digitalWrite(LED_RED,   blinkState ? LOW  : HIGH);
    }
    
    // Short beep every WARN_BEEP_MS
    if (now - lastBeep > WARN_BEEP_MS) {
      lastBeep = now;
      tone(BUZZER_PIN, BUZZER_FREQ, 150); // 150ms beep
    }
  }
  // ──── SPOILED: Solid RED + continuous alarm ────
  else if (activeStatus == "Spoiled") {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED,   HIGH);
    digitalWrite(LED_BLUE,  LOW);
    
    // Alternating two-tone alarm (more urgent than a steady tone)
    if (now - lastAlarm > ALARM_INTERVAL) {
      lastAlarm = now;
      alarmHigh = !alarmHigh;
      if (alarmHigh) {
        tone(BUZZER_PIN, BUZZER_FREQ);        // High tone
      } else {
        tone(BUZZER_PIN, BUZZER_FREQ / 2);    // Low tone
      }
    }
  }
  // ──── UNKNOWN/ANALYZING: All LEDs off ────
  else {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED,   LOW);
    digitalWrite(LED_BLUE,  LOW);
    noTone(BUZZER_PIN);
  }
}
