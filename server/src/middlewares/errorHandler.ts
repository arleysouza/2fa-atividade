import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Middleware global de tratamento de erros
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, "Erro capturado pelo middleware");

  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
    // Em ambiente de desenvolvimento, incluimos detalhes do erro
    ...(process.env.NODE_ENV !== "production" && { details: err.message }),
  });
}
