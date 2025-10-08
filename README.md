# Testes de segurança

Este monorepo demonstra como estruturar, testar e operar uma aplicação full-stack com foco em segurança e observabilidade. A stack é composta por:

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Banco**: PostgreSQL
- **Cache / blacklist**: Redis
- **Proxy / TLS**: Nginx
- **Infra**: Docker / Docker Compose + GitHub Actions (CI/CD)

Além dos fluxos E2E usuais (cadastro, login, MFA, troca de senha, logout), o projeto cobre cenários de segurança como criptografia em repouso e em trânsito, prevenção de MITM (Man-In-The-Middle) em TLS autoassinado, rate limiting e audit logging estruturado.


---

## 🛠 Tecnologias e Recursos Principais

- **Node.js + Express**: API REST com bcrypt, JWT e integração PostgreSQL.
- **React + Vite**: SPA com AuthContext, SPA routing e formulários resilientes.
- **PostgreSQL**: Schema versionado (`db/init.sql`) com triggers para unicidade.
- **Redis**: Rate limit, blacklist de JWT e MFA cache.
- **AES‑256‑GCM em repouso**: Criptografia de telefone armazenado no banco.
- **AES‑256‑GCM em transporte**: Payloads sensíveis trafegam cifrados, mesmo sobre TLS autoassinado (camada simétrica compartilhada).
- **Pino + multistream**: Logger estruturado com redaction (evita tokens em log), saída em console + arquivo (`./logs/server/server.log` via volume).
- **Nginx**: Reverse proxy `/api → server-app:3000`, TLS com certificados autoassinados e cabeçalhos de segurança.
- **Docker / Docker Compose**: Ambientes isolados para produção e suites de testes.
- **GitHub Actions (CI)**: Lint/Prettier (front/server), build TypeScript (server), build de imagem Docker + Trivy (tabela e relatório JSON como artefato), Snyk (dependências Node com limiar de severidade "high" e artefato JSON) e Docker Bench Security via Docker Compose; usa concurrency com cancel-in-progress e publica artefatos.

---

## 🗂 Estrutura de Pastas

