// Script pour migrer les anciennes valeurs de paymentMethod
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migration des méthodes de paiement...');

  // Mettre à jour les commandes boutique avec SQL brut
  const ordersResult = await prisma.$executeRaw`
    UPDATE "Order" 
    SET paymentMethod = 'PAYPAL_ONLINE_1X' 
    WHERE paymentMethod = 'PAYPAL_ONLINE'
  `;

  console.log(`✅ ${ordersResult} commandes boutique mises à jour`);

  // Mettre à jour les commandes marketplace avec SQL brut
  const marketplaceResult = await prisma.$executeRaw`
    UPDATE "MarketplaceOrder" 
    SET paymentMethod = 'PAYPAL_ONLINE_1X' 
    WHERE paymentMethod = 'PAYPAL_ONLINE'
  `;

  console.log(`✅ ${marketplaceResult} commandes marketplace mises à jour`);

  console.log('✨ Migration terminée !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
