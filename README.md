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
└─  docker-compose.ci.yml           # Orquestração para CI (bench/security)
```

---

## 🚀 Execução Local (Produção)

1. **Clonar repositório**

```bash
git clone https://github.com/arleysouza/2fa-atividade.git app
cd app
```

2. **Gerar certificados autoassinados**

Crie `front/certs` e gere as chaves. Exemplos:

PowerShell (Windows):

```powershell
mkdir .\front\certs
openssl genrsa -out front\certs\privkey.pem 2048
openssl req -x509 -nodes -days 365 -new -key front\certs\privkey.pem -out front\certs\fullchain.pem
```

Bash (Linux/macOS/Git Bash):

```bash
mkdir -p front/certs
openssl genrsa -out front/certs/privkey.pem 2048
openssl req -x509 -nodes -days 365 -new -key front/certs/privkey.pem -out front/certs/fullchain.pem
```

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

## 🤖 Pipeline GitHub Actions

`.github/workflows/ci.yml` executa:

1. **Lint & Prettier** (front + server)
2. **Build** (server)
3. **Tests** (unit, integration, e2e – frente e verso)

Artefatos como cobertura Jest e relatórios Playwright são publicados ao final.

```
Commit → GitHub Actions → {Lint, Build, Unit, Integration, E2E}
```

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
