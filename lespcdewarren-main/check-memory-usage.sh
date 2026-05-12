#!/bin/bash
# Script pour analyser la consommation mémoire sur EC2

echo "=== ANALYSE DE LA CONSOMMATION MÉMOIRE ==="
echo ""

echo "1. Mémoire totale disponible:"
free -h
echo ""

echo "2. Top 10 processus consommant le plus de mémoire:"
ps aux --sort=-%mem | head -11
echo ""

echo "3. Processus Node.js:"
ps aux | grep node | grep -v grep
echo ""

echo "4. Processus PM2:"
pm2 list
echo ""

echo "5. Taille des dossiers les plus volumineux:"
du -sh node_modules .next 2>/dev/null | sort -h
echo ""

echo "6. Espace disque disponible:"
df -h | grep -E "Filesystem|/$"
echo ""

echo "7. Fichiers temporaires volumineux:"
find . -type f -size +100M ! -path "./node_modules/*" ! -path "./.git/*" ! -path "./.next/*" -exec ls -lh {} \; 2>/dev/null | head -10
echo ""

echo "=== RECOMMANDATIONS ==="
MEM_AVAILABLE=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$MEM_AVAILABLE" -lt 500 ]; then
    echo "⚠️  Mémoire disponible très faible: ${MEM_AVAILABLE}MB"
    echo "   - Arrêtez les processus inutiles"
    echo "   - Augmentez le swap si nécessaire"
    echo "   - Considérez builder localement et transférer"
else
    echo "✅ Mémoire disponible: ${MEM_AVAILABLE}MB"
fi

