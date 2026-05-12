import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell, { LegalSectionTitle } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — lespcdewarren",
  description: "CGU du site LesPCdeWarren (Walref).",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Conditions générales d'utilisation"
      intro={
        <>
          <p className="text-white/70">
            <strong className="text-white/85">Éditeur :</strong> Walref — LesPCdeWarren —{" "}
            <a href="mailto:warren.lespcdewarren@gmail.com">warren.lespcdewarren@gmail.com</a>
          </p>
          <p className="mt-2">
            <strong className="text-white/80">Dernière mise à jour :</strong> 12 mai 2026
          </p>
        </>
      }
    >
      <p>
        L&apos;utilisation du site <strong>lespcdewarren</strong> (ci-après « le Site ») implique l&apos;acceptation des présentes conditions générales d&apos;utilisation. Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser le Site.
      </p>

      <LegalSectionTitle>1. Objet</LegalSectionTitle>
      <p>
        Le Site permet de consulter une offre de matériel informatique et services associés, de créer un compte, de passer commande et d&apos;utiliser les fonctionnalités proposées par Walref. Les ventes sont régies par les{" "}
        <Link href="/cgv">conditions générales de vente (CGV)</Link>.
      </p>

      <LegalSectionTitle>2. Accès au Site</LegalSectionTitle>
      <p>
        Walref s&apos;efforce d&apos;assurer l&apos;accessibilité du Site 24h/24 et 7j/7, sous réserve des opérations de maintenance et des cas de force majeure ou événements hors de son contrôle raisonnable. L&apos;accès peut nécessiter une connexion Internet et un équipement compatible ; les frais de télécommunication restent à votre charge.
      </p>

      <LegalSectionTitle>3. Compte utilisateur</LegalSectionTitle>
      <p>
        L&apos;accès à certaines fonctions nécessite la création d&apos;un compte avec une <strong>adresse e-mail</strong> et un <strong>mot de passe</strong>. Vous vous engagez à fournir des informations exactes et à jour, à préserver la confidentialité de vos identifiants et à notifier Walref en cas d&apos;utilisation non autorisée de votre compte. Walref peut suspendre ou supprimer un compte en cas de manquement grave aux présentes CGU ou à la loi.
      </p>

      <LegalSectionTitle>4. Comportement des utilisateurs</LegalSectionTitle>
      <p>Il est notamment interdit :</p>
      <ul>
        <li>d&apos;utiliser le Site de manière frauduleuse ou pour porter atteinte aux droits de tiers ;</li>
        <li>de tenter d&apos;accéder de façon non autorisée aux systèmes, données ou comptes d&apos;autres utilisateurs ;</li>
        <li>de diffuser des contenus illicites, diffamatoires ou contraires aux bonnes mœurs.</li>
      </ul>

      <LegalSectionTitle>5. Propriété intellectuelle</LegalSectionTitle>
      <p>
        Les éléments du Site (textes, visuels, structure, marques) sont la propriété de Walref ou de tiers ayant concédé une licence. Toute reproduction non autorisée est interdite.
      </p>

      <LegalSectionTitle>6. Liens externes</LegalSectionTitle>
      <p>
        Le Site peut contenir des liens vers des sites tiers. Walref n&apos;exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu ou leurs pratiques.
      </p>

      <LegalSectionTitle>7. Données personnelles</LegalSectionTitle>
      <p>
        Les traitements de données sont décrits dans la <Link href="/privacy">politique de confidentialité</Link>.
      </p>

      <LegalSectionTitle>8. Limitation de responsabilité</LegalSectionTitle>
      <p>
        Le Site est fourni « en l&apos;état ». Dans les limites autorisées par la loi, Walref ne saurait être tenue responsable des dommages indirects liés à l&apos;utilisation ou à l&apos;impossibilité d&apos;utiliser le Site. Les obligations relatives à la vente aux consommateurs demeurent régies par les CGV et le droit applicable.
      </p>

      <LegalSectionTitle>9. Modification des CGU</LegalSectionTitle>
      <p>
        Walref peut modifier les présentes CGU ; la date de mise à jour est indiquée en tête de page. L&apos;utilisation du Site après modification vaut acceptation des nouvelles conditions, dans la mesure permise par la loi.
      </p>

      <LegalSectionTitle>10. Contact</LegalSectionTitle>
      <p>
        <a href="mailto:warren.lespcdewarren@gmail.com">warren.lespcdewarren@gmail.com</a>
      </p>
    </LegalPageShell>
  );
}
