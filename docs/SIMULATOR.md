# Manual do Simulador e Laboratório de Ruído — dBSound

O **Laboratório / Simulador de Ruído** é uma funcionalidade integrada no Dashboard Web projetada para demonstrar, validar e auditar o comportamento do sistema sem a necessidade imediata de microcontroladores físicos operando.

---

## 1. Como Acessar o Laboratório

1. No Dashboard Web, clique na opção **Laboratório & Testes** na barra de navegação esquerda.
2. Ou na página inicial do Síndico, clique no botão superior **Abrir Simulador de Ruído**.

---

## 2. Parâmetros Disponíveis

No painel de controle do simulador, você pode definir:
- **Apartamento Alvo**: Escolha qualquer uma das unidades cadastradas (101 a 303).
- **Sensor Alvo**: Selecione o sensor correspondente (Sala, Quarto ou Cozinha).
- **Origem da Leitura**:
  - `simulation`: Injeta como dados de simulação (`is_test_data = true`).
  - `manual`: Injeta como leitura de vistoria/medição manual.
- **Intensidade Sonora (dB SPL)**:
  - Botões rápidos: `40 dB (Silêncio)`, `65 dB (Conversa)`, `70 dB (Limite Diurno)`, `80 dB (Música/Aspirador)`, `95 dB (Festa/Furadeira)`.
  - Slider customizado: Controle contínuo de 35.0 dB a 105.0 dB.

---

## 3. Modos de Operação

### A. Leitura Única Pontual
Clique no botão **Injetar Leitura Única** ou em um dos botões rápidos (ex: 40 dB).
- Se o valor for menor que o limiar de atenção da política vigente, nada de anômalo acontece.
- Se for um valor alto isolado por 1 segundo (ex: 95 dB), o evento é aberto, mas **nenhum alerta prematuro é disparado**, respeitando o debounce de duração mínima (Cenário 3).

### B. Simulação Contínua
Clique no botão **Iniciar Simulação Contínua**.
- O motor do simulador passa a emitir leituras a cada 1,5 segundos com variação natural acústica (jitter) em torno do valor selecionado.
- Os gráficos de onda e a planta dos apartamentos atualizam-se instantaneamente em tempo real.
- Clique em **Parar Simulação Contínua** para cessar as emissões.

### C. Bateria de Cenários de Teste Rápidos
Na lateral direita da tela, você encontra acionadores automatizados:
1. **Testar Alerta Crítico (95 dB x 5s)**: Injeta uma sequência de ruído severo que ultrapassa a duração mínima exigida pela política e dispara o alerta vermelho com notificação em tempo real.
2. **Testar Dispositivo Offline**: Simula a queda de sinal do microcontrolador e muda o status para `⚫ Offline` na planta predial.
3. **Testar Ruído Pontual (Sem Alerta)**: Injeta um pico transitório de 95 dB por 1 único segundo, demonstrando visualmente que o sistema não gera alarmes falsos para palmas ou queda de objetos.

---

## 4. Limpeza Segura dos Dados de Teste

Clique no botão **Limpar Dados de Teste** no canto superior direito:
- O sistema invoca a função `public.cleanup_test_data()`.
- Apenas as leituras com `is_test_data = true` e os eventos de simulação são expurgados do banco de dados.
- Telemetrias reais emitidas por dispositivos físicos nunca são afetadas.
