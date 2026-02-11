#!/bin/bash
# Script pour appliquer la migration concours directement sur le VPS
# Usage: ssh ubuntu@51.38.236.183 'bash -s' < apply-migration-concours.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "Vérification de l'existence de la colonne concours..."
sqlite3 prisma/prod.db "PRAGMA table_info(Product);" | grep -q concours
if [ $? -eq 0 ]; then
    echo "✅ La colonne concours existe déjà"
    npx prisma migrate resolve --applied 20251129140000_add_concours_to_product
else
    echo "❌ La colonne concours n'existe pas, ajout..."
    sqlite3 prisma/prod.db "ALTER TABLE Product ADD COLUMN concours BOOLEAN NOT NULL DEFAULT 0;"
    if [ $? -eq 0 ]; then
        echo "✅ Colonne ajoutée avec succès"
        npx prisma migrate resolve --applied 20251129140000_add_concours_to_product
    else
        echo "❌ Erreur lors de l'ajout de la colonne"
        exit 1
    fi
fi

echo "Régénération du client Prisma..."
npx prisma generate

echo "✅ Migration appliquée!"

