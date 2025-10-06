import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt"; // agora usa jsonwebtoken
import redisClient from "../configs/redis";
import crypto from "crypto";
import { logger } from "../utils/logger";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Token nao fornecido",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Gera hash do token para comparar com a blacklist
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Verifica se token esta na blacklist do Redis
    const isBlacklisted = await redisClient.get(`blacklist:jwt:${tokenHash}`);

    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: "Token expirado ou invalido",
      });
      return;
    }

    // Verifica e decodifica o token
    const payload = verifyToken(token);

    req.user = payload; // tipado via types/express/index.d.ts
    next();
  } catch (error) {
    logger.error({ err: error }, "Erro no middleware de autenticacao");
    res.status(401).json({
      success: false,
      error: "Token invalido ou expirado",
    });
  }
}
