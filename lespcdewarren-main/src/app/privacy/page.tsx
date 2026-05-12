export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md text-gray-900">
      <h1 className="text-2xl font-bold mb-4 text-blue-600">Politique de confidentialité – Klipr</h1>
      <p><strong>Dernière mise à jour :</strong> 23 octobre 2025</p>
      <p>La confidentialité de vos données est importante pour nous.<br />
      Cette politique explique quelles données sont collectées et comment elles sont utilisées dans l’application Klipr.</p>

      <h2 className="text-lg font-semibold mt-6 text-blue-600">1. Données collectées</h2>
      <ul className="list-disc ml-6">
        <li>Les informations fournies lors de la connexion (via Google Auth) : nom, e-mail, photo de profil.</li>
        <li>Les informations d’utilisation (consultation de vidéos, création de campagnes, interactions).</li>
        <li>Aucune donnée sensible (mot de passe, coordonnées bancaires, etc.) n’est stockée par Klipr.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 text-blue-600">2. Utilisation des données</h2>
      <ul className="list-disc ml-6">
        <li>gérer votre compte et votre profil ;</li>
        <li>afficher et recommander des campagnes pertinentes ;</li>
        <li>améliorer les performances et la sécurité de l’app.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 text-blue-600">3. Partage des données</h2>
      <ul className="list-disc ml-6">
        <li>Firebase (hébergement et authentification sécurisée)</li>
        <li>Plateformes externes (Twitch, YouTube) uniquement pour redirection</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 text-blue-600">4. Stockage et sécurité</h2>
      <p>Vos données sont stockées sur Google Firebase, qui respecte les normes de sécurité internationales (ISO 27001, RGPD).<br />
      Nous mettons tout en œuvre pour protéger vos informations.</p>

      <h2 className="text-lg font-semibold mt-6 text-blue-600">5. Vos droits</h2>
      <ul className="list-disc ml-6">
        <li>demander la suppression de votre compte ;</li>
        <li>accéder ou corriger vos informations personnelles.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 text-blue-600">6. Contact</h2>
  <p className="font-bold mt-4">Pour toute demande relative à vos données :<br />
  📧 warren.lespcdewarren@gmail.com</p>
    </main>
  );
}
