#!/bin/bash
# Script pour vérifier l'état du build

echo "=== VÉRIFICATION DE L'ÉTAT DU BUILD ==="
echo ""

echo "1. Processus de build en cours..."
ps aux | grep -E "next build|next-build" | grep -v grep
echo ""

echo "2. Dernières lignes du dossier .next (si existe)..."
if [ -d ".next" ]; then
    echo "✅ Dossier .next existe"
    ls -lh .next/ | head -10
    echo ""
    echo "Taille:"
    du -sh .next
else
    echo "❌ Dossier .next n'existe pas encore"
fi
echo ""

echo "3. Vérification de la mémoire..."
free -h
echo ""

echo "4. Si le build est bloqué, arrêtez-le avec:"
echo "   pkill -9 -f 'next build'"
echo ""
echo "5. Pour builder avec limite mémoire:"
echo "   export NODE_OPTIONS='--max-old-space-size=1024'"
echo "   npm run build"
