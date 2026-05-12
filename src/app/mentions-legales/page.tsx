import type { Metadata } from "next";
import LegalPageShell, { LegalSectionTitle } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Mentions légales — lespcdewarren",
  description: "Informations légales sur l’éditeur du site LesPCdeWarren (Walref).",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPageShell
      title="Mentions légales"
      intro={
        <>
          <strong className="text-white/80">Dernière mise à jour :</strong> 12 mai 2026
        </>
      }
    >
      <LegalSectionTitle>1. Éditeur du site</LegalSectionTitle>
      <p>
        Le site <strong>lespcdewarren</strong> (ci-après « le Site ») est édité par :
      </p>
      <ul className="flat">
        <li>
          <strong>Dénomination / enseigne :</strong> Walref — LesPCdeWarren
        </li>
        <li>
          <strong>Forme juridique :</strong> auto-entrepreneur
        </li>
        <li>
          <strong>Raison sociale :</strong> Walref
        </li>
        <li>
          <strong>Adresse :</strong> 3 rue des Carreaux, 95110 Sannois, France
        </li>
        <li>
          <strong>SIRET :</strong> 921 797 338 00016
        </li>
        <li>
          <strong>Numéro de TVA intracommunautaire :</strong> FR14921797338
        </li>
        <li>
          <strong>Capital social :</strong> non applicable (auto-entrepreneur)
        </li>
        <li>
          <strong>Activité (code APE) :</strong> 7410Z — Activités spécialisées de design
        </li>
        <li>
          <strong>Contact :</strong>{" "}
          <a href="mailto:warren.lespcdewarren@gmail.com">warren.lespcdewarren@gmail.com</a>
        </li>
      </ul>
      <p className="text-sm text-white/60">
        <strong>Directeur de la publication :</strong> Warren (contact commercial pour le Site, agissant pour le compte de Walref).
      </p>

      <LegalSectionTitle>2. Hébergement</LegalSectionTitle>
      <p>
        Le Site est hébergé par la société <strong>AMAZON WEB SERVICES (AWS)</strong>, dont le siège social est situé au{" "}
        <strong>410 Terry Avenue North, P.O. Box 81226, Seattle, WA 98108-1226, États-Unis</strong>.
      </p>

      <LegalSectionTitle>3. Propriété intellectuelle</LegalSectionTitle>
      <p>
        Les éléments du Site (structure, textes, images, logos, bases de données, etc.) sont protégés par le droit de la propriété intellectuelle. Toute reproduction ou représentation non autorisée est interdite sauf autorisation écrite préalable de Walref ou des titulaires de droits concernés.
      </p>

      <LegalSectionTitle>4. Données personnelles</LegalSectionTitle>
      <p>
        Le traitement des données à caractère personnel est décrit dans la{" "}
        <a href="/privacy">politique de confidentialité</a>.
      </p>
    </LegalPageShell>
  );
}
