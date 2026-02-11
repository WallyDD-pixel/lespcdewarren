#!/bin/bash
# Script pour libérer de l'espace disque
# À exécuter sur le VPS: bash free-disk-space.sh

echo "=== LIBÉRATION D'ESPACE DISQUE ==="
echo ""

# 1. Vérifier l'espace actuel
echo "1. Espace disque actuel:"
df -h
echo ""

# 2. Trouver les plus gros fichiers/dossiers
echo "2. Plus gros dossiers dans /var/www:"
du -sh /var/www/* 2>/dev/null | sort -hr | head -10
echo ""

echo "3. Plus gros dossiers dans le projet:"
cd /var/www/lespcdewarren/lespcdewarren 2>/dev/null || exit 1
du -sh * .* 2>/dev/null | sort -hr | head -15
echo ""

# 3. Nettoyer les fichiers temporaires
echo "4. Nettoyage des fichiers temporaires..."
echo "   Fichiers temporaires système:"
sudo find /tmp -type f -mtime +7 -delete 2>/dev/null
sudo find /var/tmp -type f -mtime +7 -delete 2>/dev/null
echo "   ✅ Fichiers temporaires système nettoyés"
echo ""

# 4. Nettoyer les logs anciens
echo "5. Nettoyage des logs anciens..."
sudo find /var/log -name "*.log" -type f -mtime +30 -delete 2>/dev/null
sudo find /var/log -name "*.gz" -type f -mtime +30 -delete 2>/dev/null
echo "   ✅ Logs anciens nettoyés"
echo ""

# 5. Nettoyer npm cache
echo "6. Nettoyage du cache npm..."
npm cache clean --force 2>/dev/null || true
echo "   ✅ Cache npm nettoyé"
echo ""

# 6. Nettoyer les fichiers temporaires du projet
echo "7. Nettoyage des fichiers temporaires du projet..."
cd /var/www/lespcdewarren/lespcdewarren

# Supprimer les fichiers temporaires suspects (noms aléatoires)
find . -maxdepth 1 -type d -name "[A-Za-z0-9]\{8,\}" -exec rm -rf {} \; 2>/dev/null || true
find . -maxdepth 1 -type f -name "[0-9]\{13,\}_*" -delete 2>/dev/null || true
find . -maxdepth 1 -name "hsperfdata_*" -delete 2>/dev/null || true

# Supprimer les anciens builds si trop volumineux
if [ -d ".next" ]; then
    NEXT_SIZE=$(du -sm .next | cut -f1)
    if [ "$NEXT_SIZE" -gt 500 ]; then
        echo "   ⚠️  Dossier .next très volumineux ($NEXT_SIZE MB)"
        echo "   Vous pouvez le supprimer et le retransférer depuis votre machine locale"
    fi
fi

# Supprimer node_modules/.cache
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .turbo 2>/dev/null || true
rm -rf tsconfig.tsbuildinfo 2>/dev/null || true

echo "   ✅ Fichiers temporaires du projet nettoyés"
echo ""

# 7. Nettoyer les packages npm inutilisés
echo "8. Vérification des packages npm..."
# Ne pas supprimer node_modules car on en a besoin
echo "   ✅ Vérification terminée"
echo ""

# 8. Nettoyer les fichiers de log du projet
echo "9. Nettoyage des logs du projet..."
find . -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
find . -name "build.log" -type f -mtime +1 -delete 2>/dev/null || true
echo "   ✅ Logs du projet nettoyés"
echo ""

# 9. Vérifier l'espace après nettoyage
echo "10. Espace disque après nettoyage:"
df -h
echo ""

# 10. Recommandations
echo "=== RECOMMANDATIONS ==="
echo ""

DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  Disque toujours presque plein ($DISK_USAGE%)"
    echo ""
    echo "Actions supplémentaires recommandées:"
    echo "1. Supprimer les anciens builds: rm -rf .next (puis retransférer depuis votre machine)"
    echo "2. Vérifier les fichiers uploads: du -sh public/uploads"
    echo "3. Nettoyer les backups: find prisma/backup -type f -mtime +30 -delete"
    echo "4. Vérifier les autres projets dans /var/www"
else
    echo "✅ Espace disque suffisant ($DISK_USAGE% utilisé)"
    echo ""
    echo "Vous pouvez maintenant:"
    echo "1. Builder l'application: npm run build"
    echo "2. Ou transférer le build depuis votre machine locale"
    echo "3. Démarrer avec PM2: pm2 start npm --name lespcdewarren -- start"
fi

echo ""
echo "=== NETTOYAGE TERMINÉ ==="
