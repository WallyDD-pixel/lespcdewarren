-- Migration pour retirer les méthodes de paiement en 4x (STRIPE_ONLINE_4X et CB_ONLINE_4X)
-- Stripe ne propose pas de paiement en 4x direct comme PayPal

-- 1. Mettre à jour les commandes existantes qui utilisent STRIPE_ONLINE_4X vers STRIPE_ONLINE_1X
UPDATE "MarketplaceOrder" SET "paymentMethod" = 'STRIPE_ONLINE_1X' WHERE "paymentMethod" = 'STRIPE_ONLINE_4X';
UPDATE "Order" SET "paymentMethod" = 'STRIPE_ONLINE_1X' WHERE "paymentMethod" = 'STRIPE_ONLINE_4X';

-- 2. Mettre à jour les commandes existantes qui utilisent CB_ONLINE_4X vers CB_ONLINE_1X
UPDATE "MarketplaceOrder" SET "paymentMethod" = 'CB_ONLINE_1X' WHERE "paymentMethod" = 'CB_ONLINE_4X';
UPDATE "Order" SET "paymentMethod" = 'CB_ONLINE_1X' WHERE "paymentMethod" = 'CB_ONLINE_4X';

-- Note: L'enum PaymentMethod sera mis à jour dans le schéma Prisma pour retirer STRIPE_ONLINE_4X et CB_ONLINE_4X

