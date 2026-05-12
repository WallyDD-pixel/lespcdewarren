import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/terms", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/privacy", label: "Confidentialité" },
] as const;

type LegalPageShellProps = {
  title: string;
  /** Sous-titre ou méta (ex. dernière mise à jour) */
  intro?: React.ReactNode;
  children: React.ReactNode;
  /** Masquer la barre de liens entre pages légales */
  hideLegalNav?: boolean;
};

/**
 * Enveloppe visuelle commune aux pages légales (même univers que FAQ / boutique).
 */
export default function LegalPageShell({ title, intro, children, hideLegalNav }: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0d] to-[#06060a]">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-50"
        aria-hidden
      >
        <div
          className="absolute -top-32 right-[-10%] h-[22rem] w-[22rem] rounded-full blur-3xl md:h-[28rem] md:w-[28rem]"
          style={{
            background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent) 32%, transparent), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-[-20%] h-[18rem] w-[18rem] rounded-full blur-3xl opacity-60"
          style={{
            background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent-2) 18%, transparent), transparent 70%)",
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto text-center mb-8 md:mb-10">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]/90 mb-3">
            Informations légales
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{title}</h1>
          {intro ? <div className="mt-4 text-sm md:text-base text-white/60 leading-relaxed">{intro}</div> : null}
        </div>

        <article
          className="
            relative max-w-3xl mx-auto card p-6 md:p-10
            text-white/85 leading-relaxed
            [&>h2]:mt-10 [&>h2:first-of-type]:mt-0
            [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2
            [&_a:hover]:text-[var(--accent-2)]
            [&_strong]:text-white [&_strong]:font-semibold
            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-2 [&_ul]:marker:text-white/35
            [&_ul.flat]:list-none [&_ul.flat]:ml-0 [&_ul.flat]:space-y-1.5 [&_ul.flat]:pl-0
            [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-2 [&_ol]:marker:text-white/35
            [&_p+p]:mt-3
          "
        >
          {children}
        </article>

        {!hideLegalNav ? (
          <nav
            className="max-w-3xl mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/55"
            aria-label="Navigation pages légales"
          >
            {LEGAL_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-white transition-colors">
                {label}
              </Link>
            ))}
            <Link href="/faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
          </nav>
        ) : null}
      </div>
    </main>
  );
}

/** Titres de section dans une page légale */
export function LegalSectionTitle({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-lg md:text-xl font-semibold text-[var(--accent)] scroll-mt-24 border-b border-white/10 pb-2"
    >
      {children}
    </h2>
  );
}
