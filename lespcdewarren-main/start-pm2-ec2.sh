#!/bin/bash
# Script pour lancer PM2 sur EC2 depuis le répertoire actuel

echo "=== Configuration PM2 pour EC2 ==="
echo ""

# Obtenir le répertoire actuel
CURRENT_DIR=$(pwd)
echo "Répertoire actuel: $CURRENT_DIR"
echo ""

# Créer le dossier logs s'il n'existe pas
echo "1. Création du dossier logs..."
mkdir -p logs
if [ $? -eq 0 ]; then
    echo "✅ Dossier logs créé"
else
    echo "❌ Erreur lors de la création du dossier logs"
    exit 1
fi
echo ""

# Vérifier que package.json existe
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé"
    echo "   Exécutez ce script depuis le répertoire du projet"
    exit 1
fi

# Créer un fichier ecosystem temporaire avec le bon chemin
echo "2. Création de la configuration PM2..."
cat > ecosystem-ec2.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'lespcdewarren',
      script: 'npm',
      args: 'start',
      cwd: '$CURRENT_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '$CURRENT_DIR/logs/pm2-error.log',
      out_file: '$CURRENT_DIR/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
EOF
echo "✅ Configuration créée dans ecosystem-ec2.config.js"
echo ""

# Vérifier si l'application est déjà en cours d'exécution
echo "3. Vérification de l'état PM2..."
pm2 list | grep -q lespcdewarren
if [ $? -eq 0 ]; then
    echo "⚠️  L'application est déjà en cours d'exécution"
    read -p "Voulez-vous la redémarrer? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        echo "Arrêt de l'application..."
        pm2 stop lespcdewarren
        pm2 delete lespcdewarren
        echo "✅ Application arrêtée"
    else
        echo "Annulation"
        exit 0
    fi
fi
echo ""

# Lancer PM2
echo "4. Lancement de l'application avec PM2..."
pm2 start ecosystem-ec2.config.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅✅✅ Application lancée avec succès! ✅✅✅"
    echo ""
    echo "Commandes utiles:"
    echo "  pm2 list              - Voir les applications en cours"
    echo "  pm2 logs lespcdewarren - Voir les logs"
    echo "  pm2 stop lespcdewarren - Arrêter l'application"
    echo "  pm2 restart lespcdewarren - Redémarrer l'application"
    echo "  pm2 monit             - Monitorer en temps réel"
    echo ""
    pm2 list
else
    echo ""
    echo "❌ Erreur lors du lancement"
    echo "Vérifiez les logs avec: pm2 logs lespcdewarren"
    exit 1
fi

