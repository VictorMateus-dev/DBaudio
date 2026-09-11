/**
 * ==============================================================================
 * dBSound — Firmware Oficial para ESP32 + 3x Sensores Analógicos MAX9814
 * Monitoramento Inteligente de Ruído Residencial com Telemetria Quantitativa
 * ==============================================================================
 * 
 * ESPECIFICAÇÃO DE PINAGEM:
 * - Sensor 1 (Sala Principal):  GPIO 34 (ADC1_CH6 - Leitura Analógica)
 * - Sensor 2 (Quarto Casal):    GPIO 35 (ADC1_CH7 - Leitura Analógica)
 * - Sensor 3 (Cozinha/Área):    GPIO 32 (ADC1_CH4 - Leitura Analógica)
 * - LED Indicador de Alerta:    GPIO 2  (Saída Digital)
 * - Buzzer Local:               GPIO 4  (Saída Digital com modulação PWM/Tone)
 * 
 * SEGURANÇA:
 * O microcontrolador NÃO armazena nem envia áudio bruto.
 * O microcontrolador NÃO possui Service Role Key.
 * A autenticação com o Supabase é realizada via RPC "ingest_reading" utilizando
 * exclusivamente DEVICE_UID e DEVICE_TOKEN gerados para a unidade residencial.
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h> // ArduinoJson v6 ou v7

// -----------------------------------------------------------------------------
// CONFIGURAÇÕES DE REDE WI-FI
// -----------------------------------------------------------------------------
const char* WIFI_SSID     = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";

// -----------------------------------------------------------------------------
// CREDENCIAIS E ENDPOINT SEGURO DO BACKEND (SUPABASE)
// -----------------------------------------------------------------------------
// Ex: https://xyzcompany.supabase.co
const char* SUPABASE_URL   = "https://seu-projeto.supabase.co"; 
const char* SUPABASE_ANON  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Chave pública anônima

// Identificação exclusiva do dispositivo físico associado ao apartamento
const char* DEVICE_UID     = "ESP32-APT-101";
const char* DEVICE_TOKEN   = "dbsound_token_101_secure";

// -----------------------------------------------------------------------------
// DEFINIÇÃO DE PINOS DE HARDWARE
// -----------------------------------------------------------------------------
#define PIN_SENSOR_SALA     34  // Canal 1
#define PIN_SENSOR_QUARTO   35  // Canal 2
#define PIN_SENSOR_COZINHA  32  // Canal 3

#define PIN_LED_ALERTA      2   // LED indicador visual
#define PIN_BUZZER          4   // Buzzer piezo sonoro

// -----------------------------------------------------------------------------
// PARÂMETROS DE AMOSTRAGEM E ACÚSTICA
// -----------------------------------------------------------------------------
const int SAMPLE_WINDOW_MS       = 50;   // Janela de amostragem por leitura (50 ms)
const float CALIBRATION_OFFSET   = 38.0; // Offset de calibração em dB SPL
const float CRITICAL_THRESHOLD   = 80.0; // Limiar para disparo de alarme local (dB)
const unsigned long MIN_DURATION = 3000; // 3 segundos sustentados para soar buzzer
const unsigned long COOLDOWN_MS  = 60000;// 60 segundos de silêncio do buzzer após disparo

// Intervalos de temporização
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 5000; // Envia telemetria a cada 5 segundos

// Estado do Alerta Local
unsigned long highNoiseStartTime = 0;
unsigned long lastBuzzerAlertTime = 0;
bool isAlertActive = false;

// -----------------------------------------------------------------------------
// PROTÓTIPOS DE FUNÇÕES
// -----------------------------------------------------------------------------
void setupWiFi();
void checkWiFiConnection();
float readMax9814Decibels(int pin);
void sendTelemetry(int channel, float decibels);
void handleLocalAlert(float maxDecibels);

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[dBSound] Inicializando Firmware ESP32...");
  Serial.printf("[dBSound] Dispositivo: %s\n", DEVICE_UID);

  // Configurar pinos
  pinMode(PIN_SENSOR_SALA, INPUT);
  pinMode(PIN_SENSOR_QUARTO, INPUT);
  pinMode(PIN_SENSOR_COZINHA, INPUT);

  pinMode(PIN_LED_ALERTA, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  digitalWrite(PIN_LED_ALERTA, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // Calibrar resolução do ADC para 12 bits (0 a 4095) e atenuação para 3.3V
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Inicializar conexão Wi-Fi
  setupWiFi();

  Serial.println("[dBSound] Setup concluído. Iniciando telemetria contínua.");
}

// =============================================================================
// LOOP PRINCIPAL
// =============================================================================
void loop() {
  // Garantir conectividade resiliente com reconexão automática
  checkWiFiConnection();

  // 1. Efetuar amostragem dos 3 canais de sensores MAX9814
  float dbSala    = readMax9814Decibels(PIN_SENSOR_SALA);
  float dbQuarto  = readMax9814Decibels(PIN_SENSOR_QUARTO);
  float dbCozinha = readMax9814Decibels(PIN_SENSOR_COZINHA);

  float maxCurrentDb = max(dbSala, max(dbQuarto, dbCozinha));

  // 2. Processar Alarme Local (LED e Buzzer com Cooldown)
  handleLocalAlert(maxCurrentDb);

  // 3. Enviar telemetria periódica para a nuvem
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    Serial.printf("[Leituras] Sala: %.1f dB | Quarto: %.1f dB | Cozinha: %.1f dB\n",
                  dbSala, dbQuarto, dbCozinha);

    // Envio seguro dos 3 canais
    sendTelemetry(1, dbSala);
    sendTelemetry(2, dbQuarto);
    sendTelemetry(3, dbCozinha);
  }

  delay(20);
}

// =============================================================================
// FUNÇÃO DE LEITURA E CONVERSÃO RMS PARA dB SPL DO MAX9814
// =============================================================================
float readMax9814Decibels(int pin) {
  unsigned long startMillis = millis();
  unsigned int signalMax = 0;
  unsigned int signalMin = 4095;

  // Janela de coleta de picos pico-a-pico (Peak-to-Peak)
  while (millis() - startMillis < SAMPLE_WINDOW_MS) {
    unsigned int sample = analogRead(pin);
    if (sample > signalMax) signalMax = sample;
    if (sample < signalMin) signalMin = sample;
  }

  unsigned int peakToPeak = signalMax - signalMin;

  // Converter valor ADC em tensão (0 a 3.3V)
  float volts = (peakToPeak * 3.3) / 4095.0;

  // Aproximação logarítmica quantitativa calibrada para SPL (dBA ponderado)
  if (volts <= 0.01) volts = 0.01;
  float estimatedDb = 20.0 * log10(volts / 0.005) + CALIBRATION_OFFSET;

  // Limites operacionais realistas residenciais (35 a 115 dB)
  return constrain(estimatedDb, 35.0, 115.0);
}

// =============================================================================
// ALERTA LOCAL (LED + BUZZER COM DURAÇÃO MÍNIMA E COOLDOWN)
// =============================================================================
void handleLocalAlert(float maxDecibels) {
  unsigned long now = millis();

  if (maxDecibels >= CRITICAL_THRESHOLD) {
    // Ruído crítico detectado
    digitalWrite(PIN_LED_ALERTA, HIGH); // LED pisca/acende de imediato como aviso

    if (highNoiseStartTime == 0) {
      highNoiseStartTime = now;
    } else {
      // Verificar se o ruído ultrapassou a duração mínima sustentada (ex: 3s)
      if ((now - highNoiseStartTime >= MIN_DURATION) && !isAlertActive) {
        // Verificar tempo de cooldown para não atormentar moradores continuamente
        if (now - lastBuzzerAlertTime >= COOLDOWN_MS || lastBuzzerAlertTime == 0) {
          Serial.println("[ALERTA LOCAL] Ruído crítico sustentado! Acionando Buzzer.");
          isAlertActive = true;
          lastBuzzerAlertTime = now;

          // Beep intermitente de alerta local (3 beeps curtos)
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
    // Ruído normalizou: reseta gatilho de duração
    highNoiseStartTime = 0;
    isAlertActive = false;
    digitalWrite(PIN_LED_ALERTA, LOW);
    digitalWrite(PIN_BUZZER, LOW);
  }
}

// =============================================================================
// ENVIO SEGURO DE TELEMETRIA VIA SUPABASE RPC (ingest_reading)
// =============================================================================
void sendTelemetry(int channel, float decibels) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi desconectado. Abortando envio.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Em produção comercial, use o certificado SSL CA da Supabase

  HTTPClient http;
  String endpoint = String(SUPABASE_URL) + "/rest/v1/rpc/ingest_reading";

  if (!http.begin(client, endpoint)) {
    Serial.println("[HTTP] Falha ao inicializar conexão HTTPS.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON);

  // Montar payload JSON seguro sem expor chaves administrativas
  StaticJsonDocument<256> doc;
  doc["p_device_uid"]   = DEVICE_UID;
  doc["p_device_token"] = DEVICE_TOKEN;
  doc["p_channel"]      = channel;
  doc["p_decibel"]      = decibels;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);

  if (httpCode == HTTP_CODE_OK || httpCode == 201) {
    // Sucesso
  } else {
    Serial.printf("[HTTP] Erro ao enviar Canal %d: Código %d\n", channel, httpCode);
  }

  http.end();
}

// =============================================================================
// GERENCIAMENTO E RECONEXÃO WI-FI
// =============================================================================
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
    if (millis() - lastRetry > 10000) { // Tenta reconectar a cada 10 segundos
      lastRetry = millis();
      Serial.println("[Wi-Fi] Tentando reconexão...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
  }
}
