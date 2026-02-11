// Chargement dynamique de pdfkit pour éviter les soucis d'ESM (fontkit/@swc/helpers) avec le bundler
function loadPdfKit() {
  // eslint-disable-next-line no-eval
  const req: any = eval('require');
  return req('pdfkit');
}

export type InvoiceItem = { description: string; quantity: number; unitPriceCents: number };

export function generateInvoicePdf(opts: {
  invoiceNumber: string;
  company: { name: string; address?: string; vat?: string };
  customer: { name?: string; email: string; address1?: string; zip?: string; city?: string };
  currency: string;
  items: InvoiceItem[];
  shippingCents?: number;
  notes?: string;
}): Promise<Buffer> {
  return new Promise((resolve) => {
    const PDFDocument = loadPdfKit();
    // Marges réduites pour maximiser l'espace utile
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: any) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Couleurs (alignées sur le thème: var(--accent) et --accent-2)
    const ACCENT = '#6d28d9';
    const ACCENT_2 = '#8b5cf6';
    const TEXT = '#111827';
    const SUBTLE = '#6b7280';
    const LINE = '#e5e7eb';
    const ZEBRA = '#f5f3ff'; // léger violet clair

    const fmt = (cents: number) => `${(cents / 100).toFixed(2)} ${opts.currency}`;
    const subtotal = opts.items.reduce((s, i) => s + i.unitPriceCents * Math.max(1, i.quantity), 0);
    const shipping = Math.max(0, opts.shippingCents || 0);
    const total = subtotal + shipping;

    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageBottom = doc.page.height - doc.page.margins.bottom;

    // En-tête société
    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(18).text(opts.company.name);
    doc.moveDown(0.15);
    doc.font('Helvetica').fontSize(9.5).fillColor(SUBTLE);
    if (opts.company.address) doc.text(opts.company.address);
    if (opts.company.vat) doc.text(`TVA: ${opts.company.vat}`);

    // Encadré Facture en haut droite
    const boxW = 190, boxH = 50;
    const boxX = doc.page.width - doc.page.margins.right - boxW;
    const boxY = 40;
    doc.roundedRect(boxX, boxY, boxW, boxH, 6).strokeColor(ACCENT).lineWidth(1).stroke();
    doc.rect(boxX, boxY, boxW, 18).fill(ACCENT);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10.5).text('FACTURE', boxX + 10, boxY + 4);
    doc.fillColor(TEXT).font('Helvetica').fontSize(9.5);
    doc.text(`N°: ${opts.invoiceNumber}`, boxX + 10, boxY + 22);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, boxX + 10, boxY + 34);

    // Bloc Client
    doc.moveDown(0.8);
    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(11).text('Client');
    doc.font('Helvetica').fontSize(9.5).fillColor(TEXT);
    if (opts.customer.name) doc.text(opts.customer.name);
    doc.text(opts.customer.email);
    if (opts.customer.address1) doc.text(opts.customer.address1);
    if (opts.customer.zip || opts.customer.city) doc.text(`${opts.customer.zip ?? ''} ${opts.customer.city ?? ''}`);

    // Séparateur
    doc.moveDown(0.4);
    doc.lineWidth(1).strokeColor(LINE).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.4);

    // Tableau
    let y = doc.y;
    const colQty = 46; // Qté
    const colPU = 74;  // Prix unitaire
    const colTot = 86; // Total
    const colDesc = pageW - (colQty + colPU + colTot);

    // En-tête du tableau
    const headerH = 18;
    doc.save();
    doc.rect(doc.page.margins.left, y, pageW, headerH).fill(ACCENT_2 + '');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5);
    doc.text('Description', doc.page.margins.left + 8, y + 4, { width: colDesc - 12 });
    doc.text('Qté', doc.page.margins.left + colDesc + 8, y + 4, { width: colQty - 16, align: 'right' });
    doc.text('PU', doc.page.margins.left + colDesc + colQty + 8, y + 4, { width: colPU - 16, align: 'right' });
    doc.text('Total', doc.page.margins.left + colDesc + colQty + colPU + 8, y + 4, { width: colTot - 16, align: 'right' });
    doc.restore();
    y += headerH;

    // Mesures des lignes
    doc.font('Helvetica').fontSize(9.5).fillColor(TEXT);
    const rowPadY = 5;
    const rowMinH = 15;
    const rowHeights = opts.items.map((it) => {
      const descH = doc.heightOfString(it.description, { width: colDesc - 16 });
      return Math.max(rowMinH, descH + rowPadY * 2);
    });

    // Espace réservé (totaux + éventuelles notes/infos)
    const totalsBoxH = 56;
    const spacingAfterRows = 12;
    const notesW = pageW;

    // Préparer notes + bloc infos
    let notesText = (opts.notes || '').trim();
    const infoTitle = 'Informations & conditions';
    const companyLine = [opts.company.name, opts.company.vat ? `TVA: ${opts.company.vat}` : '', opts.company.address || ''].filter(Boolean).join(' • ');
    const infoLines = [
      'Merci pour votre achat. Conservez cette facture pour vos dossiers.',
      'Paiement: PayPal. Les remboursements sont effectués sur le moyen de paiement d’origine.',
      'Garantie légale de conformité: 2 ans (art. L217-3 et s. C. conso).',
      'Droit de rétractation: 14 jours (art. L221-18) hors exceptions prévues par la loi.',
      `Service client: ${process.env.SUPPORT_EMAIL || 'contact@lespcdewarren.fr'}`,
      `Société: ${companyLine}`,
    ];
    let infoText = infoLines.join('\n');

    // Calcul du nombre max de lignes d'articles pour rester sur 1 page
    const reservedAfterTable = spacingAfterRows + totalsBoxH + 8 /* espacement */ + 12 /* titre notes approx */ + 40 /* notes approx min */ + 8 /* espacement */ + 12 /* titre infos */ + 60 /* infos approx min */ + 20 /* marge fin */;
    const availableForRows = (pageBottom - y) - reservedAfterTable;

    let rowsThatFit = 0;
    let usedHeight = 0;
    for (let i = 0; i < rowHeights.length; i++) {
      if (usedHeight + rowHeights[i] <= availableForRows) {
        usedHeight += rowHeights[i];
        rowsThatFit++;
      } else {
        break;
      }
    }

    const overflowCount = Math.max(0, opts.items.length - rowsThatFit);

    // Dessiner les lignes visibles
    for (let i = 0; i < rowsThatFit; i++) {
      const it = opts.items[i];
      const rowH = rowHeights[i];
      if (i % 2 === 1) {
        doc.save();
        doc.rect(doc.page.margins.left, y, pageW, rowH).fill(ZEBRA);
        doc.restore();
      }
      const q = Math.max(1, it.quantity);
      const pu = fmt(it.unitPriceCents);
      const tt = fmt(it.unitPriceCents * q);
      doc.fillColor(TEXT).font('Helvetica').fontSize(9.5);
      doc.text(it.description, doc.page.margins.left + 8, y + rowPadY, { width: colDesc - 16 });
      doc.text(String(q), doc.page.margins.left + colDesc + 8, y + rowPadY, { width: colQty - 16, align: 'right' });
      doc.text(pu, doc.page.margins.left + colDesc + colQty + 8, y + rowPadY, { width: colPU - 16, align: 'right' });
      doc.text(tt, doc.page.margins.left + colDesc + colQty + colPU + 8, y + rowPadY, { width: colTot - 16, align: 'right' });
      y += rowH;
    }

    // Si des articles restent, informer
    if (overflowCount > 0) {
      const msg = `… + ${overflowCount} article${overflowCount > 1 ? 's' : ''}`;
      const msgH = 16;
      doc.save();
      doc.rect(doc.page.margins.left, y, pageW, msgH).fill('#faf5ff');
      doc.fillColor(ACCENT).font('Helvetica').fontSize(9.5).text(msg, doc.page.margins.left + 8, y + 3);
      doc.restore();
      y += msgH;
    }

    // Ajouter éventuellement la ligne Livraison comme ligne séparée compacte
    if (shipping > 0) {
      const shipH = 16;
      doc.save();
      doc.rect(doc.page.margins.left, y, pageW, shipH).fill('#f9fafb');
      doc.fillColor(TEXT).font('Helvetica').fontSize(9.5);
      doc.text('Livraison', doc.page.margins.left + 8, y + 3, { width: colDesc - 16 });
      doc.text('-', doc.page.margins.left + colDesc + 8, y + 3, { width: colQty - 16, align: 'right' });
      doc.text('-', doc.page.margins.left + colDesc + colQty + 8, y + 3, { width: colPU - 16, align: 'right' });
      doc.text(fmt(shipping), doc.page.margins.left + colDesc + colQty + colPU + 8, y + 3, { width: colTot - 16, align: 'right' });
      doc.restore();
      y += shipH;
    }

    // Totaux (boîte à droite)
    const totalsW = 220;
    const totalsX = doc.page.margins.left + pageW - totalsW;
    y += 10;
    doc.roundedRect(totalsX, y, totalsW, totalsBoxH, 6).strokeColor(LINE).stroke();
    const lineRow = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5).fillColor(bold ? TEXT : SUBTLE);
      doc.text(label, totalsX + 10, doc.y + 6, { continued: true });
      doc.text(value, totalsX + 10, doc.y, { align: 'right', width: totalsW - 20 });
    };
    doc.y = y + 6;
    lineRow('Sous-total', fmt(subtotal));
    lineRow('Livraison', fmt(shipping));
    doc.moveDown(0.1);
    lineRow('Total', fmt(total), true);

    // Notes (tronquées au besoin)
    if (notesText) {
      doc.moveDown(0.5);
      const title = 'Notes';
      const remain = pageBottom - doc.y;
      // Estimer et tronquer
      doc.font('Helvetica-Bold').fontSize(11);
      const approxTitleH = 12;
      doc.font('Helvetica').fontSize(9.5);
      const hFull = doc.heightOfString(notesText, { width: notesW, align: 'left' }) + 16;
      const minSpace = approxTitleH + hFull + 14; // avec marges
      if (minSpace > remain) {
        const target = Math.max(0, remain - (approxTitleH + 14));
        if (target > 20) {
          let low = 0, high = notesText.length, best = 0;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const snippet = notesText.slice(0, mid) + '…';
            const h = doc.heightOfString(snippet, { width: notesW, align: 'left' }) + 16;
            if (h <= target) { best = mid; low = mid + 1; } else { high = mid - 1; }
          }
          if (best > 0) notesText = notesText.slice(0, best) + '…'; else notesText = '';
        } else {
          notesText = '';
        }
      }
      if (notesText) {
        doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(11).text(title);
        const h = doc.heightOfString(notesText, { width: notesW, align: 'left' }) + 12;
        doc.save();
        doc.rect(doc.page.margins.left, doc.y + 2, notesW, h).fill('#f8fafc');
        doc.restore();
        doc.moveDown(0.1);
        doc.fillColor(TEXT).font('Helvetica').fontSize(9.5).text(notesText, doc.page.margins.left + 8, doc.y + 6, { width: notesW - 16 });
      }
    }

    // Informations & conditions (tronquées si besoin)
    {
      const remain = pageBottom - doc.y;
      doc.font('Helvetica-Bold').fontSize(11);
      const approxTitleH = 12;
      doc.font('Helvetica').fontSize(9.0);
      let hInfo = doc.heightOfString(infoText, { width: notesW, align: 'left' });
      const required = approxTitleH + 2 + hInfo;
      if (required > remain) {
        const target = Math.max(0, remain - (approxTitleH + 2));
        if (target > 20) {
          let low = 0, high = infoText.length, best = 0;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const snippet = infoText.slice(0, mid) + '…';
            const h = doc.heightOfString(snippet, { width: notesW, align: 'left' });
            if (h <= target) { best = mid; low = mid + 1; } else { high = mid - 1; }
          }
          if (best > 0) infoText = infoText.slice(0, best) + '…'; else infoText = '';
        } else {
          infoText = '';
        }
      }
      if (infoText) {
        doc.moveDown(0.3);
        doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(11).text('Informations & conditions');
        doc.moveDown(0.1);
        doc.fillColor(TEXT).font('Helvetica').fontSize(9.0).text(infoText, { width: notesW });
      }
    }

    // Pied de page
    const footerY = doc.page.height - doc.page.margins.bottom + 8;
    doc.save();
    doc.font('Helvetica').fontSize(9).fillColor(SUBTLE);
    doc.text(`${opts.company.name} • Invoice v3`, doc.page.margins.left, footerY, { width: pageW, align: 'center' });
    doc.restore();

    doc.end();
  });
}
