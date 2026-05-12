#!/bin/bash
# Script pour vérifier l'état de l'application PM2 sur EC2

echo "=== VÉRIFICATION DE L'APPLICATION PM2 ==="
echo ""

echo "1. État de l'application:"
pm2 list
echo ""

echo "2. Logs récents (dernières 20 lignes):"
pm2 logs lespcdewarren --lines 20 --nostream
echo ""

echo "3. Informations détaillées:"
pm2 describe lespcdewarren
echo ""

echo "4. Vérification du port 3001:"
netstat -tuln | grep 3001 || ss -tuln | grep 3001 || echo "⚠️  Port 3001 non détecté (peut être normal si l'app n'écoute pas encore)"
echo ""

echo "5. Processus Node.js:"
ps aux | grep node | grep -v grep
echo ""

echo "=== COMMANDES UTILES ==="
echo "  pm2 logs lespcdewarren        - Voir les logs en temps réel"
echo "  pm2 monit                      - Monitorer en temps réel"
echo "  pm2 restart lespcdewarren      - Redémarrer l'application"
echo "  pm2 stop lespcdewarren         - Arrêter l'application"
echo "  pm2 save                       - Sauvegarder la configuration"
echo "  pm2 startup                    - Configurer le démarrage automatique"

