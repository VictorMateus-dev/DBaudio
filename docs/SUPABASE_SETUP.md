# Guia de Configuração do Supabase — dBSound

Este guia orienta o passo a passo para inicializar o backend do **dBSound** em um novo projeto Supabase ou ambiente PostgreSQL gerenciado.

---

## 1. Criar o Projeto no Supabase

1. Acesse o [Supabase Console](https://supabase.com/dashboard) e crie um novo projeto.
2. Defina o nome do projeto (ex: `dbsound-prod`) e escolha uma região adequada (ex: `São Paulo - sa-east-1`).
3. Anote a **URL do Projeto** (`Project URL`) e a **Chave Pública Anônima** (`anon key`), disponíveis em **Project Settings > API**.

> [!CAUTION]
> NUNCA compartilhe ou coloque a **Service Role Key** (`service_role`) no código-fonte do cliente Web, no app Android ou no firmware do ESP32. O sistema foi integralmente construído para operar de forma segura usando a chave anônima com RLS e RPCs com `SECURITY DEFINER`.

---

## 2. Aplicar as Migrations SQL

No painel do Supabase, acesse a aba **SQL Editor** e execute os scripts na ordem:

### Passo 1: Executar a Migration 01 (Esquema Relacional, RLS e Índices)
Abra o arquivo [20260911000001_initial_schema.sql](file:///C:/Users/Victor%20Mateus/Documents/DBaudio/supabase/migrations/20260911000001_initial_schema.sql), copie todo o conteúdo e execute no SQL Editor.

O que este script cria:
- Extensões `uuid-ossp` e `pgcrypto`.
- Tabelas: `condominiums`, `buildings`, `apartments`, `profiles`, `devices`, `sensors`, `noise_policies`, `noise_readings`, `noise_events`, `alerts`, `occurrences`, `occurrence_comments`.
- Índices otimizados para buscas temporais por apartamento.
- Políticas de Row Level Security (RLS) para isolamento por unidade e papel (morador vs síndico).
- Publicação no `supabase_realtime`.

### Passo 2: Executar a Migration 02 (Pipeline Único e Trigger de Ruído)
Abra o arquivo [20260911000002_noise_pipeline_engine.sql](file:///C:/Users/Victor%20Mateus/Documents/DBaudio/supabase/migrations/20260911000002_noise_pipeline_engine.sql), copie todo o conteúdo e execute no SQL Editor.

O que este script cria:
- Stored Procedure `public.ingest_reading()` para recepção autenticada de telemetria dos ESP32 via token de hardware.
- Trigger `trg_process_noise_reading` associado à tabela `noise_readings`, que processa leituras, consulta políticas diurnas/noturnas, agrega episódios em `noise_events` e dispara `alerts`.
- Função `public.cleanup_test_data()` para purga segura de dados marcados como `is_test_data = true`.

### Passo 3: Executar o Seed (Dados Iniciais de Demonstração)
Abra o arquivo [seed.sql](file:///C:/Users/Victor%20Mateus/Documents/DBaudio/supabase/seed.sql), copie todo o conteúdo e execute no SQL Editor.

O que este script popula:
- Condomínio "Residencial dBSound", Bloco A.
- Apartamentos 101, 102, 103, 201, 202, 203, 301, 302, 303.
- Políticas Diurna (07h às 22h, limite 70 dB) e Noturna (22h às 07h, limite 60 dB).
- Usuários e perfis demonstrativos (Síndico e Moradores).
- 9 Dispositivos ESP32 e 27 sensores cadastrados com tokens de autenticação exclusivos.
- Ocorrências de exemplo com comentários e histórico.

---

## 3. Validar com a Suíte de Testes SQL

Para comprovar que o pipeline e as regras de RLS estão operando com 100% de sucesso, execute o arquivo:
[rls_and_pipeline_tests.sql](file:///C:/Users/Victor%20Mateus/Documents/DBaudio/supabase/tests/rls_and_pipeline_tests.sql)

O console do SQL Editor emitirá:
```text
NOTICE: ✅ [PASSOU] Cenário 1: Leitura de 40 dB mantida em silêncio...
NOTICE: ✅ [PASSOU] Cenário 3: Ruído transitório de 95 dB (1s) não disparou alerta...
NOTICE: ✅ [PASSOU] Cenário 4: Ruído sustentado gerou com sucesso: reading -> event -> alert...
NOTICE: ✅ [PASSOU] Ingestão Segura ESP32: Token autenticado...
NOTICE: TODOS OS TESTES AUTOMATIZADOS DO PIPELINE PASSARAM COM SUCESSO!
```

---

## 4. Configurar Variáveis no Frontend

No diretório `web/`, crie um arquivo `.env` baseado no `.env.example`:
```ini
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```
Ao iniciar o Dashboard Web (`npm run dev`), o sistema se conectará automaticamente à instância remota em tempo real via Websockets!
