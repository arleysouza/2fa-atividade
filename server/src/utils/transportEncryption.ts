import crypto from "node:crypto";
import { logger } from "./logger";

type TransportPayload = {
  iv: string;
  authTag: string;
  ciphertext: string;
};

const KEY_HEX = process.env.TRANSPORT_ENCRYPTION_KEY;

if (!KEY_HEX) {
  throw new Error("TRANSPORT_ENCRYPTION_KEY is not configured");
}

let key: Buffer;

try {
  key = Buffer.from(KEY_HEX, "hex");
  if (key.length !== 32) {
    throw new Error("Invalid key length");
  }
} catch (error) {
  logger.error({ err: error }, "Invalid transport encryption key");
  throw new Error("TRANSPORT_ENCRYPTION_KEY must be a 64 character hex string (32 bytes)");
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export const encryptTransportPayload = (payload: unknown): TransportPayload => {
  const plaintext = typeof payload === "string" ? payload : JSON.stringify(payload ?? {});
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext: ciphertext.toString("hex"),
  };
};

export const decryptTransportPayload = (payload: TransportPayload): string => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid transport payload");
  }
  const { iv, authTag, ciphertext } = payload;
  if (!iv || !authTag || !ciphertext) {
    throw new Error("Incomplete transport payload");
  }

  const ivBuffer = Buffer.from(iv, "hex");
  const authTagBuffer = Buffer.from(authTag, "hex");
  const ciphertextBuffer = Buffer.from(ciphertext, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  const decrypted = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()]);
  return decrypted.toString("utf8");
};

export const parseDecryptedPayload = (plaintext: string): unknown => {
  const trimmed = plaintext.trim();
  if (!trimmed) {
    return {};
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return plaintext;
  }
};

export const isTransportPayload = (value: any): value is TransportPayload => {
  return (
    value &&
    typeof value === "object" &&
    typeof value.iv === "string" &&
    typeof value.authTag === "string" &&
    typeof value.ciphertext === "string"
  );
};
