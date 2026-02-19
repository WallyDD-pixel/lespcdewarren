#!/bin/bash
# Script de correction de sécurité pour EC2
# À exécuter avec précaution après avoir arrêté l'application

echo "=== CORRECTION DE SÉCURITÉ ==="
echo ""
echo "⚠️  ATTENTION: Ce script va mettre à jour Next.js et corriger les vulnérabilités"
echo ""

# Vérifier que PM2 est arrêté
if pm2 list | grep -q "lespcdewarren.*online"; then
    echo "⚠️  L'application est encore en cours d'exécution!"
    read -p "Voulez-vous l'arrêter maintenant? (o/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        pm2 stop lespcdewarren
        echo "✅ Application arrêtée"
    else
        echo "❌ Veuillez arrêter l'application manuellement avant de continuer"
        exit 1
    fi
fi

echo ""
echo "1. Sauvegarde de package.json et package-lock.json..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null || echo "package-lock.json non trouvé"
echo "✅ Sauvegarde créée"
echo ""

echo "2. Mise à jour de Next.js (CRITIQUE - vulnérabilité RCE)..."
npm install next@latest
echo ""

echo "3. Correction des vulnérabilités non-breaking..."
npm audit fix
echo ""

echo "4. Vérification des vulnérabilités restantes..."
npm audit
echo ""

echo "5. Régénération du client Prisma..."
npx prisma generate
echo ""

echo "6. Build de l'application..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅✅✅ CORRECTIONS APPLIQUÉES AVEC SUCCÈS! ✅✅✅"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. Vérifier que le build fonctionne: ls -la .next"
    echo "  2. Redémarrer l'application: pm2 restart lespcdewarren"
    echo "  3. Surveiller les logs: pm2 logs lespcdewarren"
    echo "  4. Vérifier qu'il n'y a plus d'erreurs suspectes"
else
    echo ""
    echo "❌ Erreur lors du build"
    echo "   Restaurez les fichiers de sauvegarde si nécessaire:"
    echo "   cp package.json.backup package.json"
    echo "   cp package-lock.json.backup package-lock.json"
    exit 1
fi

