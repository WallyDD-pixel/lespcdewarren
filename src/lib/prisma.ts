import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

function createClient() {
  return new PrismaClient();
}

let prismaInstance = globalForPrisma.prisma ?? createClient();

// Si l’instance en cache est obsolète (modèle manquant), recréer le client en dev
if (process.env.NODE_ENV !== "production") {
  const anyClient = prismaInstance as any;
  if (!anyClient.withdrawalRequest || !anyClient.notification || !anyClient.marketplaceCase) {
    prismaInstance = createClient();
  }
  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;
