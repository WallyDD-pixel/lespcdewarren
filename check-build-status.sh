#!/bin/bash
# Script pour vérifier l'état du build
# À exécuter sur le VPS: bash check-build-status.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== ÉTAT DU BUILD ==="
echo ""

# Vérifier si .next existe
if [ -d ".next" ]; then
    echo "✅ Dossier .next existe"
    echo "   Taille: $(du -sh .next | cut -f1)"
    echo "   Contenu:"
    ls -la .next | head -10
else
    echo "❌ Dossier .next n'existe pas - le build n'a pas réussi"
fi
echo ""

# Vérifier build.log
if [ -f "build.log" ]; then
    echo "📋 Dernières lignes de build.log:"
    tail -30 build.log
    echo ""
    
    # Vérifier les erreurs
    if grep -qi "error\|killed\|terminated\|out of memory" build.log; then
        echo "⚠️  Erreurs détectées dans build.log:"
        grep -i "error\|killed\|terminated\|out of memory" build.log | tail -10
    fi
else
    echo "⚠️  Fichier build.log non trouvé"
fi
echo ""

# Vérifier la mémoire
echo "💾 Mémoire disponible:"
free -h
echo ""

# Vérifier le swap
echo "💿 Swap:"
swapon --show || echo "⚠️  Pas de swap actif"
echo ""

# Vérifier PM2
echo "🔄 État PM2:"
pm2 list 2>/dev/null || echo "⚠️  PM2 non configuré"
echo ""

# Vérifier les fichiers suspects
echo "🔍 Fichiers suspects (noms aléatoires):"
ls -1 | grep -E "^[A-Za-z0-9]{8,}$" | head -10
echo ""

echo "=== RECOMMANDATIONS ==="
if [ ! -d ".next" ]; then
    echo "1. Le build n'a pas réussi"
    echo "   - Créez un swap: sudo bash create-swap.sh"
    echo "   - Relancez le build: bash build-low-memory.sh"
fi

if ! swapon --show | grep -q .; then
    echo "2. Pas de swap détecté"
    echo "   - Créez-en un: sudo bash create-swap.sh"
fi

echo ""
echo "Pour nettoyer les fichiers temporaires:"
echo "  bash cleanup-temp-files.sh"
