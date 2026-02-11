import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const adminPassword = "admin123";

  // Vérifier si l'admin existe déjà
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("✅ L'utilisateur admin existe déjà:");
    console.log(`   Email: ${existingAdmin.email}`);
    console.log(`   Role: ${existingAdmin.role}`);
    console.log(`   ID: ${existingAdmin.id}`);
    
    // Vérifier si le mot de passe fonctionne
    const testPassword = await bcrypt.compare(adminPassword, existingAdmin.passwordHash);
    if (testPassword) {
      console.log("✅ Le mot de passe 'admin123' est correct");
    } else {
      console.log("⚠️  Le mot de passe 'admin123' ne correspond pas au hash stocké");
      console.log("   Mise à jour du mot de passe...");
      const newHash = await bcrypt.hash(adminPassword, 10);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { passwordHash: newHash },
      });
      console.log("✅ Mot de passe mis à jour avec succès");
    }
  } else {
    console.log("❌ L'utilisateur admin n'existe pas. Création...");
    const hashAdmin = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashAdmin,
        name: "Admin",
        role: "ADMIN" as any,
      },
    });
    console.log("✅ Utilisateur admin créé avec succès:");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${admin.role}`);
  }

  // Test de connexion simulé
  console.log("\n🔍 Test de connexion...");
  const testUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { email: adminEmail.toLowerCase() },
        { email: adminEmail.trim() },
      ],
    },
  });

  if (testUser) {
    const passwordMatch = await bcrypt.compare(adminPassword, testUser.passwordHash);
    console.log(`   ✅ Utilisateur trouvé: ${testUser.email}`);
    console.log(`   ✅ Mot de passe valide: ${passwordMatch}`);
    console.log(`   ✅ Role: ${testUser.role}`);
  } else {
    console.log("   ❌ Utilisateur non trouvé avec la recherche OR");
  }

  console.log("\n📋 Identifiants de connexion:");
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Mot de passe: ${adminPassword}`);
  console.log("\n💡 Si la connexion ne fonctionne pas:");
  console.log("   1. Vérifiez que vous utilisez exactement: admin@example.com");
  console.log("   2. Vérifiez que vous utilisez exactement: admin123");
  console.log("   3. Vérifiez les logs du serveur pour voir les erreurs");
  console.log("   4. Essayez de vider le cache du navigateur");
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

