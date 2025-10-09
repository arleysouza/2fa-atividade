import { Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../configs/db";
import type { UserPayload } from "../types/express";
import redisClient from "../configs/redis";
import crypto from "crypto";
import { sendSms } from "../services/sms";
import { clearRateLimit } from "../middlewares/rateLimit";
import { generateToken } from "../utils/jwt";
import { encrypt, decrypt } from "../utils/encryption";

import { logger } from "../utils/logger";

// --- Criar usuário ---
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, phone } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const encryptedPhone = encrypt(String(phone ?? ""));

    await db.query("INSERT INTO users (username, password, phone) VALUES ($1, $2, $3)", [
      username,
      hashedPassword,
      encryptedPhone,
    ]);

    res.status(201).json({
      success: true,
      data: { message: "Usuário criado com sucesso." },
    });
  } catch (error: any) {
    if (error.code === "23505") {
      res.status(400).json({
        success: false,
        error: error.message || "Nome de usuário já cadastrado. Escolha outro.",
      });
      return;
    }

    res.status(500).json({ success: false, error: "Erro ao criar usuário." });
  }
};

// --- Login de usuário ---
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
  const providedUsername = String(username ?? "");
  const providedPassword = typeof password === "string" ? password : "";
  try {
    const normalizedUsername = providedUsername.toLowerCase();
    const loginAttemptsKey = `auth:login:${normalizedUsername}:attempts`;

    const attemptCountRaw = await redisClient.get(loginAttemptsKey);
    const attemptCount = attemptCountRaw ? Number(attemptCountRaw) : 0;

    if (attemptCount >= 3) {
      res.status(429).json({
        success: false,
        error: "Número máximo de tentativas excedido. Aguarde alguns minutos e tente novamente.",
      });
      return;
    }

    const result = await db.query(
      "SELECT id,username,password,phone FROM users WHERE username = $1",
      [providedUsername],
    );

    if (result.rows.length === 0) {
      const newAttempts = await redisClient.incr(loginAttemptsKey);
      if (newAttempts === 1) {
        await redisClient.expire(loginAttemptsKey, 300);
      }

      if (newAttempts >= 3) {
        res.status(429).json({
          success: false,
          error: "Número máximo de tentativas excedido. Aguarde alguns minutos e tente novamente.",
        });
        return;
      }

      const remaining = Math.max(0, 3 - newAttempts);
      res.status(401).json({
        success: false,
        error: `Credenciais inválidas. Restam ${remaining} tentativa(s).`,
      });
      return;
    }

    const user = result.rows[0];
    let decryptedPhone: string;
    try {
      decryptedPhone = decrypt(String(user.phone));
    } catch (decryptError) {
      logger.error(
        { err: decryptError, username: providedUsername || undefined },
        "Erro ao descriptografar telefone do usuário",
      );
      res.status(500).json({ success: false, error: "Erro interno ao acessar dados do usuário." });
      return;
    }
    user.phone = decryptedPhone;
    const validPassword = await bcrypt.compare(providedPassword, user.password);

    if (!validPassword) {
      const newAttempts = await redisClient.incr(loginAttemptsKey);
      if (newAttempts === 1) {
        await redisClient.expire(loginAttemptsKey, 300);
      }

      if (newAttempts >= 3) {
        res.status(429).json({
          success: false,
          error: "Número máximo de tentativas excedido. Aguarde alguns minutos e tente novamente.",
        });
        return;
      }

      const remaining = Math.max(0, 3 - newAttempts);
      res.status(401).json({
        success: false,
        error: `Credenciais inválidas. Restam ${remaining} tentativa(s).`,
      });
      return;
    }

    await redisClient.del(loginAttemptsKey).catch(() => undefined);

    const verificationCode = Math.floor(Math.random() * 999 + 1)
      .toString()
      .padStart(3, "0");
    const cacheKey = `mfa:login:${user.id}`;

    try {
      await redisClient.setex(cacheKey, 120, verificationCode);
      await sendSms(
        user.phone,
        `Seu código de verificação é ${verificationCode}. Ele expira em 2 minutos.`,
      );
    } catch (smsError: any) {
      await redisClient.del(cacheKey).catch(() => undefined);
      logger.error({ err: smsError, userId: user.id }, "Erro ao enviar SMS de MFA");
      res.status(500).json({
        success: false,
        error: "Não foi possível enviar o código de verificação. Tente novamente.",
      });
      return;
    }
    await clearRateLimit(req);

    res.status(200).json({
      success: true,
      data: {
        message: "Código de verificação enviado por SMS.",
        requires2FA: true,
        user: { id: user.id, username: user.username, phone: decryptedPhone },
      },
    });
  } catch (error: any) {
    logger.error({ err: error, username: providedUsername || undefined }, "Erro ao realizar login");
    res.status(500).json({ success: false, error: "Erro ao realizar login." });
  }
};

