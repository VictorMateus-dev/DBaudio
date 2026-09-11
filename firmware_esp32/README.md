# Firmware dBSound — ESP32 + 3x Sensores MAX9814

Este diretório contém o código-fonte C++/Arduino para o microcontrolador **ESP32**, responsável pela telemetria acústica residencial de cada apartamento.

---

## 1. Esquema de Ligação dos Pinos (Pinout)

| Componente | Pino do Componente | Pino no ESP32 | Função |
| :--- | :--- | :--- | :--- |
| **Sensor 1 (Sala)** | `OUT` | **GPIO 34** (ADC1_CH6) | Entrada Analógica |
| | `VCC` | 3.3V | Alimentação |
| | `GND` | GND | Terra comum |
| | `GAIN` | 3.3V (ou flutuante) | Ganho 40dB / 50dB |
| **Sensor 2 (Quarto)** | `OUT` | **GPIO 35** (ADC1_CH7) | Entrada Analógica |
| | `VCC` | 3.3V | Alimentação |
| | `GND` | GND | Terra comum |
| **Sensor 3 (Cozinha)**| `OUT` | **GPIO 32** (ADC1_CH4) | Entrada Analógica |
| | `VCC` | 3.3V | Alimentação |
| | `GND` | GND | Terra comum |
| **LED Indicador** | Ânodo (+) | **GPIO 2** (via resistor 220Ω) | Alerta Visual |
| | Cátodo (-) | GND | Terra |
| **Buzzer Piezo** | Positivo (+) | **GPIO 4** | Alerta Sonoro Local |
| | Negativo (-) | GND | Terra |

> [!NOTE]
> Os pinos GPIO 32, 34 e 35 pertencem ao **ADC1** do ESP32. É fundamental utilizar pinos do ADC1 porque o ADC2 fica desabilitado no ESP32 quando o módulo Wi-Fi está em operação.

---

## 2. Diagrama de Conexão do Circuito

```text
       ESP32 NodeMCU DevKit
      +---------------------+
      |                     |
3.3V -+ VCC                 |
 GND -+ GND                 |
      |                     |
      |   GPIO 34 (ADC1_6)  | <--- OUT [ MAX9814 - Sensor 1 (Sala) ]
      |   GPIO 35 (ADC1_7)  | <--- OUT [ MAX9814 - Sensor 2 (Quarto) ]
      |   GPIO 32 (ADC1_4)  | <--- OUT [ MAX9814 - Sensor 3 (Cozinha) ]
      |                     |
      |   GPIO 2 (Digital)  | ---> [ Resistor 220Ω ] ---> [ LED Alerta ] ---> GND
      |   GPIO 4 (Digital)  | ---> [ Buzzer Piezoelétrico ] -------------> GND
      +---------------------+
```

---

## 3. Segurança e Privacidade no Hardware

1. **Sem Gravação de Voz ou Áudio**: O sinal de áudio do microfone de eletreto é amostrado em janelas de 50ms na memória volátil RAM. Calcula-se a amplitude pico-a-pico (Peak-to-Peak) e converte-se em decibéis aproximados (dB SPL). O áudio analógico nunca é gravado ou transmitido.
2. **Nenhuma Service Role Key**: O ESP32 utiliza apenas a chave anônima pública `anon_key` e seu próprio par `device_uid` + `secret_token` exclusivo do apartamento.
3. **Validação Rígida no Servidor**: A stored procedure `rpc/ingest_reading` valida o vínculo entre o dispositivo e o apartamento no Supabase. O ESP32 não consegue forjar dados para outra unidade residencial.

---

## 4. Como Gravar o Firmware no ESP32

1. Instale o **Arduino IDE** (ou extensão PlatformIO no VS Code).
2. Adicione a URL de placas ESP32 nas preferências do Arduino IDE:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Instale a biblioteca **ArduinoJson** (versão 6 ou 7) através do Gerenciador de Bibliotecas.
4. Abra o arquivo `dbsound_esp32.ino`.
5. Preencha as credenciais no início do código:
   - `WIFI_SSID` e `WIFI_PASSWORD`
   - `SUPABASE_URL` e `SUPABASE_ANON`
   - `DEVICE_UID` e `DEVICE_TOKEN` (definidos no `seed.sql`)
6. Selecione a placa **ESP32 Dev Module** e a porta COM correspondente.
7. Clique em **Upload**.
