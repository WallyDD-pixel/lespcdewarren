#!/bin/bash
# Script de vérification complète pour shippingPhone
# À exécuter sur le VPS

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== Diagnostic shippingPhone ==="
echo ""

echo "1. Vérification dans la base de données..."
sqlite3 prisma/prod.db "PRAGMA table_info(\"Order\");" | grep shippingPhone
if [ $? -eq 0 ]; then
    echo "   ✅ Colonne présente dans la base"
else
    echo "   ❌ Colonne ABSENTE de la base - à ajouter"
    sqlite3 prisma/prod.db "ALTER TABLE \"Order\" ADD COLUMN \"shippingPhone\" TEXT;"
fi

echo ""
echo "2. Vérification dans le schéma Prisma..."
grep shippingPhone prisma/schema.prisma
if [ $? -eq 0 ]; then
    echo "   ✅ Présent dans le schéma"
else
    echo "   ❌ ABSENT du schéma - problème!"
fi

echo ""
echo "3. Vérification dans le client Prisma généré..."
if [ -f "node_modules/.prisma/client/schema.prisma" ]; then
    grep shippingPhone node_modules/.prisma/client/schema.prisma
    if [ $? -eq 0 ]; then
        echo "   ✅ Présent dans le client généré"
    else
        echo "   ❌ ABSENT du client généré - régénération nécessaire"
    fi
else
    echo "   ⚠️  Client Prisma non généré"
fi

echo ""
echo "=== Correction ==="
echo "4. Suppression du cache..."
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

echo ""
echo "5. Réinstallation de @prisma/client..."
npm install @prisma/client@6.14.0

echo ""
echo "6. Régénération du client..."
npx prisma generate

echo ""
echo "7. Vérification finale..."
grep -r "shippingPhone" node_modules/.prisma/client/schema.prisma | head -2
if [ $? -eq 0 ]; then
    echo "   ✅ shippingPhone présent dans le client généré"
else
    echo "   ❌ PROBLÈME: shippingPhone toujours absent"
    echo "   Vérifiez que le schéma Prisma contient bien shippingPhone"
fi

echo ""
echo "✅ Diagnostic terminé!"