// --- Verificar MFA ---
export const verifyMfaCode = async (req: Request, res: Response): Promise<void> => {
  const { username, code } = (req.body ?? {}) as { username?: string; code?: string };
  const providedUsername = String(username ?? "");
  try {
    const normalizedCode = String(code ?? "").trim();

    if (!/^\d{3}$/.test(normalizedCode)) {
      res.status(400).json({ success: false, error: "Código de verificação inválido." });
      return;
    }

    const result = await db.query("SELECT id,username,phone FROM users WHERE username = $1", [
      providedUsername,
    ]);

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: "Credenciais inválidas." });
      return;
    }

    const user = result.rows[0];
    let decryptedPhone: string;
    try {
      decryptedPhone = decrypt(String(user.phone));
    } catch (decryptError) {
      logger.error(
        { err: decryptError, username: providedUsername || undefined },
        "Erro ao descriptografar telefone do usuário",
      );
      res.status(500).json({ success: false, error: "Erro interno ao acessar dados do usuário." });
      return;
    }
    user.phone = decryptedPhone;
    const cacheKey = `mfa:login:${user.id}`;
    const attemptsKey = `mfa:login:${user.id}:attempts`;

    const attemptCountRaw = await redisClient.get(attemptsKey);
    const attemptCount = attemptCountRaw ? Number(attemptCountRaw) : 0;

    if (attemptCount >= 3) {
      res.status(429).json({
        success: false,
        error: "Número máximo de tentativas excedido. Inicie o login novamente.",
      });
      return;
    }

    const cachedCode = await redisClient.get(cacheKey);

    if (!cachedCode) {
      await redisClient.del(attemptsKey).catch(() => undefined);
      res.status(400).json({
        success: false,
        error: "Código expirado ou inexistente. Solicite um novo login.",
      });
      return;
    }

    if (cachedCode !== normalizedCode) {
      const currentAttempts = await redisClient.incr(attemptsKey);
      if (currentAttempts === 1) {
        await redisClient.expire(attemptsKey, 120);
      }

      if (currentAttempts >= 3) {
        await redisClient.del(cacheKey).catch(() => undefined);
        await redisClient.del(attemptsKey).catch(() => undefined);
        res.status(429).json({
          success: false,
          error: "Número máximo de tentativas excedido. Inicie o login novamente.",
        });
        return;
      }

      const remaining = Math.max(0, 3 - currentAttempts);
      res.status(401).json({
        success: false,
        error: `Código de verificação inválido. Restam ${remaining} tentativa(s).`,
      });
      return;
    }

    await redisClient.del(cacheKey).catch(() => undefined);
    await redisClient.del(attemptsKey).catch(() => undefined);

    const payload: UserPayload = {
      id: user.id,
      username: user.username,
      phone: user.phone,
    };

    const token = generateToken(payload);

    await clearRateLimit(req);

    res.status(200).json({
      success: true,
      data: {
        message: "Verificação de duas etapas concluída com sucesso.",
        token,
        user: { id: user.id, username: user.username, phone: user.phone },
      },
    });
  } catch (error: any) {
    logger.error(
      { err: error, username: providedUsername || undefined },
      "Erro ao verificar código de duas etapas",
    );
    res.status(500).json({ success: false, error: "Erro ao verificar código de duas etapas." });
  }
};

// --- Logout de usuário ---
// O token será adicionado ao Redis blacklist até expirar
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  const currentUser = req.user as (UserPayload & { exp?: number }) | undefined;
  try {
    // `authMiddleware` já validou o token, basta recuperá-lo
    const token = req.headers.authorization!.split(" ")[1];

    const exp = currentUser?.exp;
    if (!exp) {
      res.status(400).json({ success: false, error: "Token inválido" });
      return;
    }

    // TTL em segundos
    const ttl = exp - Math.floor(Date.now() / 1000);

    // Usar hash do token para evitar armazenar JWT completo no Redis
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    if (ttl > 0) {
      await redisClient.setex(`blacklist:jwt:${tokenHash}`, ttl, "true");
    } else {
      // Se já expirou, ainda adiciona por 60s para evitar race condition
      await redisClient.setex(`blacklist:jwt:${tokenHash}`, 60, "true");
    }

    res.status(200).json({
      success: true,
      data: { message: "Logout realizado com sucesso. Token invalidado." },
    });
  } catch (error: any) {
    logger.error({ err: error, userId: currentUser?.id }, "Erro ao realizar logout");
    res.status(500).json({ success: false, error: "Erro ao realizar logout." });
  }
};

// --- Alterar senha do usuário ---
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const currentUser = req.user as UserPayload | undefined;
  try {
    // `authMiddleware` já populou req.user
    const userId = currentUser?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Usuário não autenticado" });
      return;
    }
    const { oldPassword, newPassword } = req.body;

    const result = await db.query("SELECT password FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: "Usuário não encontrado" });
      return;
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      res.status(401).json({ success: false, error: "Senha atual incorreta" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId]);

    res.status(200).json({
      success: true,
      data: { message: "Senha alterada com sucesso" },
    });
  } catch (error: any) {
    logger.error({ err: error, userId: currentUser?.id }, "Erro ao alterar senha");
    res.status(500).json({ success: false, error: "Erro ao alterar senha." });
  }
};
