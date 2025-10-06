import { Router } from "express";
import {
  changePassword,
  createUser,
  loginUser,
  logoutUser,
  verifyMfaCode,
} from "../controllers/user.controller";
import { createRateLimitMiddleware } from "../middlewares/rateLimit";
import { validateBody } from "../middlewares/validateBody";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

const loginRateLimit = createRateLimitMiddleware({
  prefix: "rate:login",
  limit: 10,
  windowSeconds: 300,
});

const mfaRateLimit = createRateLimitMiddleware({
  prefix: "rate:mfa",
  limit: 10,
  windowSeconds: 300,
});

// Criar usuario
router.post(
  "/",
  validateBody([
    { name: "username", required: true, type: "string", minLength: 3 },
    {
      name: "password",
      required: true,
      type: "string",
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    },
    { name: "phone", required: true, type: "string", pattern: /^\+\d{11,15}$/ },
  ]),
  createUser,
);

// Login
router.post(
  "/login",
  loginRateLimit,
  validateBody([
    { name: "username", required: true, type: "string" },
    { name: "password", required: true, type: "string" },
  ]),
  loginUser,
);

// Verificação MFA
router.post(
  "/login/verify-mfa",
  mfaRateLimit,
  validateBody([
    { name: "username", required: true, type: "string" },
    { name: "code", required: true, type: "string" },
  ]),
  verifyMfaCode,
);

// Logout
router.post("/logout", authMiddleware, logoutUser);

// Alterar senha
// Uso de PATCH (boa prática, já que estamos alterando parcialmente o recurso)
router.patch(
  "/password",
  authMiddleware,
  validateBody([
    { name: "oldPassword", required: true, type: "string", minLength: 6 },
    {
      name: "newPassword",
      required: true,
      type: "string",
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    },
  ]),
  changePassword,
);

export default router;
