-- Migration: add marketplace invoices (SQLite-safe)

-- AlterTable (MarketplaceOrder)
ALTER TABLE "MarketplaceOrder" ADD COLUMN "invoiceCustomerAddr1" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "invoiceCustomerCity" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "invoiceCustomerName" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "invoiceCustomerZip" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "invoiceNotes" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "invoiceSentAt" DATETIME;

-- AlterTable (Order)
ALTER TABLE "Order" ADD COLUMN "invoiceCustomerAddr1" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceCustomerCity" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceCustomerName" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceCustomerZip" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceNotes" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceSentAt" DATETIME;

-- Keep Setting table (no destructive drop in prod)
-- PRAGMA foreign_keys=off;
-- DROP TABLE IF EXISTS "Setting";
-- PRAGMA foreign_keys=on;

-- CreateTable (MarketplaceCase)
CREATE TABLE IF NOT EXISTS "MarketplaceCase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT,
    "description" TEXT,
    "photos" TEXT,
    "returnTrackingNumber" TEXT,
    "returnTrackingUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketplaceCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MarketplaceCase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MarketplaceCase_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "MarketplaceCase_orderId_idx" ON "MarketplaceCase"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_invoiceNumber_key" ON "MarketplaceOrder"("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_invoiceNumber_key" ON "Order"("invoiceNumber");