```text
.
├─ .github/workflows/ci.yml        # Pipeline CI: lint/build/scans/bench + artefatos
├─ db/
│  └─ init.sql                     # Schema inicial do PostgreSQL
├─ front/
│  ├─ Dockerfile                   # Build do front + Nginx (produção)
│  ├─ nginx.conf                   # Reverse proxy + TLS (certificados locais)
│  ├─ nginx.main.conf              # Configuração base do Nginx
│  ├─ package.json                 # Scripts de dev/build/lint/format
│  ├─ src/
│  │  ├─ api/
│  │  │  ├─ client.ts              # Axios + interceptors (camada AES-GCM)
│  │  │  └─ auth.ts                # Endpoints de auth (login/MFA/senha)
│  │  ├─ components/
│  │  │  ├─ Header.tsx             # Header com navegação/autenticação
│  │  │  ├─ PasswordInput.tsx      # Campo de senha com mostrar/ocultar
│  │  │  └─ PasswordRequirements.tsx # Checklist dinâmico de requisitos
│  │  ├─ contexts/
│  │  │  ├─ AuthContext.tsx        # Contexto de autenticação
│  │  │  └─ useAuth.ts             # Hook para consumir o contexto
│  │  ├─ layouts/
│  │  │  ├─ AppLayout.tsx          # Layout autenticado
│  │  │  └─ AuthLayout.tsx         # Layout de autenticação
│  │  ├─ pages/
│  │  │  ├─ DashboardPage.tsx      # Página protegida
│  │  │  └─ auth/
│  │  │     ├─ LoginPage.tsx       # Login + 2FA (SMS)
│  │  │     ├─ RegisterPage.tsx    # Cadastro com validação de senha forte
│  │  │     └─ ChangePasswordPage.tsx # Troca de senha
│  │  ├─ utils/
│  │  │  ├─ passwordRules.ts       # Regras de senha (compartilhadas)
│  │  │  └─ transportEncryption.ts # AES-GCM no front (transporte)
│  │  ├─ styles/                   # Theming e estilos globais
│  │  ├─ App.tsx                   # Composição de rotas/layouts
│  │  └─ main.tsx                  # Bootstrap da aplicação
│  └─ public/favicon.ico           # Ícone da aplicação
├─ server/
│  ├─ Dockerfile                   # Build da API (produção)
│  ├─ src/
│  │  ├─ index.ts                  # App Express + middlewares + rotas
│  │  ├─ configs/
│  │  │  ├─ db.ts                  # Conexão PostgreSQL
│  │  │  └─ redis.ts               # Conexão Redis (rate limit/blacklist)
│  │  ├─ controllers/
│  │  │  └─ user.controller.ts     # Fluxos de autenticação/usuário
│  │  ├─ middlewares/
│  │  │  ├─ authMiddleware.ts      # JWT + blacklist de tokens
│  │  │  ├─ errorHandler.ts        # Tratamento centralizado de erros
│  │  │  ├─ rateLimit.ts           # Rate limit baseado em Redis
│  │  │  ├─ transportEncryption.ts # AES-GCM (camada de transporte)
│  │  │  └─ validateBody.ts        # Validação de payload
│  │  ├─ routes/
│  │  │  ├─ index.ts               # Router raiz
│  │  │  └─ users.routes.ts        # Rotas de usuários/autenticação
│  │  ├─ services/
│  │  │  └─ sms.ts                 # Envio de SMS (mockável)
│  │  ├─ utils/
│  │  │  ├─ encryption.ts          # Criptografia em repouso (AES-GCM)
│  │  │  ├─ jwt.ts                 # Geração/validação de tokens JWT
│  │  │  ├─ logger.ts              # Logger Pino com redactions
│  │  │  └─ transportEncryption.ts # Helpers AES compartilhados
│  │  └─ types/express/index.d.ts  # Tipagens auxiliares (ex.: req.user)
├─ http/requests.http              # Exemplos REST (VSCode REST Client)
├─ logs/.gitignore                 # Mantém pasta de logs versionada
├─ docker-compose.yml              # Orquestração local (prod-like)
└─ docker-compose.ci.yml           # Orquestração para CI (bench/security)
```

---

## 🚀 Execução Local (Produção)

1. **Clonar repositório**

```bash
git clone https://github.com/arleysouza/2fa-atividade.git app
cd app
```

2. **Gerar certificados autoassinados**

O comando a seguir pode ser executado na pasta `app` para gerar as chaves em `front/certs`:

Bash (Linux/macOS/Git Bash):

```bash
mkdir -p front/certs
openssl genrsa -out front/certs/privkey.pem 2048
openssl req -x509 -nodes -days 365 -new -key front/certs/privkey.pem -out front/certs/fullchain.pem
```

Os certificados ficam no front porque é o Nginx (no container do front) que termina o TLS. O backend (“server-app”) roda atrás do proxy, falando HTTP apenas na rede Docker interna.  
O `server-app` não expõe porta no host e recebe chamadas via proxy do Nginx pela rede `app-network`. Simples e seguro: um único ponto de TLS, cabeçalhos de segurança e CSP no Nginx, e menos complexidade no Node.

3. **Subir a aplicação**

```bash
docker compose up --build -d
```

O `front-app` (Nginx) expõe:
- HTTPS: https://localhost:3443
- HTTP opcional: http://localhost:3002 (apenas para testes)

O `server-app` fica restrito à rede Docker (`app-network`); todo acesso passa pelo proxy.

Para encerrar:
```bash
docker compose down -v
```

---

## 🔐 Criptografia e Segurança

