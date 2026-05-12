# Messagerie – Sécurité

Mesures appliquées:

- AuthN/AuthZ
  - Accès restreint aux participants de la conversation.
- Validation serveur
  - Longueur max message: 2000 caractères.
  - Content-Type exigé: application/json.
  - Liens et pièces jointes: interdits (aucune URL, aucun upload). Les messages doivent être du texte simple.
- Anti-abus
  - Limiteur (in-memory) :
    - 12 messages/min par conversation et par utilisateur.
    - 6 créations de conversation/min par utilisateur.
- Tolérance migration
  - Fallback si la table MessageImage est absente (inclure images et createMany protégés).

À faire (recommandé prod):
- Remplacer le rate limit par Redis/Upstash.
- Mettre en place un futur flux d’upload sécurisé (Cloudinary/S3) avec scan et URLs signées si la politique évolue.
- CSRF token/cookie si exposé à des pages non Next.
- Journaux d’audit et mécanisme de signalement.
