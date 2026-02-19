#!/bin/bash
# Script pour configurer nginx comme reverse proxy sur EC2
# À exécuter sur le serveur EC2 avec sudo: sudo bash setup-nginx-ec2.sh

echo "=== CONFIGURATION NGINX POUR EC2 ==="
echo ""

# Vérifier si nginx est installé
if ! command -v nginx &> /dev/null; then
    echo "1. Installation de nginx..."
    sudo yum update -y
    sudo amazon-linux-extras install nginx1 -y || sudo yum install nginx -y
    echo "✅ Nginx installé"
else
    echo "✅ Nginx déjà installé"
fi
echo ""

# Créer la configuration nginx
echo "2. Création de la configuration nginx..."
DOMAIN="lespcdewarren.fr"
APP_PORT="3002"

sudo tee /etc/nginx/conf.d/lespcdewarren.conf > /dev/null << EOF
# Configuration pour lespcdewarren.fr
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Redirection vers HTTPS (décommentez après avoir configuré SSL)
    # return 301 https://\$server_name\$request_uri;

    # Configuration temporaire HTTP (à remplacer par HTTPS)
    location / {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Augmenter la taille maximale des uploads
    client_max_body_size 50M;
}

# Configuration HTTPS (à activer après avoir obtenu le certificat SSL)
# server {
#     listen 443 ssl http2;
#     server_name ${DOMAIN} www.${DOMAIN};
#
#     ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     ssl_prefer_server_ciphers on;
#
#     location / {
#         proxy_pass http://localhost:${APP_PORT};
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade \$http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#         proxy_cache_bypass \$http_upgrade;
#     }
#
#     client_max_body_size 50M;
# }
EOF

echo "✅ Configuration créée dans /etc/nginx/conf.d/lespcdewarren.conf"
echo ""

# Tester la configuration
echo "3. Test de la configuration nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuration valide"
    echo ""
    
    # Démarrer/redémarrer nginx
    echo "4. Démarrage de nginx..."
    sudo systemctl enable nginx
    sudo systemctl start nginx
    sudo systemctl restart nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx démarré"
        echo ""
        echo "5. Vérification du statut..."
        sudo systemctl status nginx --no-pager | head -10
        echo ""
        echo "✅✅✅ NGINX CONFIGURÉ AVEC SUCCÈS! ✅✅✅"
        echo ""
        echo "Prochaines étapes:"
        echo "  1. Configurez votre DNS pour pointer vers l'IP publique: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'IP_PUBLIQUE')"
        echo "  2. Ouvrez les ports 80 et 443 dans le Security Group AWS"
        echo "  3. Installez Certbot pour SSL: sudo yum install certbot python3-certbot-nginx -y"
        echo "  4. Obtenez le certificat SSL: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
        echo "  5. Décommentez les lignes HTTPS dans /etc/nginx/conf.d/lespcdewarren.conf"
    else
        echo "❌ Erreur lors du démarrage de nginx"
        exit 1
    fi
else
    echo "❌ Erreur dans la configuration nginx"
    exit 1
fi

