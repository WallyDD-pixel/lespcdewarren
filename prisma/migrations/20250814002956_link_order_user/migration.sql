-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeId" TEXT,
    "shippingName" TEXT,
    "shippingAddr1" TEXT,
    "shippingAddr2" TEXT,
    "shippingZip" TEXT,
    "shippingCity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" INTEGER,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("amountCents", "createdAt", "currency", "email", "id", "shippingAddr1", "shippingAddr2", "shippingCity", "shippingName", "shippingZip", "status", "stripeId", "updatedAt") SELECT "amountCents", "createdAt", "currency", "email", "id", "shippingAddr1", "shippingAddr2", "shippingCity", "shippingName", "shippingZip", "status", "stripeId", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_stripeId_key" ON "Order"("stripeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