- **Repouso**: telefones são cifrados com AES-256-GCM antes de persistir no PostgreSQL (`server/src/utils/encryption.ts`).
- **Transporte**: requests/responses sensíveis via `/api` trafegam com payload cifrado (camada simétrica, usando cabeçalhos `X-Transport-Encrypted` e `X-Transport-Accept-Encrypted`). Isso protege mesmo quando TLS usa certificado autoassinado.
- **MFA**: login exige código enviado via SMS (integração Twilio simulável).
- **Rate Limit**: redis + middleware previnem força bruta.
- **Logging**: Pino grava JSON no stdout e em `./logs/server/app.log`, com redaction de tokens e headers confidenciais.
- **Triggers DB**: `check_unique_username()` agora ignora o próprio registro em updates (evita 23505 na troca de senha).

---

## 🔑 Formulários e UX

- **PasswordInput**: botão para revelar/ocultar senha, reduz erros de digitação.
- **PasswordRequirements**: checklist dinâmica (cinco requisitos) sempre visível; ícones mudam para verde/✔ conforme as regras são atendidas.
- **Validação**: botões “Criar conta” e “Alterar” só habilitam quando todas as regras são satisfeitas (mesmo antes de enviar).


---

## 📊 Logger Estruturado

- Configure variáveis (`LOG_DIRECTORY`, `LOG_FILE_NAME`, `LOG_LEVEL`, `LOG_PRETTY`, `DISABLE_FILE_LOGS`) no `.env`.
- Contêiner monta `./logs/server → /var/log/app`; o arquivo `server.log` fica disponível no host.
- Todos os middlewares e controllers usam `logger.*`, garantindo correlação (`req.id`, `userId`). Erros críticos são registrados automaticamente pelo Pino HTTP.

---

## 🌐 Proxy e TLS

Arquivo `front/nginx.conf`:

- Força HTTPS (`listen 443 ssl`).
- Serve SPA (`try_files ... /index.html`).
- Proxy `/api` → `server-app:3000` (via rede Docker).
- Aplica cabeçalhos: HSTS, X-Frame-Options, CSP etc.

`docker-compose.yml` monta `./front/certs` em `/etc/nginx/certs:ro`. Para evitar problemas de IPv6 no healthcheck, a checagem usa `https://127.0.0.1:443/`.

---

## Configurações do Nginx

- Arquivos principais
  - `front/nginx.main.conf`: configuração “global” do Nginx (usuário `nginx`, logs, formatos, `include /etc/nginx/conf.d/*.conf`).
  - `front/nginx.conf`: configuração do servidor de produção (HTTPS na porta 443 + redirecionamento 80→443, proxy da API e SPA).
  - `front/nginx.ci.conf`: variante para CI (somente HTTP, sem HSTS/TLS) usada em pipelines e benchmarks.

