#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SoftwareSerial.h>
#include <WiFiManager.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// WiFi Manager credentials
const char* WIFI_AP_NAME = "Group13 IoT";
const char* WIFI_AP_PASS = "12345678";

// HiveMQ Cloud configuration
const char* MQTT_HOST = "e4ff91725d804eda9b6a7b4ad55da4e4.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;  // TLS port
const char* MQTT_USER = "thach";
const char* MQTT_PASS = "Thach18012005";
const char* MQTT_CLIENT_ID = "esp8266_med_1234";

// Create MQTT Broker URL
char mqttBroker[128];

// MQTT Topics
const char* TOPIC_MEDICATION_REMINDER = "medication/reminder";
const char* TOPIC_MEDICATION_TAKEN = "medication/taken";

// HTTP server for fall detection
const char* http_server = "https://detection-fall-backend-production.up.railway.app/api/fall-detection";

// Serial configuration for Arduino Nano
SoftwareSerial nanoSerial(D6, D7);

// WiFi and MQTT clients
WiFiClientSecure espClient;
PubSubClient client(espClient);

// NTP Client setup for time sync
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 7*3600); // UTC+7 for Vietnam

// Medication Schedule Structure
struct Schedule {
  int hours;
  int minutes;
};

struct Medication {
  String name;
  String deviceId;
  String userId;
  String reminderId;
  Schedule schedules[5];  // Max 5 schedules per medication
  int scheduleCount;
  bool isActive;
};

#define MAX_MEDICATIONS 10
Medication medications[MAX_MEDICATIONS];
int medicationCount = 0;

// State tracking
bool mqttConnected = false;
unsigned long lastReconnectAttempt = 0;
unsigned long lastTimeCheck = 0;
const unsigned long RECONNECT_INTERVAL = 5000;  // 5 seconds
const unsigned long TIME_CHECK_INTERVAL = 60000;  // 1 minute

void setup_wifi() {
  WiFiManager wifiManager;
  wifiManager.setConfigPortalTimeout(180);
  
  Serial.println("🔄 Khởi động WiFi Manager...");
  bool res = wifiManager.autoConnect(WIFI_AP_NAME, WIFI_AP_PASS);
  
  if (!res) {
    Serial.println("❌ Không thể kết nối WiFi!");
    delay(3000);
    ESP.restart();
    return;
  }
  
  Serial.println("✅ WiFi đã kết nối!");
  Serial.print("📱 IP: ");
  Serial.println(WiFi.localIP());
}

void setup_mqtt() {
  // Create broker URL
  snprintf(mqttBroker, sizeof(mqttBroker), "mqtts://%s:%d", MQTT_HOST, MQTT_PORT);
  
  // Setup MQTT Client with TLS
  espClient.setInsecure();  // For testing only
  espClient.setBufferSizes(512, 512);
  
  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(mqtt_callback);
  client.setBufferSize(512);
  
  Serial.println("🔧 Đã cấu hình MQTT Client");
  Serial.print("🔗 Broker URL: "); 
  Serial.println(mqttBroker);
}

void mqtt_connect() {
  Serial.println("🔄 Đang kết nối MQTT...");
  
  if (client.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS)) {
    Serial.println("✅ Kết nối MQTT thành công!");
    Serial.printf("📝 Client ID: %s\n", MQTT_CLIENT_ID);
    
    // Subscribe to medication reminder topic
    if (client.subscribe(TOPIC_MEDICATION_REMINDER, 1)) {
      Serial.println("📩 Đã đăng ký nhận thông báo thuốc");
    } else {
      Serial.println("❌ Lỗi đăng ký nhận thông báo");
    }
    
  } else {
    Serial.print("❌ Kết nối thất bại, rc = ");
    Serial.print(client.state());
    
    switch (client.state()) {
      case -4: Serial.println(" (MQTT_CONNECTION_TIMEOUT)"); break;
      case -3: Serial.println(" (MQTT_CONNECTION_LOST)"); break;
      case -2: Serial.println(" (MQTT_CONNECT_FAILED)"); break;
      case -1: Serial.println(" (MQTT_DISCONNECTED)"); break;
      case 1: Serial.println(" (MQTT_CONNECT_BAD_PROTOCOL)"); break;
      case 2: Serial.println(" (MQTT_CONNECT_BAD_CLIENT_ID)"); break;
      case 3: Serial.println(" (MQTT_CONNECT_UNAVAILABLE)"); break;
      case 4: Serial.println(" (MQTT_CONNECT_BAD_CREDENTIALS)"); break;
      case 5: Serial.println(" (MQTT_CONNECT_UNAUTHORIZED)"); break;
    }
  }
}

void addMedication(JsonDocument& doc) {
  if (medicationCount >= MAX_MEDICATIONS) {
    Serial.println("❌ Đã đạt giới hạn số lượng thuốc!");
    return;
  }

  Medication& med = medications[medicationCount];
  med.name = doc["medicineName"].as<String>();
  med.deviceId = doc["deviceId"].as<String>();
  med.userId = doc["userId"].as<String>();
  med.reminderId = doc["reminderId"].as<String>();
  med.isActive = true;
  med.scheduleCount = 0;

  JsonArray scheduleArray = doc["schedule"];
  for (JsonObject schedule : scheduleArray) {
    if (med.scheduleCount < 5) {
      med.schedules[med.scheduleCount].hours = schedule["hours"];
      med.schedules[med.scheduleCount].minutes = schedule["minutes"];
      med.scheduleCount++;
    }
  }

  Serial.print("✅ Đã thêm lịch uống thuốc: ");
  Serial.println(med.name);
  Serial.println("📅 Lịch uống:");
  for (int i = 0; i < med.scheduleCount; i++) {
    Serial.print(med.schedules[i].hours);
    Serial.print(":");
    if (med.schedules[i].minutes < 10) Serial.print("0");
    Serial.println(med.schedules[i].minutes);
  }

  medicationCount++;
}

