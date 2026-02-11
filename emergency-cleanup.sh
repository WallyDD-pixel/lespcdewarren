#!/bin/bash
# Nettoyage d'urgence pour libérer rapidement de l'espace
# À exécuter sur le VPS: bash emergency-cleanup.sh

echo "=== NETTOYAGE D'URGENCE ==="
echo ""

cd /var/www/lespcdewarren/lespcdewarren || exit 1

# Espace avant
echo "Espace avant:"
df -h / | tail -1
echo ""

# Nettoyages rapides
echo "Nettoyage en cours..."

# 1. Cache npm
npm cache clean --force 2>/dev/null || true

# 2. Fichiers temporaires système
sudo find /tmp -type f -delete 2>/dev/null || true
sudo find /var/tmp -type f -delete 2>/dev/null || true

# 3. Logs système
sudo find /var/log -name "*.log" -type f -delete 2>/dev/null || true
sudo find /var/log -name "*.gz" -type f -delete 2>/dev/null || true

# 4. Fichiers temporaires du projet
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .turbo 2>/dev/null || true
rm -rf .next/cache 2>/dev/null || true
find . -name "*.log" -type f -delete 2>/dev/null || true

# 5. Fichiers suspects
find . -maxdepth 1 -type d -name "[A-Za-z0-9]\{8,\}" -exec rm -rf {} \; 2>/dev/null || true
find . -maxdepth 1 -name "hsperfdata_*" -delete 2>/dev/null || true

# 6. Anciens builds (ATTENTION: supprime .next)
read -p "Supprimer le dossier .next? (o/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
    rm -rf .next
    echo "✅ Dossier .next supprimé (vous devrez le retransférer)"
fi

# Espace après
echo ""
echo "Espace après:"
df -h / | tail -1
echo ""

echo "✅ Nettoyage terminé"
