# VANTIQ — application Inbox

## Prérequis
- Node.js 20 ou plus récent
- Un projet Supabase avec le script SQL initial VANTIQ déjà exécuté

## Installation
1. Décompressez le ZIP.
2. Ouvrez un terminal dans le dossier `vantiq-app`.
3. Exécutez `npm install`.
4. Copiez `.env.example` vers `.env.local`.
5. Dans Supabase > Project Settings > API, récupérez l'URL du projet et la clé publishable (ou anon) et renseignez `.env.local`.
6. Exécutez `npm run dev`.
7. Ouvrez http://localhost:3000.

## Fonctionnalités présentes
- Inscription et connexion par e-mail/mot de passe via Supabase Auth.
- Création automatique d'un workspace lors de la première connexion.
- Lecture, recherche, filtrage et changement de statut des messages.
- Ajout manuel de demandes réellement enregistrées dans Supabase.
- Brouillons IA et réception e-mail non encore connectés.

## Sécurité
- Le navigateur utilise uniquement la clé publishable/anon Supabase.
- Ne placez JAMAIS la clé `service_role` dans `.env.local` côté navigateur, ni dans un fichier envoyé au client.
- Les accès aux données reposent sur les politiques RLS configurées dans Supabase.
- Avant un lancement commercial, faire auditer les politiques RLS, ajouter les procédures de suppression/export, journalisation, limitation d'abus et tests multi-comptes.

## Note
Cette version est un premier socle technique, pas encore un service prêt pour la production. Les e-mails entrants, l'IA, les invitations d'équipe, la facturation et les pages légales restent à développer.
