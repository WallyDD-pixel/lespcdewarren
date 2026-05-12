import { PrismaClient } from "@prisma/client";

// SQLite local : évite PrismaClientInitializationError si aucun .env n’est chargé (dev)
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };
function createClient() {
  return new PrismaClient();
}

let prismaInstance = globalForPrisma.prisma ?? createClient();

// Si l’instance en cache est obsolète (modèle manquant), recréer le client en dev
if (process.env.NODE_ENV !== "production") {
  const anyClient = prismaInstance as any;
  if (!anyClient.notification) {
    prismaInstance = createClient();
  }
  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;
