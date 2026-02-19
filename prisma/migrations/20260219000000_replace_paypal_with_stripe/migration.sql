-- Migration: Remplacer PayPal par Stripe
-- Cette migration remplace tous les champs et enums PayPal par Stripe

-- 1. Mettre à jour l'enum PaymentMethod pour remplacer PayPal par Stripe
-- Note: SQLite ne supporte pas ALTER TYPE, donc on doit recréer la table

-- 2. Ajouter les nouveaux champs Stripe dans MarketplaceOrder
ALTER TABLE "MarketplaceOrder" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "stripeSessionId" TEXT;

-- 3. Migrer les données existantes (si paypalOrderId existe, on peut le garder temporairement)
-- Les anciennes commandes PayPal resteront avec paypalOrderId pour référence historique

-- 4. Mettre à jour les valeurs de PaymentMethod dans MarketplaceOrder
-- PAYPAL_ONLINE_1X -> STRIPE_ONLINE_1X
-- PAYPAL_ONLINE_4X -> STRIPE_ONLINE_4X (si vous gardez le paiement en 4x)
UPDATE "MarketplaceOrder" SET "paymentMethod" = 'STRIPE_ONLINE_1X' WHERE "paymentMethod" = 'PAYPAL_ONLINE_1X';
UPDATE "MarketplaceOrder" SET "paymentMethod" = 'STRIPE_ONLINE_4X' WHERE "paymentMethod" = 'PAYPAL_ONLINE_4X';

-- 5. Mettre à jour les valeurs dans Order (si vous avez un champ paymentMethod)
-- Note: Order n'a pas de champ paymentMethod dans le schéma actuel, donc on skip cette partie

-- 6. Créer un index sur stripePaymentIntentId pour les recherches rapides
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_stripePaymentIntentId_idx" ON "MarketplaceOrder"("stripePaymentIntentId");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_stripeSessionId_idx" ON "MarketplaceOrder"("stripeSessionId");

