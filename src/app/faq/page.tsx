"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string | React.ReactNode;
  category: string;
}

const faqData: FAQItem[] = [
  // CGU - Conditions Générales d'Utilisation
  {
    id: "cgu-1",
    category: "Conditions Générales d'Utilisation",
    question: "Quelles sont les conditions d'utilisation du site ?",
    answer: (
      <div className="space-y-2">
        <p>L'utilisation de notre site implique l'acceptation pleine et entière des conditions générales d'utilisation décrites ci-après.</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Le site est accessible 24h/24, 7j/7 sauf cas de force majeure</li>
          <li>L'utilisateur s'engage à fournir des informations exactes</li>
          <li>Toute utilisation frauduleuse est interdite</li>
          <li>Les prix sont indiqués en euros TTC</li>
        </ul>
      </div>
    )
  },
  {
    id: "cgu-2",
    category: "Conditions Générales d'Utilisation",
    question: "Propriété intellectuelle",
    answer: "Tous les éléments du site (textes, images, logos) sont protégés par le droit d'auteur. Toute reproduction sans autorisation est interdite."
  },

  // CGV - Conditions Générales de Vente
  {
    id: "cgv-1",
    category: "Conditions Générales de Vente",
    question: "Comment passer commande ?",
    answer: (
      <div className="space-y-2">
        <p>Pour passer commande :</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Sélectionnez vos produits et ajoutez-les au panier</li>
          <li>Vérifiez votre commande</li>
          <li>Renseignez vos informations de livraison</li>
          <li>Choisissez votre mode de paiement</li>
          <li>Validez votre commande</li>
        </ol>
      </div>
    )
  },
  {
    id: "cgv-2",
    category: "Conditions Générales de Vente",
    question: "Quels sont les modes de paiement acceptés ?",
    answer: "Nous acceptons les cartes bancaires (Visa, Mastercard), PayPal et les virements bancaires pour les commandes importantes."
  },
  {
    id: "cgv-3",
    category: "Conditions Générales de Vente",
    question: "Quels sont les délais de livraison ?",
    answer: (
      <div className="space-y-2">
        <p>Les délais de livraison varient en fonction des commandes en cours et du type de produit :</p>
        <ul className="list-disc list-inside space-y-1">
          <li>PC en stock : 2 à 5 jours ouvrés en France métropolitaine</li>
          <li>PC sur-mesure : 5 à 15 jours ouvrés selon la configuration</li>
          <li>DOM-TOM et international : 7 à 21 jours ouvrés</li>
        </ul>
        <p className="text-sm text-gray-600">Les délais peuvent être rallongés en période de forte activité. Nous vous tiendrons informé de l'avancement de votre commande.</p>
      </div>
    )
  },

  // Garantie
  {
    id: "garantie-1",
    category: "Garantie",
    question: "Quelle est la durée de garantie ?",
    answer: (
      <div className="space-y-2">
        <p><strong>Nous offrons une garantie d'un an sur tous nos produits.</strong></p>
        <p>Cette garantie couvre :</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Les pannes mineures et défauts de fabrication</li>
          <li>Les dysfonctionnements liés à l'usure normale</li>
          <li>Les problèmes de compatibilité logicielle</li>
        </ul>
        <p className="text-sm text-gray-600">La garantie ne couvre pas les dommages dus à une mauvaise utilisation, aux chocs ou à l'oxydation.</p>
      </div>
    )
  },
  {
    id: "garantie-2",
    category: "Garantie",
    question: "Comment faire jouer la garantie ?",
    answer: (
      <div className="space-y-2">
        <p>Pour faire jouer la garantie :</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Contactez notre SAV en décrivant le problème</li>
          <li>Fournissez votre numéro de commande</li>
          <li>Envoyez-nous le produit défaillant</li>
          <li>Nous procédons à la réparation ou au remplacement</li>
        </ol>
      </div>
    )
  },

  // SAV - Service Après-Vente
  {
    id: "sav-1",
    category: "Service Après-Vente",
    question: "Comment contacter le SAV ?",
    answer: (
      <div className="space-y-2">
        <p>Notre service après-vente est disponible :</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Par email : warren.lespcdewarren@gmail.com</li>
          <li>Par téléphone : du lundi au vendredi de 9h à 18h</li>
          <li>Via le formulaire de contact sur notre site</li>
        </ul>
        <p>Temps de réponse moyen : 24h en jours ouvrés.</p>
      </div>
    )
  },
  {
    id: "sav-2",
    category: "Service Après-Vente",
    question: "Que faire en cas de panne mineure ?",
    answer: (
      <div className="space-y-2">
        <p>En cas de panne mineure :</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Vérifiez les branchements et la configuration</li>
          <li>Consultez notre guide de dépannage en ligne</li>
          <li>Contactez notre SAV si le problème persiste</li>
        </ol>
        <p>Notre équipe technique vous guidera pour résoudre le problème à distance ou organiser une réparation.</p>
      </div>
    )
  },

  // Droit de rétractation
  {
    id: "retractation-1",
    category: "Droit de rétractation",
    question: "Quel est le délai de rétractation ?",
    answer: (
      <div className="space-y-2">
        <p><strong>Vous disposez de 14 jours pour exercer votre droit de rétractation</strong>, à compter de la réception du produit.</p>
        <p className="text-sm text-gray-600">
          <strong>Condition importante :</strong> Le produit doit être dans l'état de la vente (emballage d'origine, accessoires complets, aucun signe d'utilisation intensive).
        </p>
      </div>
    )
  },
  {
    id: "retractation-2",
    category: "Droit de rétractation",
    question: "Comment exercer le droit de rétractation ?",
    answer: (
      <div className="space-y-2">
        <p>Pour exercer votre droit de rétractation :</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Contactez-nous par email ou courrier</li>
          <li>Indiquez clairement votre volonté de vous rétracter</li>
          <li>Renvoyez le produit dans les 14 jours suivant votre déclaration</li>
          <li>Le remboursement sera effectué sous 14 jours après réception</li>
        </ol>
      </div>
    )
  },
  {
    id: "retractation-3",
    category: "Droit de rétractation",
    question: "Quelles sont les conditions de retour ?",
    answer: (
      <div className="space-y-2">
        <p>Pour que le retour soit accepté, le produit doit :</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Être dans son emballage d'origine</li>
          <li>Être complet (tous les accessoires fournis)</li>
          <li>Ne présenter aucun signe d'utilisation intensive</li>
          <li>Ne pas être endommagé par l'utilisateur</li>
        </ul>
        <p className="text-sm text-gray-600">Les frais de retour sont à la charge du client, sauf en cas de produit défectueux.</p>
      </div>
    )
  },

  // Livraison
  {
    id: "livraison-1",
    category: "Livraison",
    question: "Quels sont les frais de livraison ?",
    answer: (
      <div className="space-y-2">
        <p>Les frais de livraison sont calculés en fonction du poids, de la destination et des commandes en cours.</p>
        <p>Les délais peuvent varier selon notre charge de travail actuelle et le type de produit commandé.</p>
        <p className="text-sm text-gray-600">Contactez-nous pour obtenir un devis de livraison précis selon votre commande.</p>
      </div>
    )
  },

  // Support technique
  {
    id: "support-1",
    category: "Support technique",
    question: "Proposez-vous un support technique ?",
    answer: "Oui, nous proposons un support technique gratuit pendant toute la durée de la garantie pour vous aider avec l'installation et la configuration de vos produits."
  }
];

