#!/bin/bash
# Script pour corriger les erreurs PM2 sur EC2

echo "=== CORRECTION DES ERREURS PM2 ==="
echo ""

# Vérifier la version de Node.js
echo "1. Vérification de la version Node.js:"
node --version
npm --version
echo ""

# Arrêter PM2
echo "2. Arrêt de l'application PM2..."
pm2 stop lespcdewarren
pm2 delete lespcdewarren
echo "✅ Application arrêtée"
echo ""

# Trouver et tuer les processus Node.js restants
echo "3. Recherche de processus Node.js restants..."
NODE_PIDS=$(ps aux | grep node | grep -v grep | awk '{print $2}')
if [ ! -z "$NODE_PIDS" ]; then
    echo "Processus Node.js trouvés: $NODE_PIDS"
    echo "$NODE_PIDS" | xargs kill -9 2>/dev/null
    echo "✅ Processus Node.js arrêtés"
else
    echo "✅ Aucun processus Node.js trouvé"
fi
echo ""

# Nettoyer les fichiers temporaires et next-server
echo "4. Nettoyage des fichiers temporaires..."
rm -f next-server
rm -f next-server-polyfill.js
rm -rf .next/cache
rm -rf /var/tmp/next-server* 2>/dev/null
rm -rf /tmp/next-server* 2>/dev/null
echo "✅ Fichiers temporaires nettoyés"
echo ""

# Vérifier si le build existe
echo "5. Vérification du build..."
if [ ! -d ".next" ]; then
    echo "⚠️  Le dossier .next n'existe pas"
    echo "   Vous devez builder l'application d'abord:"
    echo "   npm run build"
    exit 1
else
    echo "✅ Dossier .next trouvé"
    du -sh .next
fi
echo ""

# Vérifier les variables d'environnement
echo "6. Vérification du fichier .env..."
if [ -f ".env" ]; then
    echo "✅ Fichier .env trouvé"
    if grep -q "SMTP_USER\|SMTP_PASS" .env; then
        echo "✅ Variables SMTP configurées"
    else
        echo "⚠️  Variables SMTP manquantes (non critique)"
    fi
else
    echo "⚠️  Fichier .env non trouvé"
fi
echo ""

# Relancer PM2
echo "7. Relance de l'application PM2..."
pm2 start npm --name lespcdewarren -- start

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Application relancée"
    echo ""
    echo "Attente de 5 secondes pour vérifier les logs..."
    sleep 5
    echo ""
    echo "=== LOGS RÉCENTS ==="
    pm2 logs lespcdewarren --lines 20 --nostream
else
    echo ""
    echo "❌ Erreur lors du relancement"
    exit 1
fi

