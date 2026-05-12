const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    const file = path.join(__dirname, '..', 'data', 'testimonials.json');
    const raw = fs.readFileSync(file, 'utf8');
    const items = JSON.parse(raw);

    const data = items.map((i) => ({
      name: i.name,
      country: i.country || null,
      rating: Math.max(1, Math.min(5, Number(i.rating) || 5)),
      title: i.title || null,
      content: i.content || '',
      experienceDate: i.experienceDate ? new Date(i.experienceDate) : null,
      source: i.source || 'import',
      published: i.published !== undefined ? !!i.published : true,
      createdAt: i.createdAt ? new Date(i.createdAt) : new Date(),
    }));

    console.log(`Importing ${data.length} testimonials...`);
    let inserted = 0;
    for (const d of data) {
      try {
        await prisma.testimonial.create({ data: d });
        inserted += 1;
      } catch (err) {
        const msg = String(err && err.message ? err.message : err);
        if (msg.includes('Unique') || msg.includes('duplicate') || msg.includes('already exists')) {
          continue;
        }
        console.warn('Failed to insert testimonial:', msg);
      }
    }
    console.log('Inserted:', inserted);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
