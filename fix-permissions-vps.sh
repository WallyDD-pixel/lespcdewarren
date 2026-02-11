#!/bin/bash
# Script pour corriger les permissions et mettre à jour package.json sur le VPS

set -e

echo "🔧 Correction des permissions et mise à jour du build..."
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json introuvable. Êtes-vous dans le bon répertoire ?"
    exit 1
fi

# 1. Corriger les permissions du dossier .next avec sudo
echo "📁 Correction des permissions du dossier .next..."
sudo rm -rf .next || true
sudo mkdir -p .next
sudo chown -R ec2-user:ec2-user .next
chmod -R 755 .next
echo "   ✅ Permissions corrigées"
echo ""

# 2. Corriger les permissions du répertoire principal si nécessaire
echo "🔐 Vérification des permissions du répertoire..."
sudo chown -R ec2-user:ec2-user .
echo "   ✅ Permissions du répertoire corrigées"
echo ""

# 3. Mettre à jour package.json
echo "📝 Mise à jour de package.json..."
cp package.json package.json.backup

# Remplacer le script de build
sed -i 's|"build": "node -r ./next-server-polyfill.js ./node_modules/next/dist/bin/next build"|"build": "next build"|g' package.json
sed -i 's|"start": "node -r ./next-server-polyfill.js ./node_modules/next/dist/bin/next start -p [0-9]*"|"start": "next start -p 3001"|g' package.json

echo "   ✅ package.json mis à jour"
echo "   📋 Scripts mis à jour :"
grep -A 1 '"build"' package.json | head -2
grep -A 1 '"start"' package.json | head -2
echo ""

echo "✅ Corrections terminées !"
echo ""
echo "🔨 Vous pouvez maintenant exécuter:"
echo "   npm run build"
