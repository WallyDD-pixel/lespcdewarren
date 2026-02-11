/**
 * Formate la méthode de paiement pour l'affichage
 */
export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return '—';
  
  switch (method) {
    case 'PAYPAL_ONLINE_1X':
      return '💳 PayPal (1×)';
    case 'PAYPAL_ONLINE_4X':
      return '💳 PayPal (4×)';
    case 'CB_ONLINE_1X':
      return '💳 CB (1×)';
    case 'CB_ONLINE_4X':
      return '💳 CB (4×)';
    case 'IN_PERSON':
      return '🤝 En personne';
    // Support des anciennes valeurs pour la rétrocompatibilité
    case 'PAYPAL_ONLINE':
      return '💳 PayPal';
    default:
      return '—';
  }
}

/**
 * Formate la méthode de paiement pour l'affichage détaillé (sans icône)
 */
export function formatPaymentMethodLong(method: string | null | undefined): string {
  if (!method) return 'Non spécifié';
  
  switch (method) {
    case 'PAYPAL_ONLINE_1X':
      return 'PayPal en ligne (paiement en 1 fois)';
    case 'PAYPAL_ONLINE_4X':
      return 'PayPal en ligne (paiement en 4 fois)';
    case 'CB_ONLINE_1X':
      return 'Carte bancaire (paiement en 1 fois)';
    case 'CB_ONLINE_4X':
      return 'Carte bancaire (paiement en 4 fois)';
    case 'IN_PERSON':
      return 'Paiement en personne';
    // Support des anciennes valeurs pour la rétrocompatibilité
    case 'PAYPAL_ONLINE':
      return 'PayPal en ligne';
    default:
      return 'Non spécifié';
  }
}
