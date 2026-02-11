import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Header from "@/components/Header";
import FlyToCart from "@/components/FlyToCart";
import Footer from "@/components/Footer";
import MainContainer from "../components/MainContainer";
import ConditionalFooter from "../components/ConditionalFooter";
import { getSession } from "@/lib/session";
import Toaster from "@/components/Toaster";
import { getPublicConfigServer } from "@/lib/settings";
import MaintenanceAdminLoginForm from "@/components/MaintenanceAdminLoginForm";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "lespcdewarren - PC & composants",
  description: "Boutique en ligne PC assemblés, composants et périphériques.",
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const user = session.user;
  const pub = await getPublicConfigServer();
  const isAdmin = user?.role === 'ADMIN';

  if (pub.maintenance && !isAdmin) {
    // Page maintenance globale (bypass pour admin)
    return (
      <html lang="fr" className="dark">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-gradient-to-b from-black to-zinc-900 text-white`}>
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-xl">
              <div className="text-3xl mb-2">🛠️</div>
              <h1 className="text-xl font-semibold mb-2">Site en maintenance</h1>
              <p className="text-white/80 mb-4">Nous effectuons actuellement une mise à jour. Merci de revenir un peu plus tard.</p>
              {/* Formulaire de connexion réservé admin */}
              <MaintenanceAdminLoginForm />
              <div className="mt-3 text-xs text-white/50">Accès réservé aux administrateurs</div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="fr" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-gradient-to-b from-black to-zinc-900 text-white`}>
        {/* Barre d'annonce */}
        <div className="bg-[var(--accent)] text-white text-sm">
          <div className="mx-auto max-w-7xl px-4 py-2 text-center">
            {pub.discordUrl ? (
              <Link href={pub.discordUrl} className="inline-flex items-center gap-2" target="_blank" rel="noopener noreferrer">
                <span className="i">💬</span>
                <span>Rejoignez-nous sur Discord</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 opacity-70">
                <span className="i">💬</span>
                <span>Discord bientôt disponible</span>
              </span>
            )}
          </div>
        </div>

        {/* Header principal */}
        <Header user={user ? { email: user.email, role: user.role } : undefined} />

        {/* Fly-to-cart animation layer */}
        <FlyToCart />
        {/* Toast notifications */}
        <Toaster />

        {/* Spacing dynamique: on réduit le padding bas et on masque le footer sur /messages */}
        <MainContainer>{children}</MainContainer>

        <ConditionalFooter>
          <Footer />
        </ConditionalFooter>
      </body>
    </html>
  );
}
