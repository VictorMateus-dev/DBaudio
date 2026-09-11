# Guia de Configuração e Calibração do ESP32 — dBSound

Este documento descreve detalhadamente o processo de montagem física, calibração acústica e configuração do microcontrolador **ESP32** com os 3 módulos sensores **MAX9814**.

---

## 1. Lista de Materiais (BOM)

- 1x Módulo Microcontrolador ESP32 DevKit (30 ou 38 pinos).
- 3x Módulos de Microfone de Eletreto com Controle Automático de Ganho (AGC) **Maxim MAX9814**.
- 1x LED Difuso 5mm (Vermelho ou Amarelo).
- 1x Resistor 220Ω (para o LED).
- 1x Buzzer Ativo Piezoelétrico 3.3V / 5V.
- Cabos jumper fêmea-macho e protoboard (ou placa perfurada de circuito).
- Fonte de Alimentação Micro-USB 5V / 2A.

---

## 2. Pinagem e Montagem

| MAX9814 | ESP32 | Descrição |
| :--- | :--- | :--- |
| **Sensor 1 (Sala)** `OUT` | **GPIO 34** | Entrada Analógica ADC1 Canal 6 |
| **Sensor 2 (Quarto)** `OUT` | **GPIO 35** | Entrada Analógica ADC1 Canal 7 |
| **Sensor 3 (Cozinha)** `OUT` | **GPIO 32** | Entrada Analógica ADC1 Canal 4 |
| Todos `VCC` | **3.3V** | Alimentação regulada limpa |
| Todos `GND` | **GND** | Linha de terra comum |
| `GAIN` | Flutuante (ou 3.3V) | Ganho de 50 dB (ou 40 dB se 3.3V) |

| Periférico | ESP32 | Descrição |
| :--- | :--- | :--- |
| **LED Indicador** | **GPIO 2** | Saída digital via resistor 220Ω |
| **Buzzer** | **GPIO 4** | Saída digital para alerta local |

> [!IMPORTANT]
> O ESP32 possui dois blocos de conversores analógico-digitais: ADC1 e ADC2. No momento em que o rádio Wi-Fi é ligado, o **ADC2 torna-se inoperante**. Por essa razão, todos os sensores analógicos do dBSound estão estritamente mapeados nos canais do **ADC1** (GPIOs 32, 34 e 35).

---

## 3. Calibração Acústica

O cálculo de conversão no firmware utiliza amostragem pico-a-pico (Peak-to-Peak) em janelas de 50 milissegundos:

$$\text{Volts} = \frac{\text{ADC}_{\text{pico-a-pico}} \times 3.3\text{V}}{4095}$$

$$\text{dB SPL} \approx 20 \log_{10}\left(\frac{\text{Volts}}{0.005}\right) + \text{CALIBRATION\_OFFSET}$$

- O parâmetro `CALIBRATION_OFFSET` padrão no firmware é `38.0`.
- Para calibrar com precisão metrológica, utilize um decibelímetro de referência (ou aplicativo de smartphone calibrado em ambiente silencioso):
  1. Meça o nível ambiente (ex: 45 dB).
  2. Abra a Serial do ESP32 a 115200 baud.
  3. Ajuste o valor de `CALIBRATION_OFFSET` no código até que a média da Serial coincida com a leitura do instrumento de referência.

---

## 4. Segurança de Rede e Token de Dispositivo

No arquivo `firmware_esp32/dbsound_esp32.ino`:
1. Configure `WIFI_SSID` e `WIFI_PASSWORD`.
2. Configure `SUPABASE_URL` e `SUPABASE_ANON`.
3. Configure o `DEVICE_UID` (ex: `ESP32-APT-101`) e seu respectivo `DEVICE_TOKEN` correspondente registrado na tabela `devices` do condomínio.

O firmware envia a telemetria utilizando HTTPS POST contra a stored procedure:
```text
https://<projeto>.supabase.co/rest/v1/rpc/ingest_reading
```
Essa chamada é validada com autoridade no PostgreSQL, garantindo que nenhum dispositivo altere dados de outro apartamento.
