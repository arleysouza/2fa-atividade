import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

export default new Pool({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: String(process.env.POSTGRES_PASSWORD),
  database: process.env.POSTGRES_DB,
  port: Number(process.env.POSTGRES_PORT),
});
