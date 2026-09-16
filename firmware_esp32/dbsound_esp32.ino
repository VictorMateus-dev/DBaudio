
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h> 

const char* WIFI_SSID     = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";

const char* SUPABASE_URL   = "https://seu-projeto.supabase.co"; 
const char* SUPABASE_ANON  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; 

const char* DEVICE_UID     = "ESP32-APT-101";
const char* DEVICE_TOKEN   = "dbsound_token_101_secure";

#define PIN_SENSOR_SALA     34  
#define PIN_SENSOR_QUARTO   35  
#define PIN_SENSOR_COZINHA  32  

#define PIN_LED_ALERTA      2   
#define PIN_BUZZER          4   

const int SAMPLE_WINDOW_MS       = 50;   
const float CALIBRATION_OFFSET   = 38.0; 
const float CRITICAL_THRESHOLD   = 80.0; 
const unsigned long MIN_DURATION = 3000; 
const unsigned long COOLDOWN_MS  = 60000;

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 5000; 

unsigned long highNoiseStartTime = 0;
unsigned long lastBuzzerAlertTime = 0;
bool isAlertActive = false;

void setupWiFi();
void checkWiFiConnection();
float readMax9814Decibels(int pin);
void sendTelemetry(int channel, float decibels);
void handleLocalAlert(float maxDecibels);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[dBSound] Inicializando Firmware ESP32...");
  Serial.printf("[dBSound] Dispositivo: %s\n", DEVICE_UID);

  pinMode(PIN_SENSOR_SALA, INPUT);
  pinMode(PIN_SENSOR_QUARTO, INPUT);
  pinMode(PIN_SENSOR_COZINHA, INPUT);

  pinMode(PIN_LED_ALERTA, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  digitalWrite(PIN_LED_ALERTA, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  setupWiFi();

  Serial.println("[dBSound] Setup concluído. Iniciando telemetria contínua.");
}

void loop() {
  checkWiFiConnection();

  float dbSala    = readMax9814Decibels(PIN_SENSOR_SALA);
  float dbQuarto  = readMax9814Decibels(PIN_SENSOR_QUARTO);
  float dbCozinha = readMax9814Decibels(PIN_SENSOR_COZINHA);

  float maxCurrentDb = max(dbSala, max(dbQuarto, dbCozinha));

  handleLocalAlert(maxCurrentDb);

  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    Serial.printf("[Leituras] Sala: %.1f dB | Quarto: %.1f dB | Cozinha: %.1f dB\n",
                  dbSala, dbQuarto, dbCozinha);

    sendTelemetry(1, dbSala);
    sendTelemetry(2, dbQuarto);
    sendTelemetry(3, dbCozinha);
  }

  delay(20);
}

float readMax9814Decibels(int pin) {
  unsigned long startMillis = millis();
  unsigned int signalMax = 0;
  unsigned int signalMin = 4095;

  while (millis() - startMillis < SAMPLE_WINDOW_MS) {
    unsigned int sample = analogRead(pin);
    if (sample > signalMax) signalMax = sample;
    if (sample < signalMin) signalMin = sample;
  }

  unsigned int peakToPeak = signalMax - signalMin;

  float volts = (peakToPeak * 3.3) / 4095.0;

  if (volts <= 0.01) volts = 0.01;
  float estimatedDb = 20.0 * log10(volts / 0.005) + CALIBRATION_OFFSET;

  return constrain(estimatedDb, 35.0, 115.0);
}

void handleLocalAlert(float maxDecibels) {
  unsigned long now = millis();

  if (maxDecibels >= CRITICAL_THRESHOLD) {
    digitalWrite(PIN_LED_ALERTA, HIGH); 

    if (highNoiseStartTime == 0) {
      highNoiseStartTime = now;
    } else {
      if ((now - highNoiseStartTime >= MIN_DURATION) && !isAlertActive) {
        if (now - lastBuzzerAlertTime >= COOLDOWN_MS || lastBuzzerAlertTime == 0) {
          Serial.println("[ALERTA LOCAL] Ruído crítico sustentado! Acionando Buzzer.");
          isAlertActive = true;
          lastBuzzerAlertTime = now;

          for (int i = 0; i < 3; i++) {
            digitalWrite(PIN_BUZZER, HIGH);
            delay(120);
            digitalWrite(PIN_BUZZER, LOW);
            delay(100);
          }
        }
      }
    }
  } else {
    highNoiseStartTime = 0;
    isAlertActive = false;
    digitalWrite(PIN_LED_ALERTA, LOW);
    digitalWrite(PIN_BUZZER, LOW);
  }
}

void sendTelemetry(int channel, float decibels) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi desconectado. Abortando envio.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); 

  HTTPClient http;
  String endpoint = String(SUPABASE_URL) + "/rest/v1/rpc/ingest_reading";

  if (!http.begin(client, endpoint)) {
    Serial.println("[HTTP] Falha ao inicializar conexão HTTPS.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON);

  StaticJsonDocument<256> doc;
  doc["p_device_uid"]   = DEVICE_UID;
  doc["p_device_token"] = DEVICE_TOKEN;
  doc["p_channel"]      = channel;
  doc["p_decibel"]      = decibels;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);

  if (httpCode == HTTP_CODE_OK || httpCode == 201) {
  } else {
    Serial.printf("[HTTP] Erro ao enviar Canal %d: Código %d\n", channel, httpCode);
  }

  http.end();
}

void setupWiFi() {
  Serial.printf("[Wi-Fi] Conectando à rede: %s...", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Conectado com sucesso!");
    Serial.print("[Wi-Fi] IP do ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Não foi possível conectar. Modo offline ativo com retry automático.");
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 10000) { 
      lastRetry = millis();
      Serial.println("[Wi-Fi] Tentando reconexão...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
  }
}
