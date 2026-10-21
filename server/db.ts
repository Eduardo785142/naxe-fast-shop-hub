import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { postgresConfig } from "../scripts/postgres-config.mjs";
export const db = new PrismaClient({
  adapter: new PrismaPg(postgresConfig()),
});
