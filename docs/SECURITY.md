# Diretrizes de Segurança, Privacidade e Conformidade LGPD — dBSound

A segurança da informação e a privacidade dos moradores são pilares centrais do **dBSound**. Este documento sintetiza os controles técnicos implementados contra invasão, espionagem ou vazamento de dados.

---

## 1. Princípio da Não Captação de Áudio (Privacy by Design)

O sistema foi arquitetado segundo as seguintes garantias físicas e lógicas:
1. **Sem Gravação ou Streaming de Áudio**: Nem o microcontrolador ESP32 nem qualquer servidor no backend possuem rotinas para gravar amostras contínuas de som ou arquivos WAV/MP3.
2. **Amostragem em Memória Volátil**: O microfone MAX9814 tem sua tensão lida em janelas ultracurtas (50ms). Calcula-se a amplitude pico-a-pico, converte-se em decibéis aproximados e descarta-se a amostra bruta da memória RAM do ESP32.
3. **Conformidade LGPD**: Os decibéis armazenados representam apenas telemetria física quantitativa do ambiente, resguardando integralmente o direito à intimidade e à vida privada (Art. 5º, X da CF/88 e Lei 13.709/2018).

---

## 2. Isolamento de Dados por Row Level Security (RLS)

O banco de dados PostgreSQL aplica RLS ativo em todas as tabelas:
- **Morador**:
  - Consegue ler e manipular unicamente registros associados ao seu próprio `apartment_id` e seu próprio perfil `auth.uid()`.
  - Tentativas de consultar medições ou eventos de apartamentos vizinhos resultam em 0 registros ou erro imediato de permissão.
- **Síndico / Administrador**:
  - Possui acesso aos dados dos apartamentos do seu condomínio (`condominium_id`).
  - Não possui visibilidade de condomínios de terceiros.

---

## 3. Gestão de Credenciais e Segredos

- **Proibição de Service Role Key em Clientes**: A chave mestra administrativa do Supabase (`service_role`) é terminantemente proibida de figurar no app Android, no código Web e no firmware do ESP32.
- **Ingestão Segura de Hardware via RPC**:
  - Cada ESP32 possui um identificador único `device_uid` e um `secret_token` criptograficamente seguro.
  - A função PostgreSQL `ingest_reading()` roda com `SECURITY DEFINER`, autentica o token do dispositivo, valida que ele pertence àquele apartamento e grava a leitura. O microcontrolador não recebe privilégios de gravação direta na tabela.
- **Proteção de Repositório**:
  - Arquivos contendo segredos reais (`.env`) estão listados no `.gitignore` e não devem ser versionados.
  - O repositório disponibiliza apenas [.env.example](file:///C:/Users/Victor%20Mateus/Documents/DBaudio/.env.example).

---

## 4. Comunicação Criptografada

- Toda a comunicação entre o ESP32, o Dashboard Web e o aplicativo Android utiliza **HTTPS/TLS 1.3** e conexões Websockets seguras (**WSS**).
