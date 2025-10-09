import crypto from "crypto";
import { logger } from "./logger";

const KEY_HEX = process.env.DATA_ENCRYPTION_KEY;

if (!KEY_HEX) {
  throw new Error("A variável de ambiente DATA_ENCRYPTION_KEY não está configurada.");
}

let key: Buffer;

try {
  key = Buffer.from(KEY_HEX, "hex");
  if (key.length !== 32) {
    throw new Error("Comprimento inválido");
  }
} catch (error: any) {
  logger.error({ err: error }, "Falha ao carregar a chave de criptografia");
  throw new Error(
    "DATA_ENCRYPTION_KEY deve ser uma string hexadecimal de 32 bytes (64 caracteres).",
  );
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recomendados

export const encrypt = (plaintext: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${ciphertext.toString("hex")}:${authTag.toString("hex")}`;
};

export const decrypt = (payload: string): string => {
  const [ivHex, ciphertextHex, authTagHex] = payload.split(":");
  if (!ivHex || !ciphertextHex || !authTagHex) {
    throw new Error("Payload criptografado inválido");
  }

  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
};
