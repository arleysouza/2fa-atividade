import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import router from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import {
  decryptTransportMiddleware,
  encryptResponseMiddleware,
} from "./middlewares/transportEncryption";
import { httpLogger, logger } from "./utils/logger";

// Carrega as variáveis de ambiente definidas no arquivo .env
dotenv.config();

// Inicializa a aplicação Express
const app = express();

// Define a porta utilizada pelo servidor
const PORT = process.env.PORT || 3000;

// Middleware para permitir o envio de dados em formato JSON no corpo das requisições
app.use(express.json());

// Middleware para permitir o envio de dados em formato URL-encoded no corpo das requisições
app.use(express.urlencoded({ extended: true }));

// Descriptografa payloads de entrada quando sinalizado
app.use(decryptTransportMiddleware);

// Middleware para cookies
app.use(cookieParser());

// Criptografa respostas quando solicitado
app.use(encryptResponseMiddleware);

// Logger HTTP (deve vir após os parsers)
app.use(httpLogger);

// Rota de healthcheck para o Docker
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Rotas principais
app.use("/", router);

// Middleware para rotas não encontradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Rota não encontrada",
  });
});

// Middleware global de erro (sempre por último)
app.use(errorHandler);

// Inicializa o servidor na porta definida
app.listen(PORT, () => {
  logger.info({ port: PORT }, "Servidor iniciado");
});