- Servidor HTTPS (produção)
  - `listen 443 ssl;` com certificados montados via volume em `/etc/nginx/certs` (`fullchain.pem` e `privkey.pem`).
  - Cabeçalhos de segurança: HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Content-Security-Policy` restritiva.
  - SPA: `root /usr/share/nginx/html; index index.html;` com fallback `try_files $uri /index.html` para suportar React Router.
  - Cache de estáticos: regra para `ico|css|js|gif|jpg|png|woff|ttf|svg|eot` com `expires 6M` e `Cache-Control: public`.
  - Erros: `error_page 404 /index.html;` para manter navegação SPA.

- Proxy da API
  - Rota: `location /api/ { proxy_pass http://server-app:3000/; ... }` encaminha para o backend apenas pela rede Docker (`app-network`).
  - Encaminha cabeçalhos de origem e cliente: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.
  - O serviço `server-app` não publica portas no host; o acesso externo passa exclusivamente pelo Nginx.

- Redirecionamento HTTP→HTTPS
  - Segundo bloco de `server` escuta `80` e faz `301` para `https://$host:3443$request_uri`.
  - O mapeamento de portas é definido em `docker-compose.yml`: `FRONT_HOST_PORT`→80 e `FRONT_HOST_PORT_SSL`→443 (por padrão 3002 e 3443).

- Integração com Docker
  - `docker-compose.yml` monta `./front/certs:/etc/nginx/certs:ro` e deixa o container do Nginx como `read_only`.
  - `tmpfs` para `/var/cache/nginx`, `/var/run` e `/var/log/nginx` evita escrita em disco no container imutável.
  - Healthcheck do `front-app` usa HTTP interno (`wget http://127.0.0.1:80/`) para simplicidade e compatibilidade.

- CI (nginx.ci.conf)
  - Mantém as mesmas rotas e proxy de `/api/`, porém sem TLS e sem HSTS para reduzir complexidade durante pipeline.
  - Cabeçalhos de segurança relevantes permanecem ativos mesmo em HTTP (exceto HSTS).

Referência rápida
- Certificados: gere `fullchain.pem` e `privkey.pem` em `front/certs/` (já descrito na seção de execução local).
- Variáveis: ajuste `FRONT_HOST_PORT` e `FRONT_HOST_PORT_SSL` no `.env` para controlar portas expostas no host.  


---

## 🤖 Pipeline GitHub Actions


`.github/workflows/ci.yml` executa:

1. Lint & Prettier (Server): `npm ci --prefix server`, `npm run lint --prefix server`, `npm run format:check --prefix server`.
2. Lint & Prettier (Front): `npm ci --prefix front`, `npm run lint --prefix front`, `npm run format:check --prefix front`.
3. Build TypeScript (Server): `npm run build --prefix server`.
4. Trivy Scan (Imagem Docker): build da imagem `server/Dockerfile`, saída em tabela (sem falhar o job) e relatório JSON `trivy-report.json` como artefato.
5. Snyk Scan (Node.js): análise de dependências com severidade `high` (requer `SNYK_TOKEN`); relatório JSON `snyk-node-report.json` como artefato.
6. Docker Bench Security: compõe stack com `docker-compose.yml + docker-compose.ci.yml`, aguarda healthchecks, executa `docker/docker-bench-security` e desmonta.

Detalhes
- Disparo: `push` e `pull_request` para `main`.
- Concurrency: cancela execuções em andamento do mesmo `ref`.
- Artefatos: `trivy-report`, `snyk-node-report`.
- Sem testes: a pipeline atual não executa unit/integration/E2E.

Fluxo resumido
Commit → Lint (front/server) → Build (server) → Trivy + Snyk + Bench

📌 Para rodar o Snyk no seu pipeline, é necessário configurar o `SNYK_TOKEN` no repositório:

Crie uma conta gratuita em https://snyk.io
Acesse https://app.snyk.io/account e copie o token gerado - será algo como `xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxxxxxx`.
No GitHub acesse **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
Nome: `SNYK_TOKEN`
Valor: cole o token gerado  


---

## 📎 Requests HTTP

O arquivo `http/requests.http` contém exemplos de chamadas (Registrar, Login, MFA, Change Password, Logout). Com a extensão **REST Client** (VSCode), basta abrir o arquivo e clicar em “Send Request”.

---

## 💡 Dicas Finais

- **Variáveis criptográficas**: `TRANSPORT_ENCRYPTION_KEY` (back) e `VITE_TRANSPORT_ENCRYPTION_KEY` (front) são exigidos nos builds; mantenha os valores sincronizados em produção.
- **Logs**: use `tail -f logs/server/server.log` para acompanhar o `front-app` enviando payload cifrado (headers indicadores aparecem nos logs).
- **Limpeza**: `docker compose down -v` remove containers e volumes (dados do Postgres/Redis).

---

**Pronto!** Com esse README atualizado, qualquer pessoa consegue reproduzir o ambiente, entender os mecanismos de segurança implementados e executar os testes ponta a ponta.
