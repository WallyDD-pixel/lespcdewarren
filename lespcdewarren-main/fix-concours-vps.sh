#!/bin/bash
# Script de diagnostic et correction pour le problème concours
# À exécuter sur le VPS

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== Diagnostic ==="
echo "1. Vérification de la colonne dans la base de données..."
sqlite3 prisma/prod.db "PRAGMA table_info(Product);" | grep concours

echo ""
echo "2. Vérification du DATABASE_URL..."
grep DATABASE_URL .env || echo "DATABASE_URL non trouvé dans .env"

echo ""
echo "3. Vérification du schéma Prisma..."
grep -A 2 "concours" prisma/schema.prisma || echo "concours non trouvé dans schema.prisma"

echo ""
echo "4. Suppression du cache Prisma..."
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

echo ""
echo "5. Régénération du client Prisma..."
npx prisma generate

echo ""
echo "6. Vérification que la colonne est bien accessible..."
sqlite3 prisma/prod.db "SELECT concours FROM Product LIMIT 1;" 2>&1

echo ""
echo "=== Correction ==="
echo "Si la colonne n'existe toujours pas, on la recrée..."
sqlite3 prisma/prod.db <<EOF
-- Vérifier et supprimer si existe (en cas de problème)
-- Puis recréer
ALTER TABLE Product ADD COLUMN concours INTEGER DEFAULT 0;
EOF

echo ""
echo "7. Rebuild complet..."
rm -rf .next
npm run build

echo ""
echo "8. Redémarrage..."
pm2 restart lespcdewarren

echo ""
echo "✅ Correction terminée!"

