#!/bin/bash
# Script complet pour corriger le build sur le VPS

set -e

echo "🔧 Correction du build sur le VPS..."
echo ""

# 1. Corriger les permissions du dossier .next
echo "📁 Correction des permissions du dossier .next..."
if [ -d ".next" ]; then
    echo "   Suppression de l'ancien dossier .next..."
    sudo rm -rf .next || rm -rf .next
fi
mkdir -p .next
chmod -R 755 .next
echo "   ✅ Permissions corrigées"
echo ""

# 2. Mettre à jour package.json pour utiliser le bon script de build
echo "📝 Mise à jour de package.json..."
if [ -f "package.json" ]; then
    # Créer une sauvegarde
    cp package.json package.json.backup
    
    # Utiliser sed pour remplacer le script de build
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|"build": "node -r ./next-server-polyfill.js ./node_modules/next/dist/bin/next build"|"build": "next build"|g' package.json
        sed -i '' 's|"start": "node -r ./next-server-polyfill.js ./node_modules/next/dist/bin/next start -p 3000"|"start": "next start -p 3001"|g' package.json
    else
        # Linux
        sed -i 's|"build": "node -r ./next-server-polyfill.js ./node_modules/next/dist/bin/next build"|"build": "next build"|g' package.json
        sed -i 's|"start": "node -r ./next-server-polyfill.js ./node_modules/next/dist/bin/next start -p 3000"|"start": "next start -p 3001"|g' package.json
    fi
    
    echo "   ✅ package.json mis à jour"
    echo "   📋 Scripts mis à jour :"
    grep -A 1 '"build"' package.json | head -2
    grep -A 1 '"start"' package.json | head -2
else
    echo "   ⚠️  package.json introuvable"
fi
echo ""

# 3. Vérifier que next-server-polyfill.js n'est plus référencé
if grep -q "next-server-polyfill.js" package.json 2>/dev/null; then
    echo "   ⚠️  Attention: next-server-polyfill.js est encore référencé dans package.json"
    echo "   📝 Veuillez éditer package.json manuellement"
else
    echo "   ✅ Aucune référence à next-server-polyfill.js trouvée"
fi
echo ""

echo "✅ Corrections terminées !"
echo ""
echo "🔨 Vous pouvez maintenant exécuter:"
echo "   npm run build"
