#!/bin/bash
# Script de diagnostic complet du serveur
# À exécuter sur le VPS: bash diagnose-server.sh

echo "=== DIAGNOSTIC COMPLET DU SERVEUR ==="
echo ""

# 1. Informations système
echo "1. INFORMATIONS SYSTÈME"
echo "   OS: $(uname -a)"
echo "   Uptime: $(uptime)"
echo "   Date: $(date)"
echo ""

# 2. Mémoire
echo "2. MÉMOIRE"
free -h
echo ""
echo "   Swap:"
swapon --show || echo "   ⚠️  Pas de swap configuré"
echo ""

# 3. Disque
echo "3. ESPACE DISQUE"
df -h
echo ""

# 4. CPU
echo "4. CHARGE CPU"
top -bn1 | head -5
echo ""

# 5. Processus Node.js/PM2
echo "5. PROCESSUS NODE.JS"
echo "   PM2:"
pm2 list 2>/dev/null || echo "   ⚠️  PM2 non configuré ou non démarré"
echo ""
echo "   Processus Node.js:"
ps aux | grep -E "node|next" | grep -v grep || echo "   Aucun processus Node.js actif"
echo ""

# 6. Ports en écoute
echo "6. PORTS EN ÉCOUTE"
echo "   Port 3001 (Next.js):"
lsof -i :3001 2>/dev/null || echo "   ⚠️  Port 3001 non utilisé"
echo ""
echo "   Port 80/443 (nginx):"
lsof -i :80 -i :443 2>/dev/null | head -5 || echo "   ⚠️  Ports HTTP/HTTPS non utilisés"
echo ""

# 7. Services système
echo "7. SERVICES SYSTÈME"
echo "   Nginx:"
sudo systemctl status nginx --no-pager -l 2>/dev/null | head -10 || echo "   ⚠️  Nginx non installé ou non démarré"
echo ""

# 8. Vérification du projet
echo "8. ÉTAT DU PROJET"
cd /var/www/lespcdewarren/lespcdewarren 2>/dev/null || {
    echo "   ❌ Répertoire du projet non trouvé"
    exit 1
}

echo "   Répertoire: $(pwd)"
echo "   Dossier .next:"
if [ -d ".next" ]; then
    echo "   ✅ Existe ($(du -sh .next | cut -f1))"
    ls -la .next | head -5
else
    echo "   ❌ N'existe pas"
fi
echo ""

echo "   Fichier .env:"
if [ -f ".env" ]; then
    echo "   ✅ Existe"
    echo "   Variables importantes:"
    grep -E "DATABASE_URL|NODE_ENV|PORT" .env | sed 's/=.*/=***/' || echo "   Variables non trouvées"
else
    echo "   ⚠️  N'existe pas"
fi
echo ""

echo "   Base de données:"
if [ -f "prisma/prod.db" ]; then
    echo "   ✅ Existe ($(du -h prisma/prod.db | cut -f1))"
    sqlite3 prisma/prod.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null && echo "   Tables accessibles" || echo "   ⚠️  Problème d'accès"
else
    echo "   ⚠️  prod.db non trouvé"
fi
echo ""

# 9. Logs récents
echo "9. LOGS RÉCENTS"
echo "   PM2 logs (dernières 20 lignes):"
pm2 logs lespcdewarren --lines 20 --nostream 2>/dev/null || echo "   Aucun log PM2 disponible"
echo ""

# 10. Vérification réseau
echo "10. CONNECTIVITÉ"
echo "   Ping Google:"
ping -c 2 8.8.8.8 2>/dev/null | tail -2 || echo "   ⚠️  Problème de connectivité"
echo ""

# 11. Erreurs système récentes
echo "11. ERREURS SYSTÈME RÉCENTES"
sudo journalctl -p err -n 10 --no-pager 2>/dev/null | tail -10 || echo "   Aucune erreur système récente"
echo ""

echo "=== RÉSUMÉ ==="
echo ""

# Vérifications critiques
ISSUES=0

if ! swapon --show | grep -q .; then
    echo "⚠️  Pas de swap configuré (peut causer des problèmes de mémoire)"
    ISSUES=$((ISSUES + 1))
fi

if [ ! -d ".next" ]; then
    echo "❌ Dossier .next manquant (build non effectué)"
    ISSUES=$((ISSUES + 1))
fi

if ! pm2 list | grep -q "lespcdewarren"; then
    echo "⚠️  Application PM2 non démarrée"
    ISSUES=$((ISSUES + 1))
fi

if ! lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  Port 3001 non utilisé (application non démarrée)"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✅ Aucun problème critique détecté"
else
    echo ""
    echo "🔧 ACTIONS RECOMMANDÉES:"
    echo ""
    if ! swapon --show | grep -q .; then
        echo "1. Créer un swap: sudo bash create-swap.sh"
    fi
    if [ ! -d ".next" ]; then
        echo "2. Transférer le build depuis votre machine locale: .\transfer-build.ps1"
    fi
    if ! pm2 list | grep -q "lespcdewarren"; then
        echo "3. Démarrer PM2: pm2 start npm --name lespcdewarren -- start"
    fi
fi

echo ""
echo "=== FIN DU DIAGNOSTIC ==="
