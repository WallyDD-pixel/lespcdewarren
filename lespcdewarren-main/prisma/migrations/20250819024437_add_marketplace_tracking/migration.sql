-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "country" TEXT;

-- AlterTable
ALTER TABLE "MarketplaceOrder" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "trackingUrl" TEXT;

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sellerId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paypalEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "payoutBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processedAt" DATETIME,
    CONSTRAINT "WithdrawalRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "link" TEXT,
    "data" JSONB,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WithdrawalRequest_sellerId_idx" ON "WithdrawalRequest"("sellerId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
