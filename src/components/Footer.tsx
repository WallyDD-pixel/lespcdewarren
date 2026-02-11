import Link from "next/link";
import { Suspense } from "react";

async function DiscordChip() {
  try {
    const res = await fetch(`${process.env.SITE_URL || ''}/api/public-config`, { cache: 'no-store' });
    const j = await res.json();
    const url = j?.discordUrl as string | undefined;
    if (!url) return null as any;
    return (
      <Link href={url} target="_blank" rel="noopener noreferrer" className="chip">Discord</Link>
    );
  } catch {
    return null as any;
  }
}

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 relative border-t border-white/10 bg-[#0b0b0d]">
      {/* Accent top line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[var(--accent)]/40 via-transparent to-[var(--accent)]/40" />

      {/* Background glow */}
      <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full blur-3xl opacity-25"
           style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
      />

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand + newsletter */}
          <div className="md:col-span-2">
            <Link href="/" className="text-lg font-bold tracking-tight hover:opacity-90">lespcdewarren</Link>
            <p className="mt-2 text-sm text-white/70 max-w-md">
              PC gamers, composants et configurations sur-mesure. Qualité, conseils et services pour chaque budget.
            </p>

            <div className="mt-5">
              <div className="text-sm font-medium">Newsletter</div>
              <p className="text-xs text-white/60">Actus, promos et guides d&apos;achat. Pas de spam.</p>
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  aria-label="Votre email"
                  placeholder="votre@email"
                  className="w-full max-w-xs rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/60"
                />
                <button type="button" className="btn-primary">S&apos;abonner</button>
              </div>
            </div>
          </div>

          {/* Columns */}
          <div>
            <div className="text-sm font-semibold mb-3">Catalogue</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/catalogue" className="hover:underline">Tous les produits</Link></li>
              <li><Link href="/devis" className="hover:underline">PC sur mesure</Link></li>
              <li><Link href="#" className="hover:underline">PC Gamer</Link></li>
              <li><Link href="#" className="hover:underline">Composants</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold mb-3">Support</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/panier" className="hover:underline">Panier</Link></li>
              <li><Link href="#" className="hover:underline">Suivi de commande</Link></li>
              <li><Link href="/faq" className="hover:underline">FAQ</Link></li>
              <li><Link href="#" className="hover:underline">Contact</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold mb-3">Légal</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/faq#cgu" className="hover:underline">CGU</Link></li>
              <li><Link href="/faq#cgv" className="hover:underline">CGV</Link></li>
              <li><Link href="/faq#garantie" className="hover:underline">Garantie</Link></li>
              <li><Link href="/privacy" className="hover:underline">Confidentialité</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold mb-3">À propos</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/devis" className="hover:underline">Devis PC</Link></li>
              <li><Link href="#" className="hover:underline">Notre équipe</Link></li>
              <li><Link href="#" className="hover:underline">Partenariats</Link></li>
              <li><Link href="#" className="hover:underline">Mentions légales</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
          <div>© {year} lespcdewarren. Tous droits réservés.</div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="chip">Paiements sécurisés PayPal</span>
            <span className="chip">Support 7j/7</span>
            <span className="chip">Expédition rapide</span>
            <Suspense fallback={null}><DiscordChip /></Suspense>
          </div>
        </div>
      </div>
    </footer>
  );
}
