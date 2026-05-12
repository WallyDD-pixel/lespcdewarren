#!/bin/bash
# Script pour vérifier l'état du build sur le VPS
# À exécuter sur le VPS: bash check-vps-build.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== VÉRIFICATION DE L'ÉTAT DU BUILD ==="
echo ""

# Vérifier si .next existe
if [ -d ".next" ]; then
    echo "✅ Dossier .next existe"
    echo "   Taille: $(du -sh .next | cut -f1)"
    echo "   Contenu:"
    ls -la .next | head -10
else
    echo "❌ Dossier .next n'existe pas"
fi
echo ""

# Vérifier les processus Node.js en cours
echo "🔍 Processus Node.js actifs:"
ps aux | grep -E "node|next" | grep -v grep || echo "   Aucun processus Node.js trouvé"
echo ""

# Vérifier la mémoire
echo "💾 Mémoire disponible:"
free -h
echo ""

# Vérifier si le build est toujours en cours (en regardant les fichiers temporaires)
echo "📁 Fichiers de build récents:"
find . -name "*.log" -o -name ".next" -type d -mmin -30 2>/dev/null | head -5
echo ""

echo "=== RECOMMANDATIONS ==="
if [ ! -d ".next" ]; then
    echo "1. Le build n'a pas réussi sur le VPS"
    echo "   Solution: Transférez le dossier .next depuis votre machine locale"
    echo ""
    echo "   Sur votre machine locale (PowerShell):"
    echo "   .\transfer-build.ps1"
    echo ""
    echo "   Ou manuellement:"
    echo "   tar -czf .next.tar.gz .next/"
    echo "   scp .next.tar.gz ubuntu@51.38.236.183:/var/www/lespcdewarren/lespcdewarren/"
    echo "   ssh ubuntu@51.38.236.183 'cd /var/www/lespcdewarren/lespcdewarren && tar -xzf .next.tar.gz && rm .next.tar.gz'"
else
    echo "✅ Build disponible!"
    echo "   Vous pouvez démarrer l'application:"
    echo "   pm2 start npm --name lespcdewarren -- start"
fi
