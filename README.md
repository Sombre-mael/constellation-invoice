# Constellation Invoice

Application web Next.js pour concevoir, sauvegarder et partager des devis professionnels Constellation.

## Fonctionnalités

- édition en direct des coordonnées, prestations et conditions ;
- calcul automatique du sous-total, de la remise, des taxes et de l’acompte ;
- prise en charge de l’USD, du CDF et de l’EUR ;
- sauvegarde automatique et bibliothèque locale de devis ;
- partage d’un devis par lien encodé ;
- impression et export PDF depuis le navigateur ;
- interface responsive en français ;
- installation PWA sur Android, ordinateur et écran d’accueil iPhone ;
- suivi automatique de la version déployée et mise à jour sans réinstallation.

Les devis restent sur l’appareil tant qu’aucun service de stockage distant n’est configuré.

## Développement

```bash
pnpm install
pnpm dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000).

## Vérification

```bash
pnpm lint
pnpm typecheck
pnpm test:pwa
pnpm build
```

Pour les aperçus de partage en production, copier `.env.example` vers `.env.local` et définir `NEXT_PUBLIC_SITE_URL` avec l’URL publique exacte.

En production, la plateforme peut définir `NEXT_PUBLIC_APP_VERSION`. Sur Vercel, le SHA Git du déploiement est utilisé automatiquement. Le service worker privilégie une interface fraîche et ne met pas en cache les pages ou bundles Next.js ; un démarrage totalement hors ligne n’est donc pas inclus dans cette version.