const categories = Array.from(new Set(faqData.map(item => item.category)));

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const filteredData = selectedCategory === "all" 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Questions Fréquentes
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Trouvez rapidement les réponses à vos questions sur nos produits, services, garanties et conditions de vente.
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-[var(--accent)] text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Toutes les catégories
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-[var(--accent)] text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="max-w-4xl mx-auto">
          {/* Add category anchors */}
          <div id="cgu" className="scroll-mt-20"></div>
          <div id="cgv" className="scroll-mt-20"></div>
          <div id="garantie" className="scroll-mt-20"></div>
          
          <div className="space-y-4">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div>
                    <div className="text-sm text-[var(--accent)] font-medium mb-1">
                      {item.category}
                    </div>
                    <div className="text-white font-semibold">
                      {item.question}
                    </div>
                  </div>
                  {openItems.has(item.id) ? (
                    <ChevronUp className="w-5 h-5 text-white/60" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/60" />
                  )}
                </button>
                
                {openItems.has(item.id) && (
                  <div className="px-6 pb-4 text-white/80 leading-relaxed">
                    {typeof item.answer === "string" ? (
                      <p>{item.answer}</p>
                    ) : (
                      item.answer
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact section */}
        <div className="mt-16 text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Vous ne trouvez pas votre réponse ?
            </h2>
            <p className="text-white/80 mb-6">
              Notre équipe est là pour vous aider. N'hésitez pas à nous contacter pour toute question supplémentaire.
            </p>
            <div className="space-y-2">
              <p className="text-white">
                <strong>Email :</strong> warren.lespcdewarren@gmail.com
              </p>
              <p className="text-white">
                <strong>SAV :</strong> warren.lespcdewarren@gmail.com
              </p>
              <p className="text-white">
                <strong>Téléphone :</strong> Du lundi au vendredi, 9h-18h
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}