#!/bin/bash
# Script pour résoudre le conflit git pull sur EC2

echo "=== RÉSOLUTION DU CONFLIT GIT PULL ==="
echo ""

# Option 1: Supprimer le fichier local et récupérer la version distante
echo "Option 1: Supprimer le fichier local..."
echo "rm setup-nginx-ec2.sh"
echo "git pull"
echo ""

# Option 2: Sauvegarder le fichier local puis récupérer la version distante
echo "Option 2: Sauvegarder le fichier local..."
echo "mv setup-nginx-ec2.sh setup-nginx-ec2.sh.local"
echo "git pull"
echo "# Comparer les deux versions si nécessaire"
echo ""

# Option 3: Ajouter le fichier à git puis pull
echo "Option 3: Ajouter le fichier à git..."
echo "git add setup-nginx-ec2.sh"
echo "git commit -m 'Add setup-nginx-ec2.sh'"
echo "git pull"
echo ""

echo "Recommandation: Utiliser l'option 1 si vous voulez la version distante"
echo "                 Utiliser l'option 2 si vous voulez garder votre version locale"

