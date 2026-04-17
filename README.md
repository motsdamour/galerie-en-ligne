# Mots d'Amour — Galerie vidéo privée

Plateforme de galerie vidéo pour les clients Mots d'Amour.

## Architecture

```
Tablette (événement) → pCloud (sync auto wifi) → Next.js galerie → Supabase (BDD) → Vercel
```

## Installation locale

```bash
npm install
cp .env.local.example .env.local
# Remplir les variables
npm run dev
# → http://localhost:3000/admin
```

## Configuration

### 1. Supabase
1. Créer un projet sur supabase.com (gratuit)
2. SQL Editor → coller et exécuter supabase-schema.sql
3. Settings > API → copier les 3 clés dans .env.local

### 2. pCloud
1. pcloud.com → Settings > Security > Access Tokens
2. Créer un token lecture → PCLOUD_ACCESS_TOKEN
3. L'ID d'un dossier est visible dans l'URL pCloud : #folder=XXXXXXXX

### 3. .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PCLOUD_ACCESS_TOKEN=votre_token
ADMIN_PASSWORD=mot_de_passe_fort
JWT_SECRET=chaine_32_caracteres_min
NEXT_PUBLIC_SITE_URL=https://galerie.mots-damour.fr
```

Générer un JWT_SECRET : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Déploiement Vercel

```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/votre-compte/mots-damour-galerie.git
git push -u origin main
```

1. vercel.com → New Project → importer le repo
2. Ajouter les variables d'environnement
3. Deploy
4. Settings > Domains → ajouter galerie.mots-damour.fr
5. DNS chez votre hébergeur : CNAME galerie → cname.vercel-dns.com

## Utilisation quotidienne

1. Aller sur /admin → se connecter
2. Remplir le formulaire : noms, date, ID dossier pCloud
3. Copier le message généré → l'envoyer aux mariés

## Workflow pCloud (côté loueur)

1. Créer un dossier pCloud dédié avant la prestation
2. La tablette sync automatiquement dans ce dossier après l'événement
3. Créer la galerie dans le back-office avec l'ID du dossier
4. Envoyer lien + mot de passe aux mariés

## Structure
```
app/admin/          → Back-office
app/galerie/[slug]  → Galerie publique
app/api/admin/      → API gestion événements
app/api/gallery/    → API galerie (auth + vidéos)
components/         → GalleryPasswordPage, GalleryViewer
lib/                → auth.ts, pcloud.ts, supabase.ts
supabase-schema.sql → Schéma BDD à importer
```
