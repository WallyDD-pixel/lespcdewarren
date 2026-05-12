import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Même défaut que `src/lib/prisma.ts` : le seed ne charge pas forcément `.env`
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}

const prisma = new PrismaClient();

async function main() {
  // ...existing code...


  // Ajoute les PC complets dans la table Product
  // ...existing code...

  // Catégories & Produits (boutique)

  // Ajoute les PC complets dans la table Product (après la création de la catégorie)
  // ...existing code...

  // Catégories & Produits (boutique)
  // Ajoute les PC complets dans la table Product (après la création de la catégorie)
  // (Supprimé car redéclaration plus bas)
  // Purge (dev only)
  const safeDelete = async (fn: () => Promise<any>) => { try { await fn(); } catch {} };

  await safeDelete(() => prisma.notification.deleteMany());

  await safeDelete(() => prisma.contestParticipant.deleteMany());

  await safeDelete(() => prisma.orderItem.deleteMany());
  await safeDelete(() => prisma.order.deleteMany());
  await safeDelete(() => prisma.productImage.deleteMany());
  await safeDelete(() => prisma.variant.deleteMany());
  await safeDelete(() => prisma.product.deleteMany());
  await safeDelete(() => prisma.category.deleteMany());
  await safeDelete(() => prisma.testimonial.deleteMany());
  await safeDelete(() => prisma.review.deleteMany());
  await safeDelete(() => prisma.userProfile.deleteMany());
  // Les commandes peuvent référencer un user : détacher avant deleteMany global
  await safeDelete(() => prisma.order.updateMany({ data: { userId: null } }));
  await safeDelete(() => prisma.user.deleteMany());

  // Catégories & Produits (boutique)
  const pcs = await prisma.category.create({ data: { name: "PC complets", slug: "pc-complets" } });
  const comp = await prisma.category.create({ data: { name: "Composants", slug: "composants" } });

  // Ajout automatique de 6 PC dans la table Product
  const pcProducts = [
    {
      name: "PC Gamer i5 / RTX 4060",
      slug: "pc-gamer-i5-rtx4060",
      description: "PC gaming performant pour le 1080p.",
      priceCents: 99900,
      sku: "PC-101",
      stock: 5,
      categoryId: pcs.id,
      images: { create: [{ url: "/uploads/2025/pc1.jpg", alt: "PC Gamer i5" }] },
    },
    {
      name: "PC Création Ryzen 7 / RTX 4070",
      slug: "pc-creation-ryzen7-rtx4070",
      description: "Idéal pour le montage vidéo et la 3D.",
      priceCents: 159900,
      sku: "PC-102",
      stock: 3,
      categoryId: pcs.id,
      images: { create: [{ url: "/uploads/2025/pc2.jpg", alt: "PC Création" }] },
    },
    {
      name: "PC Bureautique i3 / SSD",
      slug: "pc-bureautique-i3-ssd",
      description: "Parfait pour la bureautique et internet.",
      priceCents: 49900,
      sku: "PC-103",
      stock: 8,
      categoryId: pcs.id,
      images: { create: [{ url: "/uploads/2025/pc3.jpg", alt: "PC Bureautique" }] },
    },
    {
      name: "PC Mini ITX Silence",
      slug: "pc-mini-itx-silence",
      description: "Format compact et silencieux.",
      priceCents: 79900,
      sku: "PC-104",
      stock: 4,
      categoryId: pcs.id,
      images: { create: [{ url: "/uploads/2025/pc4.jpg", alt: "PC Mini ITX" }] },
    },
    {
      name: "PC Haut de gamme i9 / RTX 4080",
      slug: "pc-haut-gamme-i9-rtx4080",
      description: "Pour le gaming 4K et la création pro.",
      priceCents: 249900,
      sku: "PC-105",
      stock: 2,
      categoryId: pcs.id,
      images: { create: [{ url: "/uploads/2025/pc5.jpg", alt: "PC Haut de gamme" }] },
    },
    {
      name: "PC Occasion reconditionné",
      slug: "pc-occasion-reconditionne",
      description: "PC d’occasion testé et garanti.",
      priceCents: 29900,
      sku: "PC-106",
      stock: 6,
      categoryId: pcs.id,
      images: { create: [{ url: "/uploads/2025/pc6.jpg", alt: "PC Occasion" }] },
    },
  ];
  for (const pc of pcProducts) {
    await prisma.product.create({ data: pc });
  }
  const p2 = await prisma.product.create({
    data: {
      name: "PC Création Intel i7 / RTX 3070",
      slug: "pc-creation-i7-rtx3070",
      description: "PC puissant pour montage vidéo et graphisme.",
      priceCents: 179999,
      sku: "PC-002",
      stock: 5,
      categoryId: pcs.id,
      images: { create: [{ url: "/brand-hero-1.png", alt: "PC Création" }] },
      specs: {
        role: "pc",
        cpu: "Intel i7-12700F",
        gpu: "RTX 3070",
        ram: ["32 Go"],
        storage: ["1 To SSD"],
        highlights: ["Silencieux", "Design sobre"],
        benchmarkDisclaimer:
          "Chiffres d’exemple pour la démo boutique ; à remplacer par vos mesures réelles si vous les publiez.",
        gameBenchmarks: [
          { game: "Elden Ring", resolution: "1440p", preset: "Maximum", fpsAvg: 95, fps1Low: 72 },
          { game: "Valorant", resolution: "1080p", preset: "Bas", fpsAvg: 320, fps1Low: 210 },
          { game: "Apex Legends", resolution: "1440p", preset: "Compétitif", fpsAvg: 165, fps1Low: 118 },
        ],
      },
    },
  });
  const p3 = await prisma.product.create({
    data: {
      name: "PC Mini ITX Ryzen 7 / RTX 4060 Ti",
      slug: "pc-mini-itx-ryzen7-rtx4060ti",
      description: "PC compact et puissant pour le gaming et le streaming.",
      priceCents: 149999,
      sku: "PC-003",
      stock: 3,
      categoryId: pcs.id,
      images: { create: [{ url: "/window.svg", alt: "PC Mini ITX" }] },
      specs: { role: "pc", cpu: "Ryzen 7 5700G", gpu: "RTX 4060 Ti", ram: ["16 Go"], storage: ["1 To SSD"], highlights: ["Ultra compact", "RGB"] },
    },
  });

  // Produit fictif dev : page produit avec tableaux de FPS (données non contractuelles)
  await prisma.product.create({
    data: {
      name: "[DÉMO] PC Gamer Ryzen 7 7800X3D / RTX 4070 Super",
      slug: "demo-pc-perf-jeux",
      description:
        "Fiche produit de démonstration pour le développement. Les FPS listés sont fictifs et servent uniquement à valider l’affichage « performances en jeu » sur le site.",
      priceCents: 189900,
      sku: "DEV-DEMO-BENCH-001",
      stock: 99,
      categoryId: pcs.id,
      images: { create: [{ url: "/hero-1.jpg", alt: "PC gamer démo" }] },
      specs: {
        role: "pc",
        cpu: "AMD Ryzen 7 7800X3D",
        gpu: "NVIDIA GeForce RTX 4070 Super",
        ram: ["32 Go DDR5 6000 MHz"],
        storage: ["2 To NVMe Gen4"],
        psu: "850W 80+ Gold",
        os: "Windows 11",
        highlights: ["Démo développeur", "Bench jeux fictifs", "Ne pas commander en prod sans retirer le seed"],
        benchmarkDisclaimer:
          "Données entièrement fictives pour l’environnement de développement. Les performances réelles dépendent du jeu, des pilotes, de la température et des réglages.",
        gameBenchmarks: [
          { game: "Cyberpunk 2077", resolution: "1440p", preset: "Ultra + RT", fpsAvg: 78, fps1Low: 62 },
          { game: "Marvel's Spider-Man", resolution: "1440p", preset: "Très élevé", fpsAvg: 112, fps1Low: 89 },
          { game: "Call of Duty: Warzone", resolution: "1080p", preset: "Compétitif", fpsAvg: 185, fps1Low: 142 },
          { game: "Fortnite", resolution: "1080p", preset: "Performance", fpsAvg: 320, fps1Low: 210 },
          { game: "Counter-Strike 2", resolution: "1080p", preset: "Moyen", fpsAvg: 380, fps1Low: 240 },
          { game: "Microsoft Flight Simulator", resolution: "1440p", preset: "Élevé", fpsAvg: 68, fps1Low: 52 },
        ],
      },
    },
  });

  const SEED_USER_EMAILS = ["admin@example.com", "seller@example.com", "buyer@example.com"] as const;

  /** Supprime proprement les comptes seed (FK commandes / avis / notifs / profil). */
  async function removeSeedUsers() {
    const users = await prisma.user.findMany({
      where: { email: { in: [...SEED_USER_EMAILS] } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (!ids.length) return;
    await prisma.order.updateMany({ where: { userId: { in: ids } }, data: { userId: null } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.review.deleteMany({ where: { userId: { in: ids } } });
    await prisma.userProfile.deleteMany({ where: { userId: { in: ids } } });
    // Anciennes tables SQLite (marketplace retiré du schéma) peuvent encore référencer User
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF");
    try {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    } finally {
      await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
    }
  }

  await removeSeedUsers();

  // Utilisateurs
  const hashAdmin = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: { email: "admin@example.com", passwordHash: hashAdmin, name: "Admin", role: "ADMIN" as any },
  });

  const hashSeller = await bcrypt.hash("seller123", 10);
  const seller = await prisma.user.create({
    data: {
      email: "seller@example.com",
      passwordHash: hashSeller,
      name: "Vendeur Test",
      role: "USER" as any,
      profile: {
        create: {
          firstName: "Vendeur",
          lastName: "Test",
          address1: "10 Rue du Marché",
          zip: "75001",
          city: "Paris",
          country: "France",
          phone: "+33 6 00 00 00 00",
        },
      },
    },
  });

  const hashBuyer = await bcrypt.hash("buyer123", 10);
  const buyer = await prisma.user.create({
    data: {
      email: "buyer@example.com",
      passwordHash: hashBuyer,
      name: "Acheteur Test",
      role: "USER" as any,
      profile: {
        create: {
          firstName: "Acheteur",
          lastName: "Test",
          address1: "20 Avenue des Achats",
          zip: "69001",
          city: "Lyon",
          country: "France",
          phone: "+33 6 11 11 11 11",
        },
      },
    },
  });

  // Témoignages (extraits)
  await prisma.testimonial.createMany({
    data: [
      { name: "Client satisfait", country: "FR", rating: 5, title: "Top !", content: "Service impeccable, je recommande.", experienceDate: new Date("2025-02-10"), published: true, source: "manual" },
      { name: "Gamer", country: "FR", rating: 5, title: "Excellent rapport qualité/prix", content: "Mon PC tourne super bien.", experienceDate: new Date("2025-02-06"), published: true, source: "manual" },
    ],
  });

  console.log("Seed terminé — produit bench démo : /produit/demo-pc-perf-jeux");
  console.table([
    { role: "ADMIN", email: admin.email, password: "admin123" },
    { role: "VENDEUR", email: seller.email, password: "seller123" },
    { role: "ACHETEUR", email: buyer.email, password: "buyer123" },
  ]);
  console.log({
    products: pcProducts.map((p) => p.slug),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
