# Como Testar o Aplicativo dBSound (Android & Web)

Você possui **3 formas práticas** de testar e demonstrar o aplicativo do morador:

---

## Opção 1: Teste Imediato no Navegador (Simulador Mobile Interativo)

Para testar agora mesmo sem precisar abrir emulador ou compilar:

1. Inicie o servidor do painel Web:
   ```powershell
   cd "C:\Users\Victor Mateus\Documents\DBaudio\web"
   npm run dev
   ```
2. Abra o navegador em: [http://localhost:3000](http://localhost:3000).
3. Na barra lateral esquerda (ou na tela de Login), clique no botão **Morador**.
4. O sistema carregará a **visão do aplicativo do morador em uma moldura de smartphone interativa**:
   - **Medidor Decibélico**: Medição em tempo real com indicador circular grande.
   - **Status Cromático**: 🟢 Normal, 🟡 Atenção e 🔴 Ruído Elevado.
   - **Histórico**: Abas de episódios sonoros e métricas das últimas 24h.
   - **Nova Ocorrência**: Formulário com envio anônimo e aviso de privacidade LGPD.
   - **Alerta Crítico**: Abra uma segunda aba em *Laboratório & Testes* e clique em *Testar Alerta Crítico (95 dB)*. A tela do celular disparará imediatamente o modal **"ALERTA!! RUÍDO ALTO DETECTADO"** com os botões **Ignorar** e **Baixar som / Ver orientações**.

---

## Opção 2: Testar no Android Studio (Emulador ou Celular USB)

O código nativo do app em Kotlin + Jetpack Compose já está pronto com todas as configurações locais:

1. Abra o **Android Studio** (instalado no seu computador em `C:\Program Files\Android\Android Studio`).
2. Clique em **File > Open** e selecione a pasta:
   ```text
   C:\Users\Victor Mateus\Documents\DBaudio\android
   ```
3. Aguarde o Android Studio sincronizar o Gradle (o arquivo `local.properties` já aponta para o seu Android SDK).
4. Para rodar:
   - **No Celular Físico**: Conecte o aparelho via cabo USB, ative a *Depuração USB* nas opções de desenvolvedor do Android.
   - **No Emulador**: Abra o *Device Manager* no Android Studio e inicie um emulador virtual (ex: Pixel 8 com API 34 ou 35).
5. Clique no botão verde de **Run (Shift + F10)**. O aplicativo será compilado e aberto na tela do dispositivo.

---

## Opção 3: Gerar e Instalar o APK pelo Terminal

Para gerar o instalador `.apk` direto pelo terminal:

1. No terminal, acesse a pasta `android`:
   ```powershell
   cd "C:\Users\Victor Mateus\Documents\DBaudio\android"
   .\gradlew.bat assembleDebug
   ```
2. O APK será gerado em:
   ```text
   android\app\build\outputs\apk\debug\app-debug.apk
   ```
3. Se estiver com o celular plugado no USB com depuração ativa:
   ```powershell
   "C:\Users\Victor Mateus\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r "app\build\outputs\apk\debug\app-debug.apk"
   ```
   Ou copie o arquivo `app-debug.apk` para o celular e toque nele para instalar.

---

## Opção 4: Executar a Bateria de Testes Automatizados

Para validar matematicamente os 6 cenários (silêncio 40 dB, lei do silêncio 65 dB, debounce de picos curtos 95 dB x 1s, ruído sustentado 95 dB x 5s e isolamento por RLS):

```powershell
node "C:\Users\Victor Mateus\Documents\DBaudio\tests\run_tests.cjs"
```
Resultado: **6/6 testes aprovados (100%)**.
