export function buildStyledOrderEmail(params: {
  siteUrl: string;
  orderNo: string | number;
  currency: string;
  items: Array<{ name: string; quantity: number; priceCents: number; imageUrl?: string | null }>;
  subtotalCents: number;
  shippingCents?: number;
  shipping?: { name?: string; addr1?: string; zip?: string; city?: string; country?: string };
  billing?: { name?: string; addr1?: string; zip?: string; city?: string; country?: string };
  supportEmail?: string;
  brandName?: string;
  accent?: string;
  accent2?: string;
}) {
  const ACCENT = params.accent || '#6d28d9';
  const ACCENT_2 = params.accent2 || '#8b5cf6';
  const TEXT = '#111827';
  const MUTED = '#6b7280';
  const siteUrl = (params.siteUrl || '').replace(/\/$/, '');
  const orderNo = params.orderNo;
  const shippingCents = Math.max(0, params.shippingCents || 0);
  const subtotal = Math.max(0, params.subtotalCents || 0);
  const total = subtotal + shippingCents;
  const currency = params.currency;
  const brand = params.brandName || 'Lespcdewarren';
  const support = params.supportEmail || 'contact@lespcdewarren.fr';
  const ship = params.shipping || {};
  const bill = params.billing || ship || {};
  const countryShip = ship.country || 'France';
  const countryBill = bill.country || 'France';

  const fmt = (cents: number) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ` ${currency}`;

  const normalizedItems = params.items.map((it) => {
    let imgUrl = it.imageUrl || '';
    if (imgUrl && !/^https?:\/\//.test(imgUrl)) {
      imgUrl = `${siteUrl}${imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`}`;
    }
    return { ...it, imageUrl: imgUrl };
  });

  const itemRows = normalizedItems.map((it) => {
    const img = it.imageUrl ? `<img src="${it.imageUrl}" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;border:1px solid #e5e7eb;" alt="${it.name}">` : '';
    return `
      <tr>
        <td style="padding:12px 0; vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              ${img ? `<td style=\"width:64px; padding-right:12px;\">${img}</td>` : ''}
              <td style="font-size:14px;color:${TEXT};">
                <div style="font-weight:600;">${it.name}</div>
                <div style="font-size:12px;color:${MUTED};">Qté ${it.quantity}</div>
              </td>
              <td style="font-size:14px;color:${TEXT}; text-align:right; white-space:nowrap; font-weight:600;">${fmt(it.priceCents * it.quantity)}</td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join('');

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Commande #${orderNo}</title>
  </head>
  <body style="margin:0;background-color:#f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08); font-family:Arial, Helvetica, sans-serif;">
            <tr>
              <td style="background:${ACCENT}; color:#ffffff; padding:16px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:18px; font-weight:700;">${brand}</td>
                    <td style="font-size:12px; opacity:0.9; text-align:right;">COMMANDE #${orderNo}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 24px 8px 24px;">
                <div style="display:inline-block; background:#ede9fe; color:#4c1d95; padding:6px 10px; border-radius:999px; font-size:13px; font-weight:700;">Merci pour votre achat !</div>
                <div style="font-size:14px; color:${MUTED}; margin-top:10px;">Nous préparons l'envoi de votre commande. Nous vous informerons quand celle-ci aura été envoyée.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 16px 24px;">
                <a href="${siteUrl}/orders" style="display:inline-block; background:${ACCENT}; color:#ffffff; text-decoration:none; font-size:14px; padding:12px 16px; border-radius:8px; font-weight:700;">Afficher votre commande</a>
                <span style="font-size:14px; color:${MUTED};">&nbsp;ou&nbsp;</span>
                <a href="${siteUrl}" style="font-size:14px; color:${ACCENT_2}; text-decoration:none; font-weight:600;">Visitez notre boutique</a>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 24px 0 24px; font-size:14px; color:${TEXT}; font-weight:700;">Résumé de la commande</td>
            </tr>
            <tr>
              <td style="padding:8px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${itemRows}
                  <tr><td style="border-top:1px solid #e5e7eb; height:1px; line-height:1px;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding-top:10px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:14px; color:${MUTED};">Sous-total</td>
                          <td style="font-size:14px; color:${TEXT}; text-align:right;">${fmt(subtotal)}</td>
                        </tr>
                        <tr>
                          <td style="font-size:14px; color:${MUTED};">Expédition</td>
                          <td style="font-size:14px; color:${TEXT}; text-align:right;">${fmt(shippingCents)}</td>
                        </tr>
                        <tr>
                          <td style="padding-top:12px; font-size:20px; color:${TEXT}; font-weight:800;">Total</td>
                          <td style="padding-top:12px; font-size:20px; color:${TEXT}; font-weight:800; text-align:right;">${fmt(total)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 24px 0 24px; font-size:14px; color:${TEXT}; font-weight:700;">Informations client</td>
            </tr>
            <tr>
              <td style="padding:8px 24px 24px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:top; width:50%; padding-right:8px;">
                      <div style="font-size:12px; color:${MUTED}; font-weight:700;">Adresse d'expédition</div>
                      <div style="font-size:14px; color:${TEXT};">${ship.name || ''}</div>
                      <div style="font-size:14px; color:${TEXT};">${ship.addr1 || ''}</div>
                      <div style="font-size:14px; color:${TEXT};">${[ship.zip, ship.city].filter(Boolean).join(' ')}</div>
                      <div style="font-size:14px; color:${TEXT};">${countryShip}</div>
                    </td>
                    <td style="vertical-align:top; width:50%; padding-left:8px;">
                      <div style="font-size:12px; color:${MUTED}; font-weight:700;">Adresse de facturation</div>
                      <div style="font-size:14px; color:${TEXT};">${bill.name || ''}</div>
                      <div style="font-size:14px; color:${TEXT};">${bill.addr1 || ''}</div>
                      <div style="font-size:14px; color:${TEXT};">${[bill.zip, bill.city].filter(Boolean).join(' ')}</div>
                      <div style="font-size:14px; color:${TEXT};">${countryBill}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:12px; font-size:12px; color:${MUTED};">
                      <div style="font-size:12px; color:${MUTED}; font-weight:700; margin-bottom:4px;">Paiement</div>
                      <div style="font-size:14px; color:${TEXT};">PayPal</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 20px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa; border:1px solid #eee; border-radius:10px;">
                  <tr>
                    <td style="padding:12px 14px; font-size:12px; color:${MUTED};">
                      Besoin d'aide ? Écrivez‑nous à <a href="mailto:${support}" style="color:${ACCENT_2}; text-decoration:none;">${support}</a>.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildVioletOrderEmail(params: {
  siteUrl: string;
  orderNo: string | number;
  currency: string;
  items: Array<{ name: string; quantity: number; priceCents: number; imageUrl?: string | null }>
  subtotalCents: number;
  shippingCents?: number;
  shipping?: { name?: string; addr1?: string; zip?: string; city?: string; country?: string };
  billing?: { name?: string; addr1?: string; zip?: string; city?: string; country?: string };
  paymentMethod?: string;
  supportEmail?: string;
  brandName?: string;
  accent?: string;
  accent2?: string;
}) {
  const ACCENT = params.accent || '#6d28d9';
  const ACCENT_2 = params.accent2 || '#8b5cf6';
  const TEXT = '#111827';
  const MUTED = '#6b7280';
  const siteUrl = (params.siteUrl || '').replace(/\/$/, '');
  const orderNo = params.orderNo;
  const currency = params.currency;
  const support = params.supportEmail || 'contact@lespcdewarren.fr';
  const brand = params.brandName || 'Lespcdewarren';
  const shippingCents = Math.max(0, params.shippingCents || 0);
  const subtotal = Math.max(0, params.subtotalCents || 0);
  const total = subtotal + shippingCents;
  const fmt = (cents: number) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ` ${currency}`;

  const normItems = params.items.map((it) => {
    let imgUrl = it.imageUrl || '';
    if (imgUrl && !/^https?:\/\//.test(imgUrl)) {
      imgUrl = `${siteUrl}${imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`}`;
    }
    return { ...it, imageUrl: imgUrl };
  });

  const itemRows = normItems.map((it) => {
    const img = it.imageUrl ? `<img src="${it.imageUrl}" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;border:1px solid #e5e7eb;" alt="${it.name}">` : '';
    return `
      <tr>
        <td style="padding:12px 0; vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              ${img ? `<td style=\"width:64px; padding-right:12px;\">${img}</td>` : ''}
              <td style="font-size:14px;color:${TEXT};">
                <div style="font-weight:600;">${it.name}</div>
                <div style="font-size:12px;color:${MUTED};">Qté ${it.quantity}</div>
              </td>
              <td style="font-size:14px;color:${TEXT}; text-align:right; white-space:nowrap; font-weight:600;">${fmt(it.priceCents * it.quantity)}</td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join('');

  const ship = params.shipping || {};
  const bill = params.billing || ship || {};
  const countryShip = ship.country || 'France';
  const countryBill = bill.country || 'France';
  const payment = params.paymentMethod || 'PayPal';

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Commande #${orderNo}</title>
  </head>
  <body style="margin:0;background-color:#f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08); font-family:Arial, Helvetica, sans-serif;">
            <tr>
              <td style="background:${ACCENT}; color:#ffffff; padding:16px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:18px; font-weight:700;">${brand}</td>
                    <td style="font-size:12px; opacity:0.9; text-align:right;">COMMANDE #${orderNo}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 24px 8px 24px;">
                <div style="display:inline-block; background:#ede9fe; color:#4c1d95; padding:6px 10px; border-radius:999px; font-size:13px; font-weight:700;">Merci pour votre achat !</div>
                <div style="font-size:14px; color:${MUTED}; margin-top:10px;">Nous préparons l'envoi de votre commande. Nous vous informerons quand celle-ci aura été envoyée.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 16px 24px;">
                <a href="${siteUrl.replace(/\/$/, '')}/orders" style="display:inline-block; background:${ACCENT}; color:#ffffff; text-decoration:none; font-size:14px; padding:12px 16px; border-radius:8px; font-weight:700;">Afficher votre commande</a>
                <span style="font-size:14px; color:${MUTED};">&nbsp;ou&nbsp;</span>
                <a href="${siteUrl}" style="font-size:14px; color:${ACCENT_2}; text-decoration:none; font-weight:600;">Visitez notre boutique</a>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 24px 0 24px; font-size:14px; color:${TEXT}; font-weight:700;">Résumé de la commande</td>
            </tr>
            <tr>
              <td style="padding:8px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${itemRows}
                  <tr><td style="border-top:1px solid #e5e7eb; height:1px; line-height:1px;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding-top:10px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:14px; color:${MUTED};">Sous-total</td>
                          <td style="font-size:14px; color:${TEXT}; text-align:right;">${fmt(subtotal)}</td>
                        </tr>
                        <tr>
                          <td style="font-size:14px; color:${MUTED};">Expédition</td>
                          <td style="font-size:14px; color:${TEXT}; text-align:right;">${fmt(shippingCents)}</td>
                        </tr>
                        <tr>
                          <td style="font-size:14px; color:${MUTED};">Taxes</td>
                          <td style="font-size:14px; color:${TEXT}; text-align:right;">0,00 ${currency}</td>
                        </tr>
                        <tr>
                          <td style="padding-top:12px; font-size:20px; color:${TEXT}; font-weight:800;">Total</td>
                          <td style="padding-top:12px; font-size:20px; color:${TEXT}; font-weight:800; text-align:right;">${fmt(total)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 24px 0 24px; font-size:14px; color:${TEXT}; font-weight:700;">Informations client</td>
            </tr>
            <tr>
              <td style="padding:8px 24px 24px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:top; width:50%; padding-right:8px;">
                      <div style="font-size:12px; color:${MUTED}; font-weight:700;">Adresse d'expédition</div>
                      <div style="font-size:14px; color:${TEXT};">${ship.name || ''}</div>
                      <div style="font-size:14px; color:${TEXT};">${ship.addr1 || ''}</div>
                      <div style="font-size:14px; color:${TEXT};">${[ship.zip, ship.city].filter(Boolean).join(' ')}</div>
                      <div style="font-size:14px; color:${TEXT};">${countryShip}</div>
                    </td>
                    <td style="vertical-align:top; width:50%; padding-left:8px;">
                      <div style="font-size:12px; color:${MUTED}; font-weight:700;">Adresse de facturation</div>
                      <div style="font-size:14px; color:${TEXT};">${bill.name || ''}</div>
                      <div style="font-size:14px; color:${TEXT};">${bill.addr1 || ''}</div>
                      <div style="font-size:14px; color:${TEXT};">${[bill.zip, bill.city].filter(Boolean).join(' ')}</div>
                      <div style="font-size:14px; color:${TEXT};">${countryBill}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:12px; font-size:12px; color:${MUTED};">
                      <div style="font-size:12px; color:${MUTED}; font-weight:700; margin-bottom:4px;">Paiement</div>
                      <div style="font-size:14px; color:${TEXT};">${payment}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 20px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa; border:1px solid #eee; border-radius:10px;">
                  <tr>
                    <td style="padding:12px 14px; font-size:12px; color:${MUTED};">
                      Besoin d'aide ? Écrivez‑nous à <a href="mailto:${support}" style="color:${ACCENT_2}; text-decoration:none;">${support}</a>.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Nouveau: modèle générique pour notifications (titre + message + CTA)
export function buildNotificationEmail(params: {
  siteUrl: string;
  title: string;
  message?: string;
  ctaHref?: string;
  ctaLabel?: string;
  brandName?: string;
  accent?: string;
  accent2?: string;
}) {
  const ACCENT = params.accent || '#6d28d9';
  const ACCENT_2 = params.accent2 || '#8b5cf6';
  const TEXT = '#111827';
  const MUTED = '#6b7280';
  const siteUrl = (params.siteUrl || '').replace(/\/$/, '');
  const brand = params.brandName || 'Lespcdewarren';
  const title = params.title;
  const message = params.message || '';
  const ctaHref = params.ctaHref ? (params.ctaHref.startsWith('http') ? params.ctaHref : `${siteUrl}${params.ctaHref.startsWith('/') ? params.ctaHref : `/${params.ctaHref}`}`) : undefined;
  const ctaLabel = params.ctaLabel || 'Voir';

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background-color:#f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08); font-family:Arial, Helvetica, sans-serif;">
            <tr>
              <td style="background:${ACCENT}; color:#ffffff; padding:16px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:18px; font-weight:700;">${brand}</td>
                    <td style="font-size:12px; opacity:0.9; text-align:right;">Notification</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 24px 8px 24px;">
                <div style="font-size:18px; font-weight:800; color:${TEXT};">${title}</div>
                ${message ? `<div style="font-size:14px; color:${MUTED}; margin-top:10px;">${message}</div>` : ''}
              </td>
            </tr>
            ${ctaHref ? `
            <tr>
              <td style="padding:8px 24px 16px 24px;">
                <a href="${ctaHref}" style="display:inline-block; background:${ACCENT}; color:#ffffff; text-decoration:none; font-size:14px; padding:12px 16px; border-radius:8px; font-weight:700;">${ctaLabel}</a>
                <span style="font-size:14px; color:${MUTED};">&nbsp;ou&nbsp;</span>
                <a href="${siteUrl}" style="font-size:14px; color:${ACCENT_2}; text-decoration:none; font-weight:600;">Aller au site</a>
              </td>
            </tr>` : ''}

            <tr>
              <td style="padding:0 24px 20px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa; border:1px solid #eee; border-radius:10px;">
                  <tr>
                    <td style="padding:12px 14px; font-size:12px; color:${MUTED};">
                      Ceci est une notification automatique. Ne répondez pas à cet e‑mail.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
