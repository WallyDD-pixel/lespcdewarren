-- Mise à jour des paramètres PayPal dans la base de données
-- À exécuter sur le serveur : sqlite3 /var/www/lespcdewarren/lespcdewarren/prisma/prisma/prod.db < update-paypal-settings.sql

-- Configuration PayPal Live (depuis le dashboard admin)
INSERT OR REPLACE INTO Setting (key, value, updatedAt) VALUES 
  ('PAYPAL_ENV', 'live', CURRENT_TIMESTAMP),
  ('PAYPAL_LIVE_CLIENT_ID', 'AYpf_JXw3JPwD_f8vVu_55rwzOjFYWyuSToWUL04_ljlC-669yXllD6ziY', CURRENT_TIMESTAMP),
  ('PAYPAL_LIVE_SECRET', 'ECDnL2EEQjN4QwjeSbbDUb6BqnLlYnMPMAEKsz72_QIkbxy74Qa9bL0p6AIAYXYGEMCFCbJvpE2UNlmw', CURRENT_TIMESTAMP);

-- Configuration PayPal Sandbox (depuis le dashboard admin)
INSERT OR REPLACE INTO Setting (key, value, updatedAt) VALUES 
  ('PAYPAL_SANDBOX_CLIENT_ID', 'AYaucP8wVbDFZiJKXlzyGzSjzyBPxJlviNQ0pBWz0f1EsmDHlzJsVKOu7', CURRENT_TIMESTAMP),
  ('PAYPAL_SANDBOX_SECRET', 'EBWT-xphyVS3L99QnQ27af6QfoW9ovHlsqznlyfoqvl4oeuP5b4e5U', CURRENT_TIMESTAMP);

-- Vérification
SELECT key, SUBSTR(value, 1, 20) || '...' as value_preview, updatedAt FROM Setting WHERE key LIKE 'PAYPAL%';
