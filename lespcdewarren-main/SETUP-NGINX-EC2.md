# Guide de configuration Nginx sur EC2

## Étape 1 : Installer et configurer Nginx

**Sur le serveur EC2, exécutez :**

```bash
# Transférer le script de configuration
scp -i "lespcdewarren.pem" setup-nginx-ec2.sh ec2-user@ec2-13-48-32-216.eu-north-1.compute.amazonaws.com:~/lespcdewarren/

# Puis sur le serveur
chmod +x setup-nginx-ec2.sh
sudo ./setup-nginx-ec2.sh
```

**Ou manuellement :**

```bash
# 1. Installer nginx
sudo yum update -y
sudo amazon-linux-extras install nginx1 -y

# 2. Créer la configuration
sudo nano /etc/nginx/conf.d/lespcdewarren.conf
```

**Contenu du fichier de configuration :**

```nginx
server {
    listen 80;
    server_name lespcdewarren.fr www.lespcdewarren.fr;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
```

```bash
# 3. Tester la configuration
sudo nginx -t

# 4. Démarrer nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl restart nginx

# 5. Vérifier le statut
sudo systemctl status nginx
```

## Étape 2 : Configurer le Security Group AWS

1. Allez dans la console AWS EC2
2. Sélectionnez votre instance
3. Cliquez sur l'onglet "Security"
4. Cliquez sur le Security Group
5. Ajoutez les règles suivantes :

**Règle entrante :**
- Type: HTTP
- Port: 80
- Source: 0.0.0.0/0

- Type: HTTPS
- Port: 443
- Source: 0.0.0.0/0

## Étape 3 : Configurer le DNS

Configurez votre DNS pour pointer vers l'IP publique de votre instance EC2 :

```
A     @              -> IP_PUBLIQUE_EC2
A     www            -> IP_PUBLIQUE_EC2
```

Pour obtenir l'IP publique :
```bash
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

## Étape 4 : Configurer SSL avec Let's Encrypt (optionnel mais recommandé)

```bash
# 1. Installer Certbot
sudo yum install certbot python3-certbot-nginx -y

# 2. Obtenir le certificat SSL
sudo certbot --nginx -d lespcdewarren.fr -d www.lespcdewarren.fr

# 3. Certbot configurera automatiquement nginx pour HTTPS
# 4. Le renouvellement automatique est configuré par défaut
```

## Vérification

```bash
# Tester depuis le serveur
curl http://localhost

# Tester depuis l'extérieur (remplacez par votre IP publique)
curl http://VOTRE_IP_PUBLIQUE

# Vérifier les logs nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Commandes utiles

```bash
# Redémarrer nginx
sudo systemctl restart nginx

# Recharger la configuration sans interruption
sudo nginx -s reload

# Vérifier la configuration
sudo nginx -t

# Voir les logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Dépannage

**Si nginx ne démarre pas :**
```bash
sudo nginx -t  # Vérifier les erreurs
sudo journalctl -u nginx -n 50  # Voir les logs système
```

**Si l'application n'est pas accessible :**
```bash
# Vérifier que PM2 est actif
pm2 list

# Vérifier que l'app écoute sur le port 3002
netstat -tuln | grep 3002

# Vérifier les logs PM2
pm2 logs lespcdewarren
```

