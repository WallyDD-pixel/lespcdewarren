#!/bin/bash
# Script pour corriger les permissions et mettre à jour le build

echo "🔧 Correction des permissions du dossier .next..."

# Supprimer le dossier .next s'il existe et a des problèmes de permissions
if [ -d ".next" ]; then
    echo "Suppression de l'ancien dossier .next..."
    sudo rm -rf .next
fi

# Créer le dossier .next avec les bonnes permissions
mkdir -p .next
chmod -R 755 .next

echo "✅ Permissions corrigées"
echo ""
echo "📦 Mise à jour de package.json..."
echo "   Le script build doit être: 'next build' (sans next-server-polyfill.js)"
echo ""
echo "🔨 Vous pouvez maintenant exécuter:"
echo "   npm run build"
