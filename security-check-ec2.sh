#!/bin/bash
# Script de vérification de sécurité après détection d'une tentative d'exécution de code malveillant

echo "=== VÉRIFICATION DE SÉCURITÉ ==="
echo ""

echo "1. Vérification des processus suspects..."
ps aux | grep -E "(wget|curl|sh)" | grep -v grep
echo ""

echo "2. Vérification des connexions réseau suspectes..."
netstat -tuln | grep -E "(178\.16\.52\.253|178\.16\.52)"
ss -tuln | grep -E "(178\.16\.52\.253|178\.16\.52)" || echo "Aucune connexion trouvée"
echo ""

echo "3. Recherche de scripts suspects dans le code..."
grep -r "178.16.52.253" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next 2>/dev/null || echo "Aucune référence trouvée dans le code"
echo ""

echo "4. Vérification des fichiers récemment modifiés..."
find . -type f -mtime -1 ! -path "./node_modules/*" ! -path "./.git/*" ! -path "./.next/*" -ls | head -20
echo ""

echo "5. Vérification des processus Node.js..."
ps aux | grep node | grep -v grep
echo ""

echo "6. Vérification des cron jobs..."
crontab -l 2>/dev/null || echo "Aucun cron job"
echo ""

echo "=== ACTIONS RECOMMANDÉES ==="
echo "1. Arrêter immédiatement l'application PM2"
echo "2. Vérifier le code source pour trouver d'où vient cette commande"
echo "3. Vérifier les logs système pour d'autres activités suspectes"
echo "4. Changer tous les mots de passe et clés API"
echo "5. Vérifier les fichiers de configuration pour des modifications suspectes"

