import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell, { LegalSectionTitle } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Conditions générales de vente — lespcdewarren",
  description: "CGV de la boutique en ligne LesPCdeWarren (Walref).",
};

export default function CgvPage() {
  return (
    <LegalPageShell
      title="Conditions générales de vente"
      intro={
        <>
          <p className="text-white/70">
            <strong className="text-white/85">Vendeur :</strong> Walref — LesPCdeWarren, auto-entrepreneur, 3 rue des Carreaux, 95110 Sannois, France — SIRET 921 797 338 00016 — TVA FR14921797338
          </p>
          <p className="mt-2">
            <strong className="text-white/80">Dernière mise à jour :</strong> 12 mai 2026
          </p>
        </>
      }
    >
      <LegalSectionTitle id="champ">1. Champ d&apos;application</LegalSectionTitle>
      <p>
        Les présentes CGV s&apos;appliquent à toute commande passée sur le Site par un consommateur ou un non-professionnel au sens du Code de la consommation. Elles prévalent sur toute autre condition non expressément acceptée par Walref.
      </p>

      <LegalSectionTitle>2. Produits et prix</LegalSectionTitle>
      <p>
        Les produits et services sont présentés avec leurs caractéristiques essentielles et leur prix <strong>en euros TTC</strong>, toutes taxes comprises applicables au jour de la commande. Walref se réserve le droit de modifier ses tarifs ; le prix facturé est celui affiché au moment de la validation de la commande par le client.
      </p>

      <LegalSectionTitle>3. Commande</LegalSectionTitle>
      <p>
        Toute commande vaut acceptation des prix et descriptions des produits disponibles à la vente. Walref confirme la prise en compte de la commande par courriel. Walref se réserve le droit de refuser ou d&apos;annuler une commande en cas de litige avec le client, d&apos;erreur manifeste de prix ou pour motif légitime.
      </p>

      <LegalSectionTitle>4. Modalités de paiement</LegalSectionTitle>
      <p>Le règlement peut s&apos;effectuer notamment par :</p>
      <ul>
        <li>
          <strong>Carte bancaire</strong> via le prestataire <strong>Stripe</strong> (paiement sécurisé, éventuellement avec authentification forte 3-D Secure) ;
        </li>
        <li>
          <strong>Virement bancaire sur facture</strong> : la commande est traitée après réception du paiement ; les délais indiqués pour la livraison couvrent la préparation, l&apos;attente de réception des fonds par l&apos;organisme de paiement / la banque et l&apos;expédition.
        </li>
      </ul>
      <p className="text-sm text-white/60">
        Les données de paiement sont traitées par Stripe selon sa propre politique ; Walref ne conserve pas le numéro complet de carte sur ses serveurs.
      </p>

      <LegalSectionTitle>5. Livraison</LegalSectionTitle>
      <p>
        <strong>Zones de livraison (indicatif) :</strong> France, Belgique, Suisse, DOM-TOM, Afrique du Nord, selon possibilités techniques et douanières au cas par cas.
      </p>
      <p>
        <strong>Frais de port :</strong> à partir de <strong>30&nbsp;€</strong> (montant pouvant varier selon destination, poids et transporteur ; le montant applicable est indiqué avant validation de la commande).
      </p>
      <p>
        <strong>Délai maximum :</strong> <strong>trois (3) semaines</strong> à compter de la validation de la commande et du paiement effectif (y compris délai de préparation et, le cas échéant, délai lié à l&apos;encaissement du virement), sauf indication contraire communiquée au client ou cas de force majeure.
      </p>
      <p className="text-sm text-white/60">
        Les risques de perte ou d&apos;endommagement des biens sont transférés au client au moment où il — ou un tiers désigné par lui — prend physiquement possession des produits, conformément aux dispositions légales applicables.
      </p>

      <LegalSectionTitle id="retractation">6. Droit de rétractation</LegalSectionTitle>
      <p>
        Conformément aux articles L.221-18 et suivants du Code de la consommation, le client dispose d&apos;un délai de <strong>quatorze (14) jours</strong> à compter de la réception du bien pour exercer son droit de rétractation sans avoir à motiver sa décision, sauf exceptions légales (biens personnalisés, biens descellés ne pouvant être renvoyés pour des raisons d&apos;hygiène ou de santé, etc.).
      </p>
      <p>
        Pour exercer ce droit, le client informe Walref à l&apos;adresse{" "}
        <a href="mailto:warren.lespcdewarren@gmail.com">warren.lespcdewarren@gmail.com</a> dans le délai imparti. Les modalités de retour et de remboursement (dans un délai maximal de quatorze jours à compter de la notification de la rétractation, selon la loi) seront précisées dans l&apos;échange avec le client.
      </p>

      <LegalSectionTitle id="garanties">7. Garanties légales</LegalSectionTitle>
      <p>
        Walref rappelle que le client bénéficie de la <strong>garantie légale de conformité</strong> (articles L.217-3 et suivants du Code de la consommation) et de la <strong>garantie des vices cachés</strong> (articles 1641 et suivants du Code civil), sans préjudice d&apos;éventuelles garanties commerciales proposées séparément sur certains produits.
      </p>

      <LegalSectionTitle>8. Responsabilité</LegalSectionTitle>
      <p>
        Walref ne saurait être tenue responsable des dommages indirects résultant de l&apos;utilisation du Site ou de l&apos;impossibilité momentanée d&apos;y accéder. La responsabilité de Walref, toutes causes confondues, est limitée au montant de la commande concernée, sauf faute lourde ou dol et dans les limites prévues par la loi.
      </p>

      <LegalSectionTitle>9. Données personnelles</LegalSectionTitle>
      <p>
        Les traitements de données sont décrits dans la{" "}
        <Link href="/privacy">politique de confidentialité</Link>.
      </p>

      <LegalSectionTitle>10. Médiation et litiges</LegalSectionTitle>
      <p>
        Conformément aux articles L.616-1 et R.616-1 et suivants du Code de la consommation, le client a la possibilité de saisir gratuitement un médiateur de la consommation en vue de la résolution amiable du litige qui l&apos;opposerait à Walref, après une démarche préalable écrite restée infructueuse. Les coordonnées du médiateur auquel Walref adhère ou toute modalité alternative seront communiquées sur demande à l&apos;adresse{" "}
        <a href="mailto:warren.lespcdewarren@gmail.com">warren.lespcdewarren@gmail.com</a>.
      </p>
      <p className="text-sm text-white/60">
        Le client peut également utiliser la plateforme européenne de règlement en ligne des litiges :{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr
        </a>
        .
      </p>

      <LegalSectionTitle>11. Droit applicable et juridiction</LegalSectionTitle>
      <p>
        Les présentes CGV sont soumises au <strong>droit français</strong>. En l&apos;absence de résolution amiable, compétence attribuée aux tribunaux français, selon les règles de compétence matérielle et territoriale en vigueur.
      </p>

      <p className="text-sm text-white/55 pt-4 border-t border-white/10">
        Pour toute question :{" "}
        <a href="mailto:warren.lespcdewarren@gmail.com">warren.lespcdewarren@gmail.com</a>
      </p>
    </LegalPageShell>
  );
}
