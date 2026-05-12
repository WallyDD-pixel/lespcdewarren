/*
  Warnings:

  - You are about to drop the `Setting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to alter the column `photos` on the `MarketplaceCase` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Setting";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CompletePC" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "imageUrl" TEXT,
    "specs" JSONB,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MarketplaceCase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT,
    "description" TEXT,
    "photos" JSONB,
    "returnTrackingNumber" TEXT,
    "returnTrackingUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketplaceCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MarketplaceCase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MarketplaceCase_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MarketplaceCase" ("buyerId", "createdAt", "description", "id", "kind", "orderId", "photos", "reason", "returnTrackingNumber", "returnTrackingUrl", "sellerId", "status", "updatedAt") SELECT "buyerId", "createdAt", "description", "id", "kind", "orderId", "photos", "reason", "returnTrackingNumber", "returnTrackingUrl", "sellerId", "status", "updatedAt" FROM "MarketplaceCase";
DROP TABLE "MarketplaceCase";
ALTER TABLE "new_MarketplaceCase" RENAME TO "MarketplaceCase";
CREATE INDEX "MarketplaceCase_orderId_idx" ON "MarketplaceCase"("orderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CompletePC_slug_key" ON "CompletePC"("slug");
