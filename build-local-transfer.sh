#!/bin/bash
# Script pour builder localement et transférer sur le VPS
# À exécuter sur votre machine LOCALE (Windows avec Git Bash ou WSL)

echo "=== BUILD LOCAL ET TRANSFERT ==="
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé"
    echo "   Exécutez ce script depuis le répertoire du projet"
    exit 1
fi

echo "1. Nettoyage local..."
rm -rf .next
echo "✅ Nettoyage terminé"
echo ""

echo "2. Génération Prisma..."
npx prisma generate || exit 1
echo "✅ Prisma OK"
echo ""

echo "3. Build local (peut prendre quelques minutes)..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build local"
    exit 1
fi

if [ ! -d ".next" ]; then
    echo "❌ Dossier .next non créé"
    exit 1
fi

echo "✅ Build local réussi!"
echo ""

# Configuration VPS
VPS_USER="${1:-ubuntu}"
VPS_HOST="${2:-51.38.236.183}"
VPS_PATH="${3:-/var/www/lespcdewarren/lespcdewarren}"

echo "4. Transfert vers le VPS..."
echo "   Serveur: ${VPS_USER}@${VPS_HOST}"
echo "   Chemin: ${VPS_PATH}"
echo ""

# Créer une archive du dossier .next
echo "   Création de l'archive..."
tar -czf .next.tar.gz .next/

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la création de l'archive"
    exit 1
fi

echo "   Transfert en cours..."
scp .next.tar.gz ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du transfert"
    rm -f .next.tar.gz
    exit 1
fi

echo "   Extraction sur le VPS..."
ssh ${VPS_USER}@${VPS_HOST} << EOF
cd ${VPS_PATH}
rm -rf .next
tar -xzf .next.tar.gz
rm -f .next.tar.gz
echo "✅ Dossier .next transféré avec succès!"
ls -lh .next | head -5
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅✅✅ TRANSFERT RÉUSSI! ✅✅✅"
    echo ""
    echo "Sur le VPS, vous pouvez maintenant démarrer l'application:"
    echo "  pm2 start npm --name lespcdewarren -- start"
else
    echo "❌ Erreur lors de l'extraction sur le VPS"
fi

# Nettoyer l'archive locale
rm -f .next.tar.gz

echo ""
echo "=== TERMINÉ ==="
