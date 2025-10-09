import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";
import {
  decryptTransportPayload,
  encryptTransportPayload,
  isTransportPayload,
  parseDecryptedPayload,
} from "../utils/transportEncryption";

type JsonResponder = Response["json"];

const isEncryptionRequested = (headerValue: string | string[] | undefined): boolean => {
  if (Array.isArray(headerValue)) {
    return headerValue.some((value) => isEncryptionRequested(value));
  }

  if (!headerValue) {
    return false;
  }

  const normalized = headerValue.toString().trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

export const decryptTransportMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!isEncryptionRequested(req.headers["x-transport-encrypted"])) {
    next();
    return;
  }

  if (!isTransportPayload(req.body)) {
    res.status(400).json({
      success: false,
      error: "Payload criptografado inválido.",
    });
    return;
  }

  try {
    const plaintext = decryptTransportPayload(req.body);
    const parsed = parseDecryptedPayload(plaintext);
    req.body = parsed;
    next();
  } catch (error) {
    logger.warn({ err: error }, "Falha ao descriptografar o payload de transporte");
    res.status(400).json({ success: false, error: "Não foi possível descriptografar o payload." });
  }
};

export const encryptResponseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!isEncryptionRequested(req.headers["x-transport-accept-encrypted"])) {
    next();
    return;
  }

  const originalJson: JsonResponder = res.json.bind(res);

  res.json = ((body: any) => {
    try {
      const encryptedPayload = encryptTransportPayload(body);
      return originalJson({ encrypted: true, payload: encryptedPayload });
    } catch (error) {
      logger.error({ err: error }, "Falha ao criptografar o payload da resposta");
      res.status(500);
      return originalJson({ success: false, error: "Erro de criptografia." });
    }
  }) as JsonResponder;

  next();
};
