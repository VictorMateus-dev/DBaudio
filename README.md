# dBSound — Monitoramento Inteligente de Ruído Residencial

Sistema profissional, completo e ponta a ponta para **monitoramento acústico predial, detecção em tempo real de ruído elevado e gestão condominial inteligente**, com estrito respeito à privacidade dos moradores (sem gravação ou transmissão de áudio, apenas telemetria quantitativa em dB SPL).

---

## 🏛️ Visão Geral do Sistema

O **dBSound** é composto por:
1. **Dashboard Web Síndico/Admin**: Desenvolvido em React 18, TypeScript, Vite e Tailwind CSS, contendo painel executivo com gráficos acústicos, planta interativa dos apartamentos (101 a 303), gestão completa de ocorrências e um **Laboratório / Simulador de Ruído** em tempo real.
2. **Aplicativo Android Morador**: Desenvolvido em Kotlin e Jetpack Compose com Material 3, ViewModel, StateFlow e arquitetura limpa, apresentando medidor decibélico em tempo real, curva das últimas 24h, histórico de episódios sonoros, registro de ocorrências anônimas e modais de alerta com orientações de boa convivência.
3. **Backend Supabase / PostgreSQL**: Migrations completas com tabelas relacionais, índices de alta performance, Row Level Security (RLS) minuciosa por apartamento e condomínio, publicação Realtime e um **Pipeline Único de Processamento** via trigger PostgreSQL.
4. **Firmware ESP32 + 3x Sensores MAX9814**: Código C++/Arduino para amostragem analógica de 3 canais (Sala, Quarto e Cozinha), conversão Peak-to-Peak para dB SPL, reconexão Wi-Fi resiliente, alerta local (LED + Buzzer com cooldown) e ingestão segura via RPC.
5. **Suíte de Testes Automatizados**: Scripts cobrindo integralmente os Cenários 1 a 6 (40 dB silencioso, 65 dB diurno/noturno, debounce de 95 dB transitório, 95 dB sustentado gerando alerta, e isolamento de RLS entre apartamentos).

---

## 📁 Estrutura do Repositório

```text
DBaudio/
├── supabase/
│   ├── migrations/
│   │   ├── 20260911000001_initial_schema.sql         # Esquema relacional, índices, RLS e Realtime
│   │   └── 20260911000002_noise_pipeline_engine.sql   # Trigger do pipeline único, agrupador e RPC segura
│   ├── seed.sql                                       # Seed com apartamentos 101-303, dispositivos e usuários
│   └── tests/
│       └── rls_and_pipeline_tests.sql                 # Suíte de testes SQL executável no Supabase
├── web/                                               # Dashboard Web (React + TypeScript + Vite + Tailwind)
│   ├── src/
│   │   ├── components/                                # FloorPlanGrid, NoiseChart, StatCard, Header, Sidebar
│   │   ├── contexts/                                  # AuthContext e gerenciamento de perfis
│   │   ├── lib/                                       # Supabase Client e DataService com store reativo
│   │   ├── pages/                                     # Overview, FloorPlan, ApartmentDetail, Occurrences, SimulatorLab
│   │   └── types/                                     # Tipagem estrita TypeScript do banco
│   ├── package.json
│   └── vite.config.ts
├── android/                                           # Aplicativo Android (Kotlin + Jetpack Compose + Material 3)
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml
│   │   └── java/com/dbsound/app/
│   │       ├── data/                                  # Models e Repositórios (NoiseRepository, OccurrenceRepository)
│   │       ├── navigation/                            # Grafo de navegação e telas
│   │       └── presentation/                          # Compose Screens: Home, Alerts, History, Occurrences, Profile, Privacy
│   ├── build.gradle.kts
│   └── settings.gradle.kts
├── firmware_esp32/                                    # Firmware ESP32 com 3x MAX9814
│   ├── dbsound_esp32.ino                              # Amostragem analógica, RMS, alerta LED/Buzzer e REST seguro
│   └── README.md                                      # Esquema de ligação, pinout e calibração
├── docs/                                              # Documentação Técnica Especializada
│   ├── ARCHITECTURE.md
│   ├── SUPABASE_SETUP.md
│   ├── ESP32_SETUP.md
│   ├── SIMULATOR.md
│   ├── TESTING.md
│   └── SECURITY.md
├── tests/
│   └── run_tests.cjs                                  # Test runner automatizado dos Cenários 1 a 6
├── .env.example
└── README.md
```

---

## 🚀 Como Iniciar Rapidamente

### 1. Executar Testes Automatizados
```bash
node tests/run_tests.cjs
```

### 2. Rodar o Dashboard Web
```bash
cd web
npm run dev
```
Abra o navegador em `http://localhost:3000`. O sistema já conta com dados demonstrativos em memória e alternador rápido entre visão de Síndico e Morador.

### 3. Conectar ao Supabase em Produção
Siga o guia detalhado em [SUPABASE_SETUP.md](file:///C:/Users/Victor%20Mateus/Documents/DBaudio/docs/SUPABASE_SETUP.md).

---

## 🔒 Princípios de Segurança e Privacidade (LGPD)

- **Áudio Nunca é Gravado**: O sistema processa apenas amplitudes pontuais em dB SPL na memória volátil do microcontrolador.
- **Isolamento Estrito por RLS**: Moradores só leem ou alteram dados do seu próprio apartamento. O síndico visualiza apenas os apartamentos pertencentes ao seu condomínio.
- **Zero Secrets no Cliente**: Dispositivos IoT e clientes web nunca recebem chaves com poderes de `service_role`.
