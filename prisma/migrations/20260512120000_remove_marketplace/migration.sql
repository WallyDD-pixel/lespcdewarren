-- Remove marketplace-related tables (SQLite)
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS "MessageImage";
DROP TABLE IF EXISTS "Message";
DROP TABLE IF EXISTS "MarketplaceCase";
DROP TABLE IF EXISTS "MarketplaceOrder";
DROP TABLE IF EXISTS "Conversation";
DROP TABLE IF EXISTS "FavoriteListing";
DROP TABLE IF EXISTS "ListingImage";
DROP TABLE IF EXISTS "Listing";
DROP TABLE IF EXISTS "WithdrawalRequest";

PRAGMA foreign_keys = ON;
