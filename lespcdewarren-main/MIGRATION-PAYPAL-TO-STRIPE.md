# Guide de Migration : PayPal → Stripe

Ce guide détaille toutes les étapes pour remplacer PayPal par Stripe comme unique méthode de paiement.

## ✅ Étapes Complétées

1. ✅ Migration Prisma créée (`20260219000000_replace_paypal_with_stripe`)
2. ✅ Schéma Prisma mis à jour (PaymentMethod enum et champs Stripe)
3. ✅ Route API Stripe marketplace créée (`/api/stripe/marketplace/create-session`)
4. ✅ Route checkout-success mise à jour pour gérer le marketplace

## 📋 Étapes Restantes

### 1. Appliquer la Migration Prisma

```bash
# Générer le client Prisma avec les nouveaux champs
npx prisma generate

# Appliquer la migration (en développement)
npx prisma migrate dev --name replace_paypal_with_stripe

# Ou en production
npx prisma migrate deploy
```

### 2. Mettre à jour le Composant Checkout

Le fichier `src/app/checkout/page.tsx` doit être modifié pour :
- Supprimer toutes les références à PayPal SDK
- Utiliser Stripe Checkout Session au lieu de PayPal
- Rediriger vers Stripe Checkout au lieu d'utiliser les boutons PayPal

**Changements principaux :**
- Remplacer `loadPayPalSDK` par une redirection vers `/api/stripe/create-checkout-session`
- Supprimer les boutons PayPal (PayPal, Pay Later)
- Utiliser uniquement Stripe Checkout pour les paiements

### 3. Mettre à jour les Composants UI

**Fichiers à modifier :**
- `src/components/Footer.tsx` - Remplacer "PayPal" par "Stripe"
- `src/app/page.tsx` - Mettre à jour les mentions de paiement
- `src/app/faq/page.tsx` - Mettre à jour les FAQ sur les paiements

**Rechercher et remplacer :**
```typescript
// Remplacer toutes les mentions de PayPal par Stripe
"PayPal" → "Stripe"
"paypal" → "stripe"
```

### 4. Mettre à jour les Pages Success et Marketplace

**Fichiers à modifier :**
- `src/app/success/page.tsx` - Gérer `provider=stripe` au lieu de `provider=paypal`
- `src/app/marketplace/[id]/page.tsx` - Utiliser la nouvelle route Stripe marketplace
- Supprimer `src/components/PayPalMarketplaceButtons.tsx` (remplacé par Stripe)

### 5. Mettre à jour les Routes API Marketplace

**Fichier : `src/app/api/marketplace/orders/route.ts`**

Modifier la méthode `POST` pour utiliser Stripe au lieu de PayPal :
- Remplacer l'appel à `paypalCreateOrder` par un appel à `/api/stripe/marketplace/create-session`
- Mettre à jour le `paymentMethod` pour utiliser `STRIPE_ONLINE_1X`

Modifier la méthode `PUT` pour gérer Stripe :
- Remplacer la capture PayPal par la vérification de la session Stripe
- Utiliser `stripePaymentIntentId` et `stripeSessionId` au lieu de `paypalOrderId` et `paypalCaptureId`

### 6. Mettre à jour les Variables d'Environnement

**Fichier `.env` :**
```env
# Supprimer (optionnel, garder pour référence historique)
# PAYPAL_ENV=
# PAYPAL_CLIENT_ID=
# PAYPAL_SECRET=

# Ajouter/Configurer Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 7. Configurer Stripe dans les Settings Admin

Dans `src/app/admin/settings/page.tsx`, supprimer les champs PayPal et garder uniquement Stripe.

### 8. Mettre à jour les Templates d'Email

**Fichier : `src/lib/emailTemplates.ts`**
- Remplacer les mentions de "PayPal" par "Stripe" dans les emails de commande

### 9. Supprimer les Fichiers PayPal Obsolètes

Une fois la migration complète, supprimer :
- `src/lib/paypal.ts`
- `src/components/PayPalMarketplaceButtons.tsx`
- `src/app/api/paypal/**` (tous les fichiers dans ce dossier)
- `src/app/api/marketplace/paypal/**`

### 10. Mettre à jour les Scripts de Migration

Si vous avez des scripts de migration de données PayPal, les mettre à jour pour Stripe.

## 🔧 Configuration Stripe

### Créer un Compte Stripe

1. Aller sur https://stripe.com
2. Créer un compte
3. Récupérer les clés API (test et production)

### Configurer les Webhooks

1. Dans le dashboard Stripe → Webhooks
2. Ajouter un endpoint : `https://votre-domaine.com/api/stripe/webhook`
3. Sélectionner les événements :
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copier le secret du webhook dans `.env`

### Tester en Mode Test

Utiliser les clés de test Stripe :
- Clé secrète : `sk_test_...`
- Clé publique : `pk_test_...`

## 📝 Checklist de Migration

- [ ] Migration Prisma appliquée
- [ ] Client Prisma régénéré
- [ ] Variables d'environnement Stripe configurées
- [ ] Composant checkout mis à jour
- [ ] Routes API marketplace mises à jour
- [ ] Composants UI mis à jour (Footer, page.tsx, FAQ)
- [ ] Pages success et marketplace mises à jour
- [ ] Templates d'email mis à jour
- [ ] Webhooks Stripe configurés
- [ ] Tests en mode test effectués
- [ ] Fichiers PayPal obsolètes supprimés
- [ ] Migration testée en production

## ⚠️ Notes Importantes

1. **Données Historiques** : Les champs `paypalOrderId` et `paypalCaptureId` sont conservés dans le schéma pour référence historique. Les anciennes commandes PayPal resteront accessibles.

2. **Paiement en 4x** : Si vous souhaitez garder le paiement en 4x, vous devrez utiliser Stripe Installments (disponible dans certains pays). Sinon, supprimez `STRIPE_ONLINE_4X` de l'enum.

3. **Marketplace** : La nouvelle route `/api/stripe/marketplace/create-session` gère maintenant les commandes marketplace avec Stripe.

4. **Tests** : Tester soigneusement en mode test avant de passer en production.

## 🚀 Après la Migration

1. Vérifier que toutes les commandes passent bien par Stripe
2. Monitorer les logs Stripe pour détecter les erreurs
3. Vérifier que les emails de confirmation sont envoyés
4. Tester les remboursements si nécessaire

## 📞 Support

En cas de problème, vérifier :
- Les logs Stripe dans le dashboard
- Les logs de l'application
- La configuration des webhooks
- Les variables d'environnement

