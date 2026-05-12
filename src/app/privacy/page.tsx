import type { Metadata } from "next";
import LegalPageShell, { LegalSectionTitle } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Politique de confidentialité — lespcdewarren",
  description: "Traitement des données personnelles sur LesPCdeWarren (Walref).",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Politique de confidentialité"
      intro={
        <>
          <p className="text-white/70">
            <strong className="text-white/85">Responsable du traitement :</strong> Walref — LesPCdeWarren, 3 rue des Carreaux, 95110 Sannois, France — SIRET 921 797 338 00016 —{" "}
            <a href="mailto:warren.lespcdewarren@gmail.com">warren.lespcdewarren@gmail.com</a>
          </p>
          <p className="mt-2">
            <strong className="text-white/80">Dernière mise à jour :</strong> 12 mai 2026
          </p>
        </>
      }
    >
      <p>
        La présente politique décrit comment Walref traite les données personnelles collectées via le site <strong>lespcdewarren</strong> (boutique en ligne, compte client, commandes, messages et fonctionnalités associées), conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés.
      </p>

      <LegalSectionTitle>1. Données collectées</LegalSectionTitle>
      <ul>
        <li>
          <strong>Compte utilisateur :</strong> identifiant de connexion par <strong>adresse e-mail et mot de passe</strong> (mot de passe stocké sous forme dérivée / hachée, non lisible en clair) ; nom ou pseudonyme le cas échéant.
        </li>
        <li>
          <strong>Commandes et livraison :</strong> coordonnées de facturation et de livraison, téléphone si fourni, détail des commandes, historique de paiement (statut, références de transaction via Stripe ou virement).
        </li>
        <li>
          <strong>Messages et contenus</strong> que vous envoyez via le Site (contenu des échanges, pièces jointes autorisées par le service).
        </li>
        <li>
          <strong>Données techniques :</strong> journaux techniques minimaux (adresse IP, horodatage, type de navigateur) nécessaires à la sécurité et au bon fonctionnement du service.
        </li>
      </ul>
      <p className="text-sm text-white/60">
        Certaines pages peuvent charger des scripts tiers strictement liés à une fonctionnalité (par exemple suggestion d&apos;adresse). Dans ce cas, les données saisies peuvent être traitées par le prestataire concerné selon sa propre politique de confidentialité.
      </p>

      <LegalSectionTitle>2. Finalités et bases légales</LegalSectionTitle>
      <ul>
        <li>
          <strong>Exécution du contrat</strong> (article 6(1)(b) RGPD) : gestion du compte, traitement des commandes, livraison, facturation, paiement, support client.
        </li>
        <li>
          <strong>Obligations légales</strong> (article 6(1)(c) RGPD) : comptabilité, conservation des pièces justificatives, réponse aux demandes des autorités lorsque la loi l&apos;impose.
        </li>
        <li>
          <strong>Intérêt légitime</strong> (article 6(1)(f) RGPD) : sécurisation du Site, lutte contre la fraude, amélioration du service, mesures techniques de maintenance.
        </li>
      </ul>

      <LegalSectionTitle>3. Destinataires et sous-traitants</LegalSectionTitle>
      <p>Les données peuvent être communiquées à :</p>
      <ul>
        <li>
          <strong>Stripe</strong> (paiement par carte) — traitement conformément à ses conditions ;
        </li>
        <li>
          <strong>Amazon Web Services (AWS)</strong> ou équivalent pour l&apos;hébergement et l&apos;infrastructure du Site — traitement principalement en lien avec l&apos;UE selon les services et options configurées ;
        </li>
        <li>les prestataires d&apos;envoi d&apos;e-mails transactionnels ou techniques strictement nécessaires au fonctionnement du service ;</li>
        <li>les transporteurs ou partenaires logistiques, dans la mesure nécessaire à la livraison.</li>
      </ul>

      <LegalSectionTitle>4. Transferts hors Union européenne</LegalSectionTitle>
      <p>
        Lorsque des sous-traitants sont situés hors de l&apos;EEE, Walref veille à ce que soient mises en œuvre des garanties appropriées (clauses types de la Commission européenne, mesures complémentaires le cas échéant), conformément au RGPD.
      </p>

      <LegalSectionTitle>5. Durées de conservation</LegalSectionTitle>
      <p>
        Les données nécessaires à la gestion des commandes et à la relation commerciale sont conservées pendant la relation contractuelle, puis <strong>jusqu&apos;à dix (10) ans</strong> lorsque la conservation répond à une obligation légale (notamment obligations comptables et fiscales) ou à la constatation, l&apos;exercice ou la défense d&apos;un droit en justice.
      </p>
      <p className="text-sm text-white/60">
        Les données de compte inactif peuvent être archivées ou supprimées avant ce délai sur demande du titulaire du compte, sous réserve des obligations légales de conservation.
      </p>

      <LegalSectionTitle>6. Cookies et traceurs</LegalSectionTitle>
      <p>
        Walref <strong>n&apos;utilise pas de traceurs publicitaires ou d&apos;outils d&apos;analytics marketing</strong> sur le Site dans la configuration décrite à la date de la présente politique. Sont utilisés des mécanismes strictement nécessaires au fonctionnement du service (par exemple maintien de session, panier, sécurité).
      </p>

      <LegalSectionTitle>7. Vos droits</LegalSectionTitle>
      <p>Vous disposez des droits suivants, dans les conditions et limites prévues par le RGPD :</p>
      <ul>
        <li>droit d&apos;accès, de rectification et d&apos;effacement (« droit à l&apos;oubli ») ;</li>
        <li>droit à la limitation du traitement ;</li>
        <li>droit à la portabilité des données lorsque applicable ;</li>
        <li>droit d&apos;opposition, notamment au traitement fondé sur l&apos;intérêt légitime pour des raisons tenant à votre situation particulière ;</li>
        <li>droit de retirer votre consentement lorsque le traitement en est fondé ;</li>
        <li>
          droit d&apos;introduire une réclamation auprès de la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            www.cnil.fr
          </a>
          ).
        </li>
      </ul>
      <p>
        Pour exercer vos droits ou pour toute question relative à vos données :{" "}
        <a href="mailto:warren.lespcdewarren@gmail.com">warren.lespcdewarren@gmail.com</a>. Une pièce d&apos;identité peut être demandée pour prévenir l&apos;usurpation d&apos;identité.
      </p>

      <LegalSectionTitle>8. Sécurité</LegalSectionTitle>
      <p>
        Walref met en œuvre des mesures techniques et organisationnelles appropriées pour protéger les données contre la destruction accidentelle ou illicite, la perte, l&apos;altération, la divulgation ou l&apos;accès non autorisé.
      </p>
    </LegalPageShell>
  );
}
