import { PrismaClient } from '@prisma/client';
import { nextInvoiceNumber } from '../src/lib/invoiceCounter';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Backfilling invoice numbers for store orders...');
    const orders = await prisma.order.findMany({ where: { invoiceNumber: null }, orderBy: { id: 'asc' } });
    for (const o of orders) {
      const prefix = process.env.INVOICE_PREFIX || '';
      const startAt = Number(process.env.INVOICE_START_AT || 1500);
      const inv = await nextInvoiceNumber('store_invoice_counter', prefix, startAt);
      await prisma.order.update({ where: { id: o.id }, data: { invoiceNumber: inv } });
      console.log(`Updated order ${o.id} -> ${inv}`);
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error during backfill', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
