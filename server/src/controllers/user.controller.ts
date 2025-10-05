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

// --- Criar usuario ---
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
      data: { message: "Usuario criado com sucesso." },
    });
  } catch (error: any) {
    if (error.code === "23505") {
      res.status(400).json({
        success: false,
        error: error.message || "Nome de usuario ja cadastrado. Escolha outro.",
      });
      return;
    }

    res.status(500).json({ success: false, error: "Erro ao criar usuario." });
  }
};

// --- Login de usuario ---
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const normalizedUsername = String(username ?? "").toLowerCase();
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
      [username],
    );

    if (result.rows.length === 0) {
      const newAttempts = await redisClient.incr(loginAttemptsKey);
      if (newAttempts === 1) {
        await redisClient.expire(loginAttemptsKey, 300);
      }

      if (newAttempts >= 3) {
        res.status(429).json({
          success: false,
          error: "Numero maximo de tentativas excedido. Aguarde alguns minutos e tente novamente.",
        });
        return;
      }

      const remaining = Math.max(0, 3 - newAttempts);
      res.status(401).json({
        success: false,
        error: `Credenciais invalidas. Restam ${remaining} tentativa(s).`,
      });
      return;
    }

    const user = result.rows[0];
    let decryptedPhone: string;
    try {
      decryptedPhone = decrypt(String(user.phone));
    } catch (decryptError) {
      console.error("Erro ao descriptografar telefone do usuario:", decryptError);
      res.status(500).json({ success: false, error: "Erro interno ao acessar dados do usuario." });
      return;
    }
    user.phone = decryptedPhone;
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      const newAttempts = await redisClient.incr(loginAttemptsKey);
      if (newAttempts === 1) {
        await redisClient.expire(loginAttemptsKey, 300);
      }

      if (newAttempts >= 3) {
        res.status(429).json({
          success: false,
          error: "Numero maximo de tentativas excedido. Aguarde alguns minutos e tente novamente.",
        });
        return;
      }

      const remaining = Math.max(0, 3 - newAttempts);
      res.status(401).json({
        success: false,
        error: `Credenciais invalidas. Restam ${remaining} tentativa(s).`,
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
        `Seu codigo de verificacao e ${verificationCode}. Ele expira em 2 minutos.`,
      );
    } catch (smsError: any) {
      await redisClient.del(cacheKey).catch(() => undefined);
      console.error("Erro ao enviar SMS de MFA:", smsError?.message || smsError);
      res.status(500).json({
        success: false,
        error: "Nao foi possivel enviar o codigo de verificacao. Tente novamente.",
      });
      return;
    }
    await clearRateLimit(req);

    res.status(200).json({
      success: true,
      data: {
        message: "Codigo de verificacao enviado por SMS.",
        requires2FA: true,
        user: { id: user.id, username: user.username, phone: decryptedPhone },
      },
    });
  } catch (error: any) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "Erro ao realizar login." });
  }
};

// --- Verificar MFA ---
export const verifyMfaCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, code } = req.body;
    const normalizedCode = String(code ?? "").trim();

    if (!/^\d{3}$/.test(normalizedCode)) {
      res.status(400).json({ success: false, error: "Código de verificação inválido." });
      return;
    }

    const result = await db.query(
      "SELECT id,username,phone FROM users WHERE username = $1",
      [username],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: "Credenciais inválidas." });
      return;
    }

    const user = result.rows[0];
    let decryptedPhone: string;
    try {
      decryptedPhone = decrypt(String(user.phone));
    } catch (decryptError) {
      console.error("Erro ao descriptografar telefone do usuario:", decryptError);
      res.status(500).json({ success: false, error: "Erro interno ao acessar dados do usuario." });
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
        error: "Codigo expirado ou inexistente. Solicite um novo login.",
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
    console.error(error.message);
    res.status(500).json({ success: false, error: "Erro ao verificar código de duas etapas." });
  }
};

// --- Logout de usuario ---
// O token será adicionado ao Redis blacklist até expirar
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // `authMiddleware` ja validou o token, basta recupera-lo
    const token = req.headers.authorization!.split(" ")[1];

    const decoded: any = req.user; // vem preenchido pelo middleware
    const exp = decoded?.exp;
    if (!exp) {
      res.status(400).json({ success: false, error: "Token invalido" });
      return;
    }

    // TTL em segundos
    const ttl = exp - Math.floor(Date.now() / 1000);

    // Usar hash do token para evitar armazenar JWT completo no Redis
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    if (ttl > 0) {
      await redisClient.setex(`blacklist:jwt:${tokenHash}`, ttl, "true");
    } else {
      // Se ja expirou, ainda adiciona por 60s para evitar race condition
      await redisClient.setex(`blacklist:jwt:${tokenHash}`, 60, "true");
    }

    res.status(200).json({
      success: true,
      data: { message: "Logout realizado com sucesso. Token invalidado." },
    });
  } catch (error: any) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "Erro ao realizar logout." });
  }
};

// --- Alterar senha do usuario ---
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    // `authMiddleware` ja populou req.user
    const { id } = req.user as UserPayload;
    const { oldPassword, newPassword } = req.body;

    const result = await db.query("SELECT password FROM users WHERE id = $1", [id]);
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
    await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, id]);

    res.status(200).json({
      success: true,
      data: { message: "Senha alterada com sucesso" },
    });
  } catch (error: any) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "Erro ao alterar senha." });
  }
};










