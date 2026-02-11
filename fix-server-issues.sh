#!/bin/bash
# Script pour corriger automatiquement les problèmes courants du serveur
# À exécuter sur le VPS: bash fix-server-issues.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== CORRECTION DES PROBLÈMES DU SERVEUR ==="
echo ""

# 1. Créer un swap si nécessaire
if ! swapon --show | grep -q .; then
    echo "1. Création d'un swap file..."
    sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
    fi
    echo "✅ Swap créé"
    free -h
else
    echo "1. ✅ Swap déjà configuré"
fi
echo ""

# 2. Vérifier et nettoyer les processus zombies
echo "2. Nettoyage des processus..."
pm2 delete lespcdewarren 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
echo "✅ Processus nettoyés"
echo ""

# 3. Vérifier l'espace disque
echo "3. Vérification de l'espace disque..."
df -h | grep -E "Filesystem|/dev/"
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  Disque presque plein ($DISK_USAGE%)"
    echo "   Nettoyage des fichiers temporaires..."
    sudo find /tmp -type f -mtime +7 -delete 2>/dev/null
    sudo find /var/log -name "*.log" -mtime +30 -delete 2>/dev/null
    echo "✅ Nettoyage effectué"
else
    echo "✅ Espace disque OK ($DISK_USAGE% utilisé)"
fi
echo ""

# 4. Vérifier les permissions
echo "4. Vérification des permissions..."
if [ -d ".next" ]; then
    chmod -R 755 .next 2>/dev/null || true
    echo "✅ Permissions .next vérifiées"
else
    echo "⚠️  Dossier .next non trouvé"
fi
echo ""

# 5. Vérifier nginx
echo "5. Vérification de nginx..."
if command -v nginx > /dev/null 2>&1; then
    sudo nginx -t 2>&1 | grep -q "successful" && echo "✅ Configuration nginx OK" || echo "⚠️  Problème de configuration nginx"
    if ! systemctl is-active --quiet nginx; then
        echo "   Démarrage de nginx..."
        sudo systemctl start nginx
    fi
else
    echo "⚠️  Nginx non installé"
fi
echo ""

# 6. Vérifier Prisma
echo "6. Vérification de Prisma..."
if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate > /dev/null 2>&1 && echo "✅ Prisma OK" || echo "⚠️  Problème avec Prisma"
else
    echo "⚠️  Schéma Prisma non trouvé"
fi
echo ""

echo "=== CORRECTIONS TERMINÉES ==="
echo ""
echo "Prochaines étapes:"
echo "1. Si .next n'existe pas, transférez-le depuis votre machine locale"
echo "2. Démarrer l'application: pm2 start npm --name lespcdewarren -- start"
echo "3. Vérifier les logs: pm2 logs lespcdewarren"
echo ""
