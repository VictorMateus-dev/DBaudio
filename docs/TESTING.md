# Guia de Testes Automatizados e Homologação — dBSound

Este documento descreve a metodologia e a execução dos testes automatizados que cobrem os requisitos funcionais e não funcionais do sistema **dBSound**.

---

## 1. Suíte de Testes Automatizados (Cenários 1 a 6)

O sistema conta com um runner automatizado em Node.js localizado em [tests/run_tests.cjs](file:///C:/Users/Victor%20Mateus/Documents/DBaudio/tests/run_tests.cjs) e um script SQL para execução direta no banco PostgreSQL em [supabase/tests/rls_and_pipeline_tests.sql](file:///C:/Users/Victor%20Mateus/Documents/DBaudio/supabase/tests/rls_and_pipeline_tests.sql).

### Como Executar os Testes
No terminal do projeto, execute:
```bash
node tests/run_tests.cjs
```

---

## 2. Detalhamento dos Cenários Validados

### Cenário 1: Leitura Silenciosa de 40 dB
- **Entrada**: Injeção de 40.0 dB no Apto 101.
- **Comportamento Esperado**: A telemetria é registrada como baseline acústico normal. Nenhum registro é criado em `noise_events` e nenhum alerta é inserido em `alerts`.
- **Status**: ✅ **PASSOU** (100% aderente).

### Cenário 2: Leitura de 65 dB com Variação Diurna/Noturna
- **Entrada**: 65.0 dB avaliado às 14:00 (período diurno) e às 23:00 (período noturno).
- **Comportamento Esperado**: 
  - No horário diurno (limite 70 dB): classificado como `normal`.
  - No horário noturno (limite 60 dB): classificado como `warning` (atenção/lei do silêncio).
- **Status**: ✅ **PASSOU** (100% aderente).

### Cenário 3: Ruído Transitório de 95 dB (< 3 segundos)
- **Entrada**: Pico sonoro de 95.0 dB com duração de apenas 1 segundo.
- **Comportamento Esperado**: Um registro preliminar de evento é iniciado, mas **nenhum alerta é enviado**, pois a duração mínima estipulada (`min_duration_seconds = 3`) não foi superada. Evita alarmes falsos de palmas ou objetos caindo.
- **Status**: ✅ **PASSOU** (100% aderente).

### Cenário 4: Ruído Sustentado de 95 dB (> 3 segundos)
- **Entrada**: Sequência de leituras consecutivas (94 dB, 96 dB, 95.5 dB) totalizando mais de 3 segundos sustentados.
- **Comportamento Esperado**: O evento existente é atualizado agregando média e pico, a duração mínima é superada e um registro de severidade `critical` é emitido em `alerts`, replicando imediatamente no Realtime para os clientes.
- **Status**: ✅ **PASSOU** (100% aderente).

### Cenário 5: Morador A tentando acessar Apartamento B (RLS)
- **Entrada**: Requisição autenticada com UID do Morador do Apto 101 tentando consultar ou inserir dados pertencentes ao Apto 102.
- **Comportamento Esperado**: O PostgreSQL aplica a regra de Row Level Security (`apartment_id = auth.current_user_apartment_id()`), bloqueando a leitura ou retornando 0 linhas / `permission denied`.
- **Status**: ✅ **PASSOU** (100% aderente).

### Cenário 6: Administrador acessando seu Condomínio
- **Entrada**: Usuário com perfil `admin` do Condomínio A consultando apartamentos e ocorrências da sua unidade predial.
- **Comportamento Esperado**: Acesso concedido a todas as unidades pertencentes ao seu condomínio, garantindo a gestão global pelo síndico.
- **Status**: ✅ **PASSOU** (100% aderente).

---

## 3. Testes de Build e Integração dos Frontends

- **Dashboard Web**: Compilado com sucesso via `npm run build` gerando bundle estático otimizado na pasta `web/dist`.
- **App Android**: Estrutura validada em conformidade com o Gradle 8.7 e Kotlin 2.0.
