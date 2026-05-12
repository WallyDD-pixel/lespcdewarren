#!/bin/bash
# Script pour nettoyer les fichiers temporaires suspects
# À exécuter sur le VPS: bash cleanup-temp-files.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== NETTOYAGE DES FICHIERS TEMPORAIRES ==="
echo ""

# Lister les fichiers suspects (noms aléatoires de 8+ caractères sans extension)
SUSPICIOUS_FILES=$(ls -1 | grep -E "^[A-Za-z0-9]{8,}$" | grep -v "node_modules" | grep -v ".next")

if [ -z "$SUSPICIOUS_FILES" ]; then
    echo "✅ Aucun fichier suspect trouvé"
    exit 0
fi

echo "Fichiers suspects trouvés:"
echo "$SUSPICIOUS_FILES"
echo ""

# Vérifier qu'ils ne sont pas des processus actifs
echo "Vérification des processus actifs..."
for file in $SUSPICIOUS_FILES; do
    if lsof "$file" > /dev/null 2>&1; then
        echo "⚠️  $file est utilisé par un processus - ne sera pas supprimé"
    fi
done
echo ""

# Demander confirmation
read -p "Voulez-vous supprimer ces fichiers? (o/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "Annulé"
    exit 0
fi

# Supprimer les fichiers et dossiers
echo "Suppression en cours..."
for file in $SUSPICIOUS_FILES; do
    # Vérifier si utilisé par un processus
    if lsof "$file" > /dev/null 2>&1; then
        echo "  ⚠️  Ignoré (utilisé): $file"
        continue
    fi
    
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "  ✅ Supprimé: $file"
    elif [ -d "$file" ]; then
        rm -rf "$file"
        echo "  ✅ Supprimé: $file/"
    fi
done

echo ""
echo "✅ Nettoyage terminé"
