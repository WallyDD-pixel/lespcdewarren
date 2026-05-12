#!/bin/bash
# Script de correction automatique pour le site VPS
# À exécuter sur le VPS: bash fix-site-vps.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== CORRECTION DU SITE ==="
echo ""

# Arrêter PM2 si il tourne
echo "1. Arrêt de PM2..."
pm2 stop lespcdewarren 2>/dev/null || true
pm2 delete lespcdewarren 2>/dev/null || true
echo "✅ PM2 arrêté"
echo ""

# Vérifier que le build existe
if [ ! -d ".next" ]; then
    echo "2. Build manquant, reconstruction..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors du build"
        exit 1
    fi
    echo "✅ Build terminé"
else
    echo "2. Build existe déjà"
fi
echo ""

# Vérifier Prisma
echo "3. Vérification de Prisma..."
npx prisma generate
echo "✅ Prisma généré"
echo ""

# Vérifier le fichier .env
if [ ! -f ".env" ]; then
    echo "⚠️  ATTENTION: Fichier .env manquant!"
    echo "   Créez-le avec les variables nécessaires"
fi
echo ""

# Démarrer PM2
echo "4. Démarrage de PM2..."
pm2 start npm --name lespcdewarren -- start
if [ $? -eq 0 ]; then
    echo "✅ PM2 démarré avec succès"
else
    echo "❌ Erreur lors du démarrage de PM2"
    exit 1
fi
echo ""

# Attendre un peu
sleep 2

# Vérifier l'état
echo "5. Vérification de l'état..."
pm2 list
echo ""

echo "6. Affichage des logs (dernières 20 lignes)..."
pm2 logs lespcdewarren --lines 20 --nostream
echo ""

echo "=== CORRECTION TERMINÉE ==="
echo ""
echo "Pour voir les logs en temps réel:"
echo "  pm2 logs lespcdewarren"
echo ""
echo "Pour vérifier l'état:"
echo "  pm2 status"
echo ""
