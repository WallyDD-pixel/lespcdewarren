# Instructions de déploiement - Correction shippingPhone

## Fichiers à transférer sur le VPS

```bash
# Depuis votre machine Windows (PowerShell)
scp prisma\schema.prisma ubuntu@51.38.236.183:/var/www/lespcdewarren/lespcdewarren/prisma/
scp src\app\api\admin\orders\create\route.ts ubuntu@51.38.236.183:/var/www/lespcdewarren/lespcdewarren/src/app/api/admin/orders/create/
scp src\app\api\paypal\capture\route.ts ubuntu@51.38.236.183:/var/www/lespcdewarren/lespcdewarren/src/app/api/paypal/capture/
scp src\app\api\admin\orders\[id]\route.ts ubuntu@51.38.236.183:/var/www/lespcdewarren/lespcdewarren/src/app/api/admin/orders/[id]/
scp src\app\admin\contest\page.tsx ubuntu@51.38.236.183:/var/www/lespcdewarren/lespcdewarren/src/app/admin/contest/
scp src\app\dashboard\page.tsx ubuntu@51.38.236.183:/var/www/lespcdewarren/lespcdewarren/src/app/dashboard/
```

## Commandes à exécuter sur le VPS

```bash
# Se connecter au VPS
ssh ubuntu@51.38.236.183

# Aller dans le répertoire du projet
cd /var/www/lespcdewarren/lespcdewarren

# Arrêter l'application
pm2 stop lespcdewarren

# Supprimer le cache Next.js
rm -rf .next

# Régénérer le client Prisma
npx prisma generate

# Reconstruire l'application
npm run build

# Redémarrer l'application
pm2 start lespcdewarren

# Vérifier les logs
pm2 logs lespcdewarren --lines 50
```

## Modifications effectuées

1. ✅ Retiré `shippingPhone` du modèle `Order` dans `prisma/schema.prisma`
2. ✅ Le téléphone est maintenant stocké dans `invoiceNotes` (JSON) dans les routes de création
3. ✅ Le dashboard lit le téléphone depuis `invoiceNotes` au lieu de `shippingPhone`
4. ✅ Amélioration du logging dans `/api/admin/orders/create` pour diagnostiquer les erreurs

