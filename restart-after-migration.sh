#!/bin/bash
# Script pour redémarrer l'application après la migration Prisma

echo "=== REDÉMARRAGE APRÈS MIGRATION ==="
echo ""

echo "1. Arrêt de l'application PM2..."
pm2 stop lespcdewarren
echo "✅ Application arrêtée"
echo ""

echo "2. Redémarrage de l'application..."
pm2 restart lespcdewarren
echo "✅ Application redémarrée"
echo ""

echo "3. Attente de 5 secondes pour le démarrage..."
sleep 5
echo ""

echo "4. Vérification du statut..."
pm2 list
echo ""

echo "5. Logs récents (dernières 30 lignes)..."
pm2 logs lespcdewarren --lines 30 --nostream
echo ""

echo "✅ Redémarrage terminé!"
echo ""
echo "Vérifiez que l'application démarre sans erreur Prisma."

