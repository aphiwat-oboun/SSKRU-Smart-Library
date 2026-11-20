/**
 * ============================================================================
 * SRRU SMART LIBRARY — REAL HARDWARE FIRMWARE (ESP32 + HLK-LD2410C mmWave)
 * ============================================================================
 * ใช้กับบอร์ด ESP32 จริง + เซนเซอร์เรดาร์ตรวจจับคน HLK-LD2410C (ไม่ใช่ PIR!)
 *
 * คุณสมบัติหลัก:
 *   1. รองรับ HLK-LD2410C ครบทั้ง 2 โหมด (ไม่ต้องลง Library เพิ่ม!):
 *      - โหมด UART (แนะนำ: LD2410_USE_UART = true) -> อ่านค่า Moving + Stationary
 *        (ตรวจจับได้แม้คนนั่งนิ่ง ๆ อ่านหนังสือในห้อง!) พร้อมระยะทาง (cm)
 *      - โหมดขา OUT (LD2410_USE_UART = false) -> ต่อสายสัญญาณเส้นเดียวเข้า GPIO 27
 *   2. ส่งข้อมูลเข้าฐานข้อมูลจริง (Google Apps Script 5 ตาราง / VITE_DATABASE_URL)
 *      - PRESENCE_UPDATE เมื่อสถานะคนเข้า/ออกเปลี่ยนจริง
 *      - HEARTBEAT ทุก 5 นาที เพื่อให้หน้าเว็บ "อุปกรณ์เซนเซอร์ IoT" ขึ้น ONLINE
 *   3. นับถอยหลังเมื่อไม่พบคน (ค่าเริ่มต้น 5 นาที ตามนโยบายห้องสมุด)
 *      ก่อนส่งสถานะห้องว่าง (presence = false)
 *   4. มีระบบ Retry Queue หาก Wi-Fi หลุดชั่วคราว + แก้เสียง Buzzer ค้าง 100%
 *
 * การตั้งค่าก่อนอัปโหลดลงบอร์ดแต่ละห้อง:
 *   - ห้อง 1: ROOM_ID = "ROOM_01", DEVICE_ID = "DEV_ROOM_01", ROOM_NUMBER_INT = 301
 *   - ห้อง 2: ROOM_ID = "ROOM_02", DEVICE_ID = "DEV_ROOM_02", ROOM_NUMBER_INT = 302
 *   - ห้อง 3: ROOM_ID = "ROOM_03", DEVICE_ID = "DEV_ROOM_03", ROOM_NUMBER_INT = 303
 *   - ห้อง 4: ROOM_ID = "ROOM_04", DEVICE_ID = "DEV_ROOM_04", ROOM_NUMBER_INT = 501
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

// ============================================================================
// 1. ตั้งค่าระบบจริง (แก้ไขตรงนี้ก่อนอัปโหลดลงบอร์ด)
// ============================================================================

// 1.1 Wi-Fi ของห้องสมุด (รองรับ 2.4GHz เท่านั้นสำหรับ ESP32)
const char* WIFI_SSID     = "YOUR_LIBRARY_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_LIBRARY_WIFI_PASSWORD";

// 1.2 URL ของ Google Apps Script ระบบจริง (ตรงกับ VITE_DATABASE_URL ใน .env)
const char* API_ENDPOINT  = "https://script.google.com/macros/s/AKfycbz1QFh5c_r2I_JKdtK6xV7nFb5aSbWV-mHF3TcRGQ9vH5g0GXh8vf3PSetQ40mSeHT1/exec";
const char* IOT_API_KEY   = "SRRU_LIB_IOT_KEY_2026";

// 1.3 รหัสห้องและอุปกรณ์ (เปลี่ยนให้ตรงกับบอร์ดของแต่ละห้อง)
const char* DEVICE_ID        = "DEV_ROOM_01";
const char* ROOM_ID          = "ROOM_01";
const int   ROOM_NUMBER_INT  = 301;
const char* FIRMWARE_VERSION = "v2.0.0-esp32-ld2410c";

// 1.4 โหมดการเชื่อมต่อเซนเซอร์ HLK-LD2410C
//   true  = ต่อแบบ UART2 (RX=GPIO16, TX=GPIO17, 256000 baud) -> แม่นยำสุด แยกคนเคลื่อนไหว/นั่งนิ่งได้
//   false = ต่อเฉพาะขา OUT ของ LD2410C เข้า GPIO 27 (ต่อสายง่ายสุด)
const bool LD2410_USE_UART = true;

// ระยะตรวจจับสูงสุดที่ยอมรับว่า "อยู่ในห้อง" (หน่วย: ซม.) ใช้เฉพาะโหมด UART
// แนะนำ 350 - 500 ซม. เพื่อไม่ให้จับทะลุผนัง/กระจกออกไปนอกห้องประชุม
const uint16_t MAX_DETECT_DISTANCE_CM = 450;

// 1.5 เวลาตัดจบเมื่อไม่พบคนในห้อง (นาที)
//   5.0 = 5 นาที (ใช้งานจริง) | 0.5 = 30 วินาที (สำหรับทดสอบหน้างาน)
const float EMPTY_TIMEOUT_MINUTES = 5.0;

// 1.6 Heartbeat ส่งสัญญาณชีพเข้าหน้าเว็บ "อุปกรณ์เซนเซอร์ IoT"
const bool  ENABLE_HEARTBEAT           = true;
const float HEARTBEAT_INTERVAL_MINUTES = 5.0;

// 1.7 เปิด/ปิดเสียง Buzzer และจอ TM1637
const bool ENABLE_BUZZER  = true;
const bool ENABLE_TM1637  = true;

// ============================================================================
// 2. กำหนดขา GPIO ของบอร์ด ESP32 จริง
// ============================================================================
// HLK-LD2410C UART2 (โหมด UART)
const int PIN_LD2410_RX  = 16;   // ต่อกับขา TX ของ LD2410C
const int PIN_LD2410_TX  = 17;   // ต่อกับขา RX ของ LD2410C
// HLK-LD2410C OUT Pin (โหมดขา OUT)
const int PIN_LD2410_OUT = 27;   // ต่อกับขา OUT ของ LD2410C (ถ้า LD2410_USE_UART = false)

// LED / Buzzer / Display
const int PIN_LED_GREEN  = 26;
const int PIN_LED_RED    = 25;
const int PIN_BUZZER     = 14;
const int PIN_TM1637_CLK = 18;
const int PIN_TM1637_DIO = 19;

// Timing
const unsigned long PRESENCE_CONFIRM_MS   = 1500;   // ต้องเจอคนต่อเนื่อง 1.5 วิ ก่อนยืนยันว่ามีคนเข้า
const unsigned long DISPLAY_REFRESH_MS    = 500;
const unsigned long HTTP_TIMEOUT_MS       = 12000;
const unsigned long SENSOR_FAILSAFE_MS    = 15000;  // ถ้า UART ขาดสัญญาณเกิน 15 วิ ให้ถือว่าไม่พบเป้า

const unsigned long EMPTY_TIMEOUT_SECONDS = (unsigned long)(EMPTY_TIMEOUT_MINUTES * 60.0f + 0.5f);
const unsigned long EMPTY_TIMEOUT_MS      = EMPTY_TIMEOUT_SECONDS * 1000UL;
const unsigned long HEARTBEAT_INTERVAL_MS = (unsigned long)(HEARTBEAT_INTERVAL_MINUTES * 60000.0f);

// ============================================================================
// 3. BUILT-IN HLK-LD2410C UART BINARY FRAME PARSER (ไม่ต้องลง Library เพิ่ม)
// ============================================================================
HardwareSerial LD2410Serial(2);

struct Ld2410Data {
  bool     frameValid;
  uint8_t  targetState;      // 0=ไม่มีคน, 1=เคลื่อนไหว, 2=นั่งนิ่ง, 3=ทั้งเคลื่อนไหว+นั่งนิ่ง
  uint16_t movingDistCm;
  uint8_t  movingEnergy;
  uint16_t stationaryDistCm;
  uint8_t  stationaryEnergy;
  uint16_t detectDistCm;
  unsigned long lastFrameMs;
};

Ld2410Data radar = { false, 0, 0, 0, 0, 0, 0, 0 };

// Buffer สำหรับอ่านเฟรมรายงานมาตรฐานของ LD2410C (Header F4 F3 F2 F1 ... Footer F8 F7 F6 F5)
uint8_t ldBuf[64];
int ldIdx = 0;

void initLD2410C() {
  if (LD2410_USE_UART) {
    LD2410Serial.begin(256000, SERIAL_8N1, PIN_LD2410_RX, PIN_LD2410_TX);
    Serial.printf("[LD2410C] UART2 initialized (RX=%d, TX=%d, 256000 baud)\n", PIN_LD2410_RX, PIN_LD2410_TX);
  } else {
    pinMode(PIN_LD2410_OUT, INPUT);
    Serial.printf("[LD2410C] Digital OUT pin mode initialized (GPIO %d)\n", PIN_LD2410_OUT);
  }
}

void parseLd2410Frame(const uint8_t* f, int len) {
  // รูปแบบเฟรมพื้นฐาน:
  // [0..3] F4 F3 F2 F1 (header)
  // [4..5] data length (little-endian)
  // [6]    data type (0x02 = basic target info, 0x01 = engineering mode)
  // [7]    0xAA (head)
  // [8]    target state (0x00..0x03)
  // [9..10]  moving distance (cm, uint16 LE)
  // [11]     moving energy (0..100)
  // [12..13] stationary distance (cm, uint16 LE)
  // [14]     stationary energy (0..100)
  // [15..16] detection distance (cm, uint16 LE)
  if (len < 23) return;
  if (f[7] != 0xAA) return;
  if (f[6] != 0x02 && f[6] != 0x01) return;

  radar.targetState      = f[8];
  radar.movingDistCm     = (uint16_t)f[9]  | ((uint16_t)f[10] << 8);
  radar.movingEnergy     = f[11];
  radar.stationaryDistCm = (uint16_t)f[12] | ((uint16_t)f[13] << 8);
  radar.stationaryEnergy = f[14];
  radar.detectDistCm     = (uint16_t)f[15] | ((uint16_t)f[16] << 8);
  radar.frameValid       = true;
  radar.lastFrameMs      = millis();
}

void pollLD2410C() {
  if (!LD2410_USE_UART) return;

  while (LD2410Serial.available()) {
    uint8_t b = LD2410Serial.read();

    // ซิงค์หา Header 4 ไบต์: F4 F3 F2 F1
    if (ldIdx == 0 && b != 0xF4) continue;
    if (ldIdx == 1 && b != 0xF3) { ldIdx = (b == 0xF4) ? 1 : 0; continue; }
    if (ldIdx == 2 && b != 0xF2) { ldIdx = (b == 0xF4) ? 1 : 0; continue; }
    if (ldIdx == 3 && b != 0xF1) { ldIdx = (b == 0xF4) ? 1 : 0; continue; }

    if (ldIdx < (int)sizeof(ldBuf)) {
      ldBuf[ldIdx++] = b;
    } else {
      ldIdx = 0;
      continue;
    }

    // ตรวจจับ Footer 4 ไบต์: F8 F7 F6 F5
    if (ldIdx >= 23 &&
        ldBuf[ldIdx - 4] == 0xF8 &&
        ldBuf[ldIdx - 3] == 0xF7 &&
        ldBuf[ldIdx - 2] == 0xF6 &&
        ldBuf[ldIdx - 1] == 0xF5) {
      parseLd2410Frame(ldBuf, ldIdx);
      ldIdx = 0;
    }
  }
}

bool isHumanPresentNow() {
  if (!LD2410_USE_UART) {
    return (digitalRead(PIN_LD2410_OUT) == HIGH);
  }

  // ถ้าไม่ได้รับเฟรมจาก LD2410C นานเกินไป
  if (!radar.frameValid || (millis() - radar.lastFrameMs) > SENSOR_FAILSAFE_MS) {
    return false;
  }

  // targetState: 1=เคลื่อนไหว, 2=นั่งนิ่ง, 3=ทั้งสองอย่าง
  if (radar.targetState == 0) return false;

  bool movingInRange = (radar.targetState & 0x01) && (radar.movingDistCm > 0 && radar.movingDistCm <= MAX_DETECT_DISTANCE_CM);
  bool staticInRange = (radar.targetState & 0x02) && (radar.stationaryDistCm > 0 && radar.stationaryDistCm <= MAX_DETECT_DISTANCE_CM);
  return (movingInRange || staticInRange);
}

// ============================================================================
// 4. TM1637 4-DIGIT DISPLAY DRIVER (Optional)
// ============================================================================
const uint8_t TM1637_DIGITS[10] = {
  0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F
};

void tm1637Delay() { delayMicroseconds(50); }
void tm1637Start() {
  pinMode(PIN_TM1637_DIO, OUTPUT);
  digitalWrite(PIN_TM1637_DIO, HIGH);
  digitalWrite(PIN_TM1637_CLK, HIGH);
  tm1637Delay();
  digitalWrite(PIN_TM1637_DIO, LOW);
  tm1637Delay();
}
void tm1637Stop() {
  pinMode(PIN_TM1637_CLK, OUTPUT);
  digitalWrite(PIN_TM1637_CLK, LOW);
  tm1637Delay();
  pinMode(PIN_TM1637_DIO, OUTPUT);
  digitalWrite(PIN_TM1637_DIO, LOW);
  tm1637Delay();
  digitalWrite(PIN_TM1637_CLK, HIGH);
  tm1637Delay();
  digitalWrite(PIN_TM1637_DIO, HIGH);
  tm1637Delay();
}
bool tm1637WriteByte(uint8_t b) {
  pinMode(PIN_TM1637_DIO, OUTPUT);
  for (uint8_t i = 0; i < 8; i++) {
    digitalWrite(PIN_TM1637_CLK, LOW);
    tm1637Delay();
    digitalWrite(PIN_TM1637_DIO, (b & 0x01) ? HIGH : LOW);
    tm1637Delay();
    digitalWrite(PIN_TM1637_CLK, HIGH);
    tm1637Delay();
    b >>= 1;
  }
  digitalWrite(PIN_TM1637_CLK, LOW);
  pinMode(PIN_TM1637_DIO, INPUT_PULLUP);
  tm1637Delay();
  digitalWrite(PIN_TM1637_CLK, HIGH);
  tm1637Delay();
  bool ack = (digitalRead(PIN_TM1637_DIO) == LOW);
  digitalWrite(PIN_TM1637_CLK, LOW);
  pinMode(PIN_TM1637_DIO, OUTPUT);
  tm1637Delay();
  return ack;
}
void tm1637Init() {
  if (!ENABLE_TM1637) return;
  pinMode(PIN_TM1637_CLK, OUTPUT);
  pinMode(PIN_TM1637_DIO, OUTPUT);
  digitalWrite(PIN_TM1637_CLK, HIGH);
  digitalWrite(PIN_TM1637_DIO, HIGH);
}
void tm1637WriteSegments(const uint8_t segs[4]) {
  if (!ENABLE_TM1637) return;
  tm1637Start(); tm1637WriteByte(0x40); tm1637Stop();
  tm1637Start(); tm1637WriteByte(0xC0);
  for (int i = 0; i < 4; i++) tm1637WriteByte(segs[i]);
  tm1637Stop();
  tm1637Start(); tm1637WriteByte(0x8F); tm1637Stop();
}
void tm1637ShowNumber(int num, bool showColon) {
  int n = constrain(num, 0, 9999);
  uint8_t segs[4] = {
    TM1637_DIGITS[(n / 1000) % 10],
    TM1637_DIGITS[(n / 100) % 10],
    TM1637_DIGITS[(n / 10) % 10],
    TM1637_DIGITS[n % 10]
  };
  if (showColon) segs[1] |= 0x80;
  tm1637WriteSegments(segs);
}
void tm1637ShowTime(unsigned long totalSeconds, bool showColon) {
  unsigned long mins = (totalSeconds / 60) % 100;
  unsigned long secs = totalSeconds % 60;
  uint8_t segs[4] = {
    TM1637_DIGITS[mins / 10],
    TM1637_DIGITS[mins % 10],
    TM1637_DIGITS[secs / 10],
    TM1637_DIGITS[secs % 10]
  };
  if (showColon) segs[1] |= 0x80;
  tm1637WriteSegments(segs);
}

// ============================================================================
// 5. STATE & RETRY QUEUE
// ============================================================================
enum RoomState {
  STATE_UNKNOWN,
  STATE_OCCUPIED,
  STATE_EMPTY
};

RoomState currentState = STATE_UNKNOWN;
int lastReportedPresence = -1;

// Debounce & Empty countdown
bool rawPresent = false;
unsigned long presentSinceMs = 0;
unsigned long lastSeenHumanMs = 0;

// Network & Queue
struct QueuedEvent {
  char eventId[48];
  char eventType[24];
  bool hasPresence;
  bool presence;
  char eventTime[32];
};

const int MAX_EVENT_QUEUE = 10;
QueuedEvent eventQueue[MAX_EVENT_QUEUE];
int queueHead = 0, queueTail = 0, queueCount = 0;

bool wifiWasConnected = false;
unsigned long lastWiFiRetryMs = 0;
unsigned long lastHeartbeatMs = 0;
unsigned long nextRetryAtMs = 0;
unsigned long retryBackoffMs = 5000;
unsigned long eventSequence = 0;
unsigned long lastDisplayUpdateMs = 0;
unsigned long lastDebugPrintMs = 0;

// ============================================================================
// 6. BUZZER, LED, DISPLAY, TIME HELPERS
// ============================================================================
void stopBuzzerNow() {
  noTone(PIN_BUZZER);
  digitalWrite(PIN_BUZZER, LOW);
}

void playBeepsNow(int count, unsigned int freqHz) {
  if (!ENABLE_BUZZER) { stopBuzzerNow(); return; }
  for (int i = 0; i < count; i++) {
    tone(PIN_BUZZER, freqHz);
    delay(80);
    stopBuzzerNow();
    if (i < count - 1) delay(70);
  }
}

void updateLED() {
  digitalWrite(PIN_LED_GREEN, currentState == STATE_OCCUPIED ? HIGH : LOW);
  digitalWrite(PIN_LED_RED,   currentState == STATE_EMPTY    ? HIGH : LOW);
}

void updateTM1637Display(bool force = false) {
  if (!ENABLE_TM1637) return;
  unsigned long now = millis();
  if (!force && (now - lastDisplayUpdateMs < DISPLAY_REFRESH_MS)) return;
  lastDisplayUpdateMs = now;
  bool colonOn = ((now / 500) % 2) == 0;

  if (currentState == STATE_UNKNOWN) {
    tm1637ShowNumber(ROOM_NUMBER_INT, false);
  } else if (currentState == STATE_OCCUPIED) {
    if (rawPresent) {
      // มีคนอยู่ในห้องจริง -> แสดงเลขห้องพร้อมจุดกะพริบ
      tm1637ShowNumber(ROOM_NUMBER_INT, colonOn);
    } else {
      // ไม่เจอคนแล้ว -> แสดงเวลานับถอยหลังก่อนตัดเป็นห้องว่าง
      unsigned long elapsed = now - lastSeenHumanMs;
      unsigned long remSec = (elapsed < EMPTY_TIMEOUT_MS) ? ((EMPTY_TIMEOUT_MS - elapsed + 999) / 1000) : 0;
      tm1637ShowTime(remSec, colonOn);
    }
  } else {
    tm1637ShowTime(0, colonOn);
  }
}

String getIsoTimestamp() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 10)) {
    char buf[32];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S+07:00", &timeinfo);
    return String(buf);
  }
  return "";
}

String generateEventId(const char* prefix) {
  eventSequence++;
  return String(DEVICE_ID) + "-" + String(prefix) + "-" + String(millis() / 1000) + "-" + String(eventSequence);
}

// ============================================================================
// 7. HTTPS SEND TO REAL PRODUCTION GOOGLE APPS SCRIPT
// ============================================================================
void enqueueEvent(const String& eventId, const char* eventType, bool hasPresence, bool presenceVal, const String& eventTime) {
  if (queueCount >= MAX_EVENT_QUEUE) {
    queueHead = (queueHead + 1) % MAX_EVENT_QUEUE;
    queueCount--;
  }
  QueuedEvent& slot = eventQueue[queueTail];
  eventId.toCharArray(slot.eventId, sizeof(slot.eventId));
  strncpy(slot.eventType, eventType, sizeof(slot.eventType) - 1);
  slot.eventType[sizeof(slot.eventType) - 1] = '\0';
  slot.hasPresence = hasPresence;
  slot.presence = presenceVal;
  eventTime.toCharArray(slot.eventTime, sizeof(slot.eventTime));
  queueTail = (queueTail + 1) % MAX_EVENT_QUEUE;
  queueCount++;
}

String buildEventJson(const char* eventId, const char* eventType, bool hasPresence, bool presenceVal, const char* eventTime) {
  String json = "{";
  json += "\"api_key\":\"" + String(IOT_API_KEY) + "\",";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"room_id\":\"" + String(ROOM_ID) + "\",";
  if (hasPresence) {
    json += "\"presence\":" + String(presenceVal ? "true" : "false") + ",";
  }
  json += "\"event_type\":\"" + String(eventType) + "\",";
  json += "\"event_id\":\"" + String(eventId) + "\",";
  json += "\"event_time\":\"" + String(eventTime) + "\",";
  json += "\"sensor_type\":\"LD2410C\",";
  if (LD2410_USE_UART && radar.frameValid) {
    json += "\"target_state\":" + String(radar.targetState) + ",";
    json += "\"moving_cm\":" + String(radar.movingDistCm) + ",";
    json += "\"stationary_cm\":" + String(radar.stationaryDistCm) + ",";
  }
  json += "\"firmware_version\":\"" + String(FIRMWARE_VERSION) + "\",";
  json += "\"source\":\"ESP32_REAL\"";
  json += "}";
  return json;
}

bool postJsonToBackend(const String& jsonPayload) {
  stopBuzzerNow();
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  client.setHandshakeTimeout(15);

  HTTPClient http;
  http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
  http.setTimeout(HTTP_TIMEOUT_MS);

  if (!http.begin(client, API_ENDPOINT)) {
    Serial.println("[HTTP ERROR] Cannot start HTTPS connection.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonPayload);
  http.end();

  Serial.printf("[HTTP] Status: %d\n", httpCode);
  return (httpCode == 200 || httpCode == 201 || httpCode == 302 || httpCode == 303);
}

void sendPresenceEvent(bool presenceDetected) {
  String evId = generateEventId("PRES");
  String ts = getIsoTimestamp();
  String json = buildEventJson(evId.c_str(), "PRESENCE_UPDATE", true, presenceDetected, ts.c_str());

  Serial.printf("[EVENT] %s -> %s\n", ROOM_ID, presenceDetected ? "OCCUPIED (มีคน)" : "EMPTY (ห้องว่าง)");
  if (!postJsonToBackend(json)) {
    Serial.println("[NET] Failed -> queued for retry.");
    enqueueEvent(evId, "PRESENCE_UPDATE", true, presenceDetected, ts);
  }
}

void sendHeartbeat() {
  String evId = generateEventId("HB");
  String ts = getIsoTimestamp();
  String json = buildEventJson(evId.c_str(), "HEARTBEAT", false, false, ts.c_str());

  Serial.println("[HEARTBEAT] Sending device alive signal...");
  if (!postJsonToBackend(json)) {
    enqueueEvent(evId, "HEARTBEAT", false, false, ts);
  }
}

void handleRetry() {
  if (queueCount == 0 || WiFi.status() != WL_CONNECTED) return;
  if (millis() < nextRetryAtMs) return;

  QueuedEvent& front = eventQueue[queueHead];
  String json = buildEventJson(front.eventId, front.eventType, front.hasPresence, front.presence, front.eventTime);
  Serial.printf("[RETRY] Re-sending %s...\n", front.eventId);

  if (postJsonToBackend(json)) {
    queueHead = (queueHead + 1) % MAX_EVENT_QUEUE;
    queueCount--;
    retryBackoffMs = 5000;
    nextRetryAtMs = millis() + 500;
  } else {
    nextRetryAtMs = millis() + retryBackoffMs;
    retryBackoffMs = min(retryBackoffMs * 2, 60000UL);
  }
}

// ============================================================================
// 8. WI-FI (บอร์ดจริง Auto-Reconnect)
// ============================================================================
void connectWiFi() {
  unsigned long now = millis();
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      Serial.printf("\n[WIFI] Connected! IP: %s | RSSI: %d dBm\n",
                    WiFi.localIP().toString().c_str(), WiFi.RSSI());
      configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    }
    return;
  }

  if (wifiWasConnected) {
    wifiWasConnected = false;
    Serial.println("[WIFI] Connection lost. Reconnecting...");
  }

  if (now - lastWiFiRetryMs >= 10000 || lastWiFiRetryMs == 0) {
    lastWiFiRetryMs = now;
    Serial.printf("[WIFI] Connecting to %s...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

// ============================================================================
// 9. PRESENCE STATE MACHINE (สำหรับ HLK-LD2410C mmWave)
// ============================================================================
void updatePresenceLogic() {
  unsigned long now = millis();
  bool detectedNow = isHumanPresentNow();

  if (detectedNow) {
    if (!rawPresent) {
      rawPresent = true;
      presentSinceMs = now;
    }
    lastSeenHumanMs = now;

    // ต้องเจอคนต่อเนื่องอย่างน้อย PRESENCE_CONFIRM_MS (1.5 วิ) เพื่อกันสัญญาณรบกวน
    if (currentState != STATE_OCCUPIED && (now - presentSinceMs) >= PRESENCE_CONFIRM_MS) {
      currentState = STATE_OCCUPIED;
      if (lastReportedPresence != 1) {
        lastReportedPresence = 1;
        updateLED();
        updateTM1637Display(true);
        playBeepsNow(1, 1000);
        sendPresenceEvent(true);
      }
    }
  } else {
    rawPresent = false;
    presentSinceMs = 0;

    // ถ้านับตั้งแต่ไม่พบคนครบ EMPTY_TIMEOUT_MS (เช่น 5 นาที) -> แจ้งว่าห้องว่าง
    if (currentState == STATE_OCCUPIED && (now - lastSeenHumanMs) >= EMPTY_TIMEOUT_MS) {
      currentState = STATE_EMPTY;
      if (lastReportedPresence != 0) {
        lastReportedPresence = 0;
        updateLED();
        updateTM1637Display(true);
        playBeepsNow(3, 1400);
        sendPresenceEvent(false);
      }
    }
  }

  // พิมพ์สถานะเรดาร์ลง Serial Monitor ทุก 5 วินาที (ช่วยปรับระยะติดตั้งหน้างาน)
  if (LD2410_USE_UART && (now - lastDebugPrintMs) >= 5000) {
    lastDebugPrintMs = now;
    if (radar.frameValid) {
      Serial.printf("[LD2410C] state=%u | move=%ucm(E:%u) | static=%ucm(E:%u) | present=%s\n",
                    radar.targetState, radar.movingDistCm, radar.movingEnergy,
                    radar.stationaryDistCm, radar.stationaryEnergy,
                    detectedNow ? "YES" : "NO");
    } else {
      Serial.println("[LD2410C] Waiting for UART frames (check TX->GPIO16, RX->GPIO17, 5V power)...");
    }
  }
}

// ============================================================================
// 10. SETUP & LOOP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=============================================");
  Serial.printf("  SRRU Smart Library REAL Hardware (%s)\n", ROOM_ID);
  Serial.printf("  Device: %s | Sensor: HLK-LD2410C (%s)\n",
                DEVICE_ID, LD2410_USE_UART ? "UART2" : "OUT Pin");
  Serial.printf("  Empty Timeout: %.1f min | Max Dist: %u cm\n",
                EMPTY_TIMEOUT_MINUTES, MAX_DETECT_DISTANCE_CM);
  Serial.println("=============================================");

  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  stopBuzzerNow();

  tm1637Init();
  tm1637ShowNumber(ROOM_NUMBER_INT, false);

  initLD2410C();

  // ทดสอบไฟ LED + Buzzer ตอนเปิดเครื่อง
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_RED, HIGH);
  playBeepsNow(1, 1200);
  delay(250);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  connectWiFi();
  lastHeartbeatMs = millis();

  // ส่ง Heartbeat แรกเมื่อ Wi-Fi ต่อติด
  unsigned long waitStart = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - waitStart) < 8000) {
    delay(250);
    Serial.print(".");
  }
  connectWiFi();
  if (ENABLE_HEARTBEAT && WiFi.status() == WL_CONNECTED) {
    sendHeartbeat();
  }
}

void loop() {
  connectWiFi();
  pollLD2410C();
  updatePresenceLogic();
  updateLED();
  updateTM1637Display();
  handleRetry();

  if (ENABLE_HEARTBEAT && (millis() - lastHeartbeatMs) >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = millis();
    sendHeartbeat();
  }

  delay(20);
}
