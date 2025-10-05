import { Request, Response, NextFunction } from "express";
import redisClient from "../configs/redis";

const getClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
};

interface RateLimitOptions {
  prefix: string;
  limit: number;
  windowSeconds: number;
}

export const createRateLimitMiddleware = ({
  prefix,
  limit,
  windowSeconds,
}: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIp(req);
      const key = `${prefix}:${ip}`;

      const attemptsRaw = await redisClient.incr(key);
      const attempts = attemptsRaw ?? 0;

      if (attempts === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      if (attempts > limit) {
        res.status(429).json({
          success: false,
          error: "Muitas tentativas. Aguarde e tente novamente mais tarde.",
        });
        return;
      }

      (req as any).__rateLimitKey = key;
      next();
    } catch (error) {
      console.error("Erro no middleware de rate limit:", error);
      res.status(429).json({ success: false, error: "Muitas tentativas. Tente novamente." });
    }
  };
};

export const clearRateLimit = async (req: Request) => {
  const key = (req as any).__rateLimitKey;
  if (!key) {
    return;
  }

  try {
    await redisClient.del(key);
  } catch (error) {
    console.error("Erro ao limpar rate limit:", error);
  }
};
