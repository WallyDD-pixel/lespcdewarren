#!/bin/bash
# Script pour résoudre le build bloqué sur EC2 (problème de mémoire)

echo "=== RÉSOLUTION DU BUILD BLOQUÉ ==="
echo ""

echo "1. Vérification de la mémoire..."
free -h
echo ""

echo "2. Vérification du swap..."
if swapon --show | grep -q .; then
    echo "✅ Swap actif:"
    swapon --show
else
    echo "⚠️  Pas de swap - création d'un swap de 2GB..."
    sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
    fi
    echo "✅ Swap créé"
    free -h
fi
echo ""

echo "3. Arrêt du build bloqué (si nécessaire)..."
pkill -9 -f "next build" || echo "Aucun processus de build trouvé"
echo ""

echo "4. Nettoyage des fichiers temporaires..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
echo "✅ Nettoyage terminé"
echo ""

echo "5. Build avec limite mémoire..."
export NODE_OPTIONS="--max-old-space-size=1024"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export JOBS=1

echo "Lancement du build (peut prendre 10-20 minutes)..."
echo ""

timeout 1800 npm run build 2>&1 | tee build.log

BUILD_EXIT=${PIPESTATUS[0]}

if [ $BUILD_EXIT -eq 0 ]; then
    echo ""
    echo "✅✅✅ BUILD RÉUSSI! ✅✅✅"
    if [ -d ".next" ]; then
        echo "✅ Dossier .next créé"
        du -sh .next
    fi
elif [ $BUILD_EXIT -eq 124 ]; then
    echo ""
    echo "❌ Build timeout (30 minutes)"
    echo "   Le serveur est trop lent ou manque de ressources"
    echo ""
    echo "Solution recommandée: Builder localement et transférer"
    echo "   Sur votre machine locale:"
    echo "   npm run build"
    echo "   tar -czf .next.tar.gz .next/"
    echo "   scp -i lespcdewarren.pem .next.tar.gz ec2-user@ec2-13-48-32-216.eu-north-1.compute.amazonaws.com:~/lespcdewarren/"
    echo ""
    echo "   Puis sur le serveur:"
    echo "   cd ~/lespcdewarren"
    echo "   rm -rf .next"
    echo "   tar -xzf .next.tar.gz"
    echo "   rm .next.tar.gz"
else
    echo ""
    echo "❌ Build échoué (code: $BUILD_EXIT)"
    if grep -qi "killed\|out of memory" build.log; then
        echo "⚠️  Problème de mémoire détecté!"
        echo "   Augmentez le swap ou builder localement"
    fi
    echo ""
    echo "Dernières erreurs:"
    tail -50 build.log
fi

