import fs from "node:fs";
import path from "node:path";
import pino, { DestinationStream } from "pino";
import pinoHttp from "pino-http";

const resolveEnvValue = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

const resolveEnvFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return defaultValue;
};

const LOG_DIR = resolveEnvValue(process.env.LOG_DIRECTORY, "/var/log/app");
const LOG_FILE_NAME = resolveEnvValue(process.env.LOG_FILE_NAME, "app.log");
const LOG_LEVEL = resolveEnvValue(
  process.env.LOG_LEVEL,
  process.env.NODE_ENV === "production" ? "info" : "debug",
);
const ENABLE_PRETTY =
  process.env.NODE_ENV !== "production" && resolveEnvFlag(process.env.LOG_PRETTY, true);
const DISABLE_FILE_LOGS = resolveEnvFlag(process.env.DISABLE_FILE_LOGS, false);

const redactionPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body.password",
  "req.body.newPassword",
  "req.body.oldPassword",
  "req.body.token",
  "req.body.code",
  "res.body.token",
  "password",
  "token",
];

function buildConsoleStream(): DestinationStream {
  if (!ENABLE_PRETTY) {
    return pino.destination({ sync: false });
  }

  try {
    const pretty = require("pino-pretty");
    return pretty({
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    });
  } catch {
    // Não foi possível carregar o pretty printer (provavelmente não instalado). Voltando ao stream padrão.
    return pino.destination({ sync: false });
  }
}

function buildFileStream(): DestinationStream | null {
  if (DISABLE_FILE_LOGS) {
    return null;
  }

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // Se o diretório não puder ser criado, pule logs em arquivo para manter o app em execução.
    return null;
  }

  const filePath = path.join(LOG_DIR, LOG_FILE_NAME);
  return pino.destination({ dest: filePath, sync: false, mkdir: true });
}

const consoleStream = buildConsoleStream();
const fileStream = buildFileStream();

const streams: Array<{ stream: DestinationStream }> = [{ stream: consoleStream }];
if (fileStream) {
  streams.push({ stream: fileStream });
}

export const logger = pino(
  {
    level: LOG_LEVEL,
    messageKey: "message",
    redact: {
      paths: redactionPaths,
      censor: "***",
    },
    base: { service: "server-app" },
  },
  pino.multistream(streams),
);

export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === "/health",
  },
  customReceivedMessage: (req) => `requisição recebida: ${req.method ?? ""} ${req.url ?? ""}`.trim(),
  customSuccessMessage: (req, res) =>
    `requisição concluída: ${req.method ?? ""} ${req.url ?? ""} ${res.statusCode}`.trim(),
  customErrorMessage: (req, res, error) =>
    `requisição com erro: ${req.method ?? ""} ${req.url ?? ""} ${res.statusCode} - ${error?.message ?? "desconhecido"}`.trim(),
});
