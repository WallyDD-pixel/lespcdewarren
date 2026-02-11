#!/bin/bash
# Script pour vérifier et configurer PM2
# À exécuter sur le VPS: bash setup-pm2.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== CONFIGURATION PM2 ==="
echo ""

# 1. Vérifier si PM2 est installé
echo "1. Vérification de PM2..."
if command -v pm2 > /dev/null 2>&1; then
    echo "✅ PM2 est installé"
    pm2 --version
else
    echo "❌ PM2 n'est pas installé"
    echo "   Installation de PM2..."
    sudo npm install -g pm2
    if [ $? -eq 0 ]; then
        echo "✅ PM2 installé"
    else
        echo "❌ Erreur lors de l'installation de PM2"
        exit 1
    fi
fi
echo ""

# 2. Vérifier l'état de PM2
echo "2. État de PM2:"
pm2 list
echo ""

# 3. Vérifier si le build existe
echo "3. Vérification du build..."
if [ -d ".next" ]; then
    echo "✅ Dossier .next existe"
    echo "   Taille: $(du -sh .next | cut -f1)"
else
    echo "❌ Dossier .next n'existe pas"
    echo "   Vous devez transférer le build depuis votre machine locale"
    echo "   Ou builder sur le VPS (peut échouer par manque de mémoire)"
    exit 1
fi
echo ""

# 4. Vérifier le fichier .env
echo "4. Vérification de .env..."
if [ -f ".env" ]; then
    echo "✅ Fichier .env existe"
else
    echo "⚠️  Fichier .env manquant"
fi
echo ""

# 5. Arrêter les anciens processus PM2 s'ils existent
echo "5. Nettoyage des anciens processus..."
pm2 delete lespcdewarren 2>/dev/null || true
pm2 kill 2>/dev/null || true
pm2 resurrect 2>/dev/null || true
echo "✅ Nettoyage terminé"
echo ""

# 6. Vérifier Prisma
echo "6. Génération Prisma..."
npx prisma generate > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Prisma OK"
else
    echo "⚠️  Problème avec Prisma (peut continuer)"
fi
echo ""

# 7. Démarrer l'application avec PM2
echo "7. Démarrage de l'application..."
pm2 start npm --name lespcdewarren -- start

if [ $? -eq 0 ]; then
    echo "✅ Application démarrée!"
    echo ""
    
    # Attendre un peu
    sleep 2
    
    # Afficher l'état
    echo "8. État de l'application:"
    pm2 list
    echo ""
    
    echo "9. Logs (dernières 20 lignes):"
    pm2 logs lespcdewarren --lines 20 --nostream
    echo ""
    
    echo "✅✅✅ CONFIGURATION TERMINÉE! ✅✅✅"
    echo ""
    echo "Commandes utiles:"
    echo "  pm2 list              - Voir les processus"
    echo "  pm2 logs lespcdewarren - Voir les logs en temps réel"
    echo "  pm2 restart lespcdewarren - Redémarrer"
    echo "  pm2 stop lespcdewarren    - Arrêter"
    echo "  pm2 save                 - Sauvegarder la configuration"
    echo ""
    
    # Sauvegarder la configuration PM2
    pm2 save
    pm2 startup 2>/dev/null || echo "⚠️  Pour démarrer PM2 au boot, exécutez: pm2 startup"
else
    echo "❌ Erreur lors du démarrage"
    echo ""
    echo "Vérifiez les logs pour plus d'informations:"
    echo "  pm2 logs lespcdewarren"
fi
