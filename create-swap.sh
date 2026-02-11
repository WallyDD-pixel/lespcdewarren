#!/bin/bash
# Script pour créer un swap file et permettre le build
# À exécuter sur le VPS avec sudo: sudo bash create-swap.sh

echo "=== CRÉATION D'UN SWAP FILE ==="
echo ""

# Vérifier si un swap existe déjà
if swapon --show | grep -q .; then
    echo "✅ Swap déjà actif:"
    swapon --show
    free -h
    exit 0
fi

echo "1. Création d'un fichier swap de 2GB..."
sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la création du fichier swap"
    exit 1
fi

echo "2. Configuration des permissions..."
sudo chmod 600 /swapfile

echo "3. Formatage du swap..."
sudo mkswap /swapfile

echo "4. Activation du swap..."
sudo swapon /swapfile

echo "5. Vérification..."
free -h
echo ""

echo "6. Ajout au fstab pour persistance au reboot..."
if ! grep -q "/swapfile" /etc/fstab; then
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
    echo "✅ Swap ajouté au fstab"
else
    echo "✅ Swap déjà dans fstab"
fi

echo ""
echo "✅ Swap créé et activé avec succès!"
echo ""
echo "Mémoire disponible:"
free -h
