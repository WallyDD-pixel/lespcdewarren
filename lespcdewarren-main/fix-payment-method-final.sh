#!/bin/bash
# Script de correction finale pour paymentMethod
# À exécuter sur le VPS

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== Diagnostic ==="
echo "1. Vérification de la colonne dans la base..."
sqlite3 prisma/prod.db ".schema Order" | grep -i paymentmethod

echo ""
echo "2. Vérification du schéma Prisma..."
grep -A 2 "paymentMethod" prisma/schema.prisma | head -5

echo ""
echo "3. Vérification des valeurs d'enum (ne doivent PAS avoir de guillemets)..."
grep "PAYPAL_ONLINE_1X" prisma/schema.prisma | head -2

echo ""
echo "=== Correction ==="
echo "4. Arrêt de l'application..."
pm2 stop lespcdewarren

echo ""
echo "5. Suppression complète du cache..."
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
rm -rf .next

echo ""
echo "6. Réinstallation de Prisma..."
npm install @prisma/client prisma

echo ""
echo "7. Synchronisation du schéma avec la base (db pull)..."
npx prisma db pull --force

echo ""
echo "8. Vérification que paymentMethod est toujours dans le schéma après db pull..."
grep paymentMethod prisma/schema.prisma | head -2

echo ""
echo "9. Correction des valeurs d'enum si nécessaire (enlever les guillemets)..."
# Si les valeurs d'enum ont des guillemets, les corriger
sed -i "s/@default(\"PAYPAL_ONLINE_1X\")/@default(PAYPAL_ONLINE_1X)/g" prisma/schema.prisma
sed -i "s/@default(\"PENDING\")/@default(PENDING)/g" prisma/schema.prisma

echo ""
echo "10. Régénération du client Prisma..."
npx prisma generate

echo ""
echo "11. Vérification que paymentMethod est dans le client généré..."
grep -r "paymentMethod" node_modules/.prisma/client/schema.prisma | head -2 || echo "ERREUR: paymentMethod non trouvé dans le client généré!"

echo ""
echo "12. Rebuild..."
npm run build

echo ""
echo "13. Redémarrage..."
pm2 start lespcdewarren

echo ""
echo "✅ Correction terminée!"

