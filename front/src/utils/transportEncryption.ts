const keyHex = import.meta.env.VITE_TRANSPORT_ENCRYPTION_KEY;

if (!keyHex) {
  throw new Error("VITE_TRANSPORT_ENCRYPTION_KEY is not configured");
}

const AUTH_TAG_LENGTH = 16; // bytes
const IV_LENGTH = 12;

const hexToUint8Array = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return array;
};

const uint8ArrayToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

let cryptoKeyPromise: Promise<CryptoKey> | null = null;

const getCryptoKey = (): Promise<CryptoKey> => {
  if (!cryptoKeyPromise) {
    const keyBytes = hexToUint8Array(keyHex);
    cryptoKeyPromise = window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    );
  }
  return cryptoKeyPromise;
};

export type TransportPayload = {
  iv: string;
  authTag: string;
  ciphertext: string;
};

export const encryptTransportPayload = async (
  payload: unknown,
): Promise<TransportPayload> => {
  const plaintext =
    typeof payload === "string" ? payload : JSON.stringify(payload ?? {});
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await getCryptoKey();
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedBytes.slice(
    0,
    encryptedBytes.length - AUTH_TAG_LENGTH,
  );
  const authTag = encryptedBytes.slice(encryptedBytes.length - AUTH_TAG_LENGTH);

  return {
    iv: uint8ArrayToHex(iv),
    authTag: uint8ArrayToHex(authTag),
    ciphertext: uint8ArrayToHex(ciphertext),
  };
};

export const decryptTransportPayload = async (
  payload: TransportPayload,
): Promise<string> => {
  if (!payload || !payload.iv || !payload.authTag || !payload.ciphertext) {
    throw new Error("Invalid transport payload");
  }
  const iv = hexToUint8Array(payload.iv);
  const authTag = hexToUint8Array(payload.authTag);
  const ciphertext = hexToUint8Array(payload.ciphertext);
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);

  const key = await getCryptoKey();
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    combined,
  );
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
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

type EncryptedResponse = { encrypted: true; payload: TransportPayload };
type UnknownRecord = Record<string, unknown>;

const isObject = (value: unknown): value is UnknownRecord => {
  return typeof value === "object" && value !== null;
};

export const isEncryptedResponse = (
  data: unknown,
): data is EncryptedResponse => {
  if (!isObject(data) || data.encrypted !== true) {
    return false;
  }

  const payload = (data as UnknownRecord).payload;
  if (!isObject(payload)) {
    return false;
  }

  return (
    typeof payload.iv === "string" &&
    typeof payload.authTag === "string" &&
    typeof payload.ciphertext === "string"
  );
};
