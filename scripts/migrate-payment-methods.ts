/**
 * Ancien script de migration PayPal / colonnes paymentMethod (boutique + marketplace).
 * Le schéma actuel n’expose plus ces champs : ce fichier est conservé pour l’historique
 * et ne modifie plus la base.
 */
async function main() {
  console.log(
    "[migrate-payment-methods] Aucune action : migration obsolète (marketplace retiré, schéma aligné)."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
