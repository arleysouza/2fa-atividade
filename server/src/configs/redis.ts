import Redis from "ioredis";
import type { RedisOptions } from "ioredis";
import { logger } from "../utils/logger";

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT);
const redisPassword = process.env.REDIS_PASSWORD;

// Monta opcoes dinamicamente
const redisOptions: RedisOptions = {
  host: redisHost,
  port: redisPort,
  retryStrategy: (times) => Math.min(times * 50, 2000),
};

// So adiciona a senha se estiver definida
if (redisPassword) {
  redisOptions.password = redisPassword;
}

const redisClient = new Redis(redisOptions);

redisClient.on("connect", () => logger.info("Conexao com Redis estabelecida"));
redisClient.on("error", (err) => logger.error({ err }, "Erro no Redis"));

export default redisClient;
