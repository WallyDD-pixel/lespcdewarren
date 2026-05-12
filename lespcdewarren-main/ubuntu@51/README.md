Backfill invoice numbers

Usage:

# Install ts-node if not present
npm install -D ts-node typescript @types/node

# Run the script (ensure DATABASE_URL and env vars are set)
npx ts-node scripts/backfill-invoice-numbers.ts

Notes:
- The script uses the `nextInvoiceNumber` helper, so it will increment the store and marketplace counters.
- Configure INVOICE_START_AT and INVOICE_PREFIX as needed before running.
