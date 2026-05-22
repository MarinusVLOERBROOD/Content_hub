# Content Hub

Intern platform voor bestandsbeheer, klantenportaal, takenbeheer en agenda. Gebouwd met Next.js, Prisma en SQLite.

## Vereisten

- Node.js 18 of hoger
- npm

## Installatie

### 1. Clone de repository

```bash
git clone https://github.com/MarinusGoossens/content-hub.git
cd content-hub
```

### 2. Installeer dependencies

```bash
npm install
```

### 3. Configureer de omgevingsvariabelen

Kopieer het voorbeeld-bestand en vul de waarden in:

```bash
cp .env.example .env.local
```

Open `.env.local` en stel `SESSION_SECRET` in op een willekeurige string van minimaal 32 tekens.
Genereer er een met Node.js:

```bash
node -e "const c = require('crypto'); console.log(c.randomBytes(48).toString('base64url'))"
```

### 4. Initialiseer de database

```bash
npm run db:setup
```

Dit past alle migraties toe en laadt demo-data.

### 5. Start de development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## Demo-accounts

| Email | Wachtwoord | Rol |
|---|---|---|
| admin@deleomedia.nl | admin1234 | Admin |
| marinus@deleomedia.nl | user1234 | Gebruiker |
| lisa@deleomedia.nl | user1234 | Gebruiker |

## Tech-stack

| Laag | Technologie |
|---|---|
| Framework | Next.js (App Router) |
| Database | SQLite via Prisma ORM |
| Authenticatie | iron-session (encrypted cookies) |
| Styling | Tailwind CSS |
| Bestandsopslag | Lokaal (standaard) of cloud (Google Drive, OneDrive, Dropbox, MEGA) |
