# Uitdager 🏆

Maandelijkse challenge app voor Manon & Melvin — gebouwd als PWA met Next.js + Supabase.

## Deploy op Vercel

1. Ga naar [vercel.com](https://vercel.com) en maak een gratis account
2. Klik op **Add New Project** → koppel je GitHub account → selecteer `Uitdager`
3. Vercel detecteert Next.js automatisch
4. Voeg deze **Environment Variables** toe in Vercel dashboard:

| Variabele | Waarde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://pfnfxlegtiwdzfjcwpib.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(zie Supabase dashboard → Project Settings → API)* |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | *(genereer hieronder)* |
| `VAPID_PUBLIC_KEY` | *(zelfde als boven)* |
| `VAPID_PRIVATE_KEY` | *(genereer hieronder)* |
| `VAPID_EMAIL` | `mailto:melvin@jouwdomein.nl` |

5. Klik **Deploy** — klaar!

## VAPID keys genereren (eenmalig)

Ga naar: https://vapidkeys.com en genereer een keypair.
Of open browser console en run:
```js
// Installeer web-push lokaal en run: npx web-push generate-vapid-keys
```

## Op iPhone installeren als app

1. Open de Vercel URL in **Safari**
2. Tik op het **Deel-icoontje** (↑)
3. Kies **“Voeg toe aan beginscherm”**
4. Klaar — de app staat nu als echt icoon op je thuisscherm!

## Inlogcodes

- **Manon**: 1993
- **Melvin**: 2711

## Functies

- 🗺️ Candy Crush-stijl kaart met gedeelde voortgang
- 🔥 Dagelijkse activiteiten per stuk afvinken
- ⏱ Ingebouwde timer voor geminuutde activiteiten
- 📊 Statistieken (streaks, wie is er eerst, gemiste dagen, etc.)
- ⚡ Real-time sync — zie direct wat de ander doet
- 🔔 Push notificaties (na PWA installatie op iPhone)
