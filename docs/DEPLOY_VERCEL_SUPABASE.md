# Guia de Vinculação: Supabase + Vercel (dBSound)

Este guia orienta passo a passo a ativação do banco de dados na nuvem (**Supabase**) e a publicação do painel web (**Vercel**).

---

## 1. Configurando o Banco de Dados no Supabase

### 1.1 Criar o Projeto
1. Acesse [https://supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **"New Project"**.
3. Preencha:
   - **Name**: `dbsound`
   - **Database Password**: crie uma senha segura e anote.
   - **Region**: selecione `São Paulo - South America (sa-east-1)` para menor latência no Brasil.
4. Aguarde cerca de 1 a 2 minutos até o banco ser provisionado.

### 1.2 Executar os Scripts SQL do Projeto
No menu lateral esquerdo do Supabase, clique no ícone **SQL Editor** (ou `New Query`) e execute os 3 arquivos na ordem:

1. **Estrutura (Tabelas, Enums e RLS)**:
   - Abra o arquivo [`supabase/migrations/20260911000001_initial_schema.sql`](../supabase/migrations/20260911000001_initial_schema.sql).
   - Copie todo o conteúdo, cole no SQL Editor e clique em **"Run"**.
2. **Motor de Ruído (RPC Ingest, Triggers e Realtime)**:
   - Abra o arquivo [`supabase/migrations/20260911000002_noise_pipeline_engine.sql`](../supabase/migrations/20260911000002_noise_pipeline_engine.sql).
   - Copie todo o conteúdo, cole no SQL Editor e clique em **"Run"**.
3. **Carga Inicial de Demonstração (Seed)**:
   - Abra o arquivo [`supabase/seed.sql`](../supabase/seed.sql).
   - Copie todo o conteúdo, cole no SQL Editor e clique em **"Run"**.

### 1.3 Obter as Chaves de Acesso
No menu lateral do Supabase:
1. Vá em **Project Settings** (ícone de engrenagem) > **API**.
2. Copie:
   - **Project URL** (exemplo: `https://abcdefghijkl.supabase.co`)
   - **Project API Keys** -> Chave **`anon` / `public`** (exemplo: `eyJhbGciOi...`)

> ⚠️ **Atenção de Segurança**: NUNCA copie nem use a chave `service_role` no frontend web ou Vercel. Use sempre a chave `anon`.

---

## 2. Hospedando o Dashboard no Vercel

### Opção Recomendada: Pelo Painel do Vercel (com GitHub)

1. Suba o projeto para o seu GitHub.
2. Acesse [https://vercel.com](https://vercel.com) e clique em **"Add New..."** > **"Project"**.
3. Selecione o repositório do projeto.
4. **Configuração Fundamental de Diretório**:
   - No campo **Root Directory**, clique em **Edit** e selecione a pasta:
     `web`
   - O Vercel detectará automaticamente o framework como **Vite**.
5. **Configurar as Variáveis de Ambiente (Environment Variables)**:
   - Expanda a seção **Environment Variables** e adicione:
     - `VITE_SUPABASE_URL` = sua Project URL do Supabase
     - `VITE_SUPABASE_ANON_KEY` = sua chave anon pública do Supabase
6. Clique em **"Deploy"**.
7. Pronto! Em menos de 1 minuto seu site estará online com domínio HTTPS gratuito (ex: `https://dbsound-dashboard.vercel.app`).

---

### Opção Alternativa: Pelo Terminal (Vercel CLI)

Se quiser subir direto do seu computador sem usar GitHub:
```powershell
cd "C:\Users\Victor Mateus\Documents\DBaudio\web"
npx vercel
```
- Siga as instruções no terminal para fazer login.
- Defina as variáveis de ambiente quando solicitado ou via comando:
  ```powershell
  npx vercel env add VITE_SUPABASE_URL production
  npx vercel env add VITE_SUPABASE_ANON_KEY production
  ```
- Para publicar a versão final:
  ```powershell
  npx vercel --prod
  ```