void removeMedication(const char* reminderId) {
  for (int i = 0; i < medicationCount; i++) {
    if (medications[i].reminderId == reminderId) {
      // Shift remaining medications
      for (int j = i; j < medicationCount - 1; j++) {
        medications[j] = medications[j + 1];
      }
      medicationCount--;
      Serial.print("✅ Đã xóa lịch uống thuốc: ");
      Serial.println(reminderId);
      return;
    }
  }
}

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📩 Nhận tin nhắn từ topic: ");
  Serial.println(topic);
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.print("❌ Lỗi khi phân tích JSON: ");
    Serial.println(error.c_str());
    return;
  }

  const char* type = doc["type"];
  Serial.print("📝 Loại tin nhắn: ");
  Serial.println(type);
  
  if (strcmp(type, "MEDICATION_REMINDER") == 0) {
    addMedication(doc);
  } 
  else if (strcmp(type, "REMINDER_DELETED") == 0) {
    const char* reminderId = doc["reminderId"];
    removeMedication(reminderId);
  }
}

void checkMedicationSchedules() {
  if (!timeClient.update()) {
    Serial.println("❌ Không thể cập nhật thời gian!");
    return;
  }

  int currentHour = timeClient.getHours();
  int currentMinute = timeClient.getMinutes();

  Serial.print("⏰ Kiểm tra lịch vào lúc: ");
  Serial.print(currentHour);
  Serial.print(":");
  if (currentMinute < 10) Serial.print("0");
  Serial.println(currentMinute);

  for (int i = 0; i < medicationCount; i++) {
    if (!medications[i].isActive) continue;

    for (int j = 0; j < medications[i].scheduleCount; j++) {
      Schedule& schedule = medications[i].schedules[j];
      
      if (schedule.hours == currentHour && schedule.minutes == currentMinute) {
        Serial.print("⏰ Đến giờ uống thuốc: ");
        Serial.println(medications[i].name);
        
        // TODO: Add buzzer/LED notification code here
        // digitalWrite(BUZZER_PIN, HIGH);
        // delay(1000);
        // digitalWrite(BUZZER_PIN, LOW);
        
        // Publish notification
        StaticJsonDocument<256> doc;
        doc["type"] = "REMINDER_NOTIFICATION";
        doc["deviceId"] = medications[i].deviceId;
        doc["userId"] = medications[i].userId;
        doc["medicineName"] = medications[i].name;
        doc["reminderId"] = medications[i].reminderId;
        doc["time"] = timeClient.getFormattedTime();

        char buffer[256];
        serializeJson(doc, buffer);
        
        if (client.publish(TOPIC_MEDICATION_TAKEN, buffer)) {
          Serial.println("✅ Đã gửi thông báo");
        } else {
          Serial.println("❌ Lỗi gửi thông báo");
        }
      }
    }
  }
}

void mqtt_reconnect() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Mất kết nối WiFi!");
    return;
  }
  
  if (!client.connected() && millis() - lastReconnectAttempt >= RECONNECT_INTERVAL) {
    lastReconnectAttempt = millis();
    mqtt_connect();
  }
}

void handle_fall_detection() {
  if (!nanoSerial.available()) return;
  
  String jsonMessage = nanoSerial.readStringUntil('\n');
  Serial.println("📩 Nhận JSON từ Arduino Nano:");
  Serial.println(jsonMessage);
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi không kết nối!");
    return;
  }
  
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  http.begin(client, http_server);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  int retry = 0;
  int httpResponseCode;
  
  while (retry < 3) {
    httpResponseCode = http.POST(jsonMessage);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("📩 Phản hồi từ server:");
      Serial.println(response);
      break;
    } else {
      Serial.printf("❌ Lỗi POST, mã: %d. Lần thử %d/3\n", httpResponseCode, retry + 1);
      retry++;
      delay(1000 * retry);
    }
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);
  nanoSerial.begin(9600);
  
  Serial.println("\n🚀 Bắt đầu khởi tạo...");
  
  setup_wifi();
  
  // Setup NTP
  timeClient.begin();
  if (timeClient.update()) {
    Serial.println("✅ Đã đồng bộ thời gian");
  } else {
    Serial.println("❌ Lỗi đồng bộ thời gian");
  }
  
  // Setup MQTT
  setup_mqtt();
  mqtt_connect();

  Serial.println("✨ Khởi tạo hoàn tất!");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Mất kết nối WiFi!");
    delay(1000);
    ESP.restart();
    return;
  }
  
  // MQTT connection management
  if (!client.connected()) {
    mqtt_reconnect();
  }
  client.loop();
  
  // Check medication schedules every minute
  if (millis() - lastTimeCheck >= TIME_CHECK_INTERVAL) {
    checkMedicationSchedules();
    lastTimeCheck = millis();
  }
  
  // Handle fall detection via HTTP
  handle_fall_detection();
  
  delay(100);
}