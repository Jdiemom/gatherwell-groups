# Groups by Gatherwell — mobile app

The iOS and Android app for [groupsbygatherwell.com](https://www.groupsbygatherwell.com). It is
not a wrapper around the website: it is a native app built with Expo (React Native) that talks to
**the same Supabase project** and **the same API routes** the website uses. A traveller can vote on
their phone and the organizer sees it in a browser a second later, because there is only one
database and one set of rules.

---

## The one thing to do before anyone can sign in

**Add the sign-in code to your Supabase email template.** Without this the app cannot log anyone in.

The website emails a magic *link*, which works because a browser can follow it back into the same
tab. On a phone that round trip is fragile (the link often opens in the wrong browser, or on a
different device from the one holding the app), so the app asks for the **six-digit code** that
Supabase puts in the same email. You just have to make the template show it.

1. Supabase dashboard → **Authentication** → **Email Templates** → **Magic Link**
2. Add this line anywhere in the template:

   ```html
   <p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>
   ```

3. Save.

This is additive. The link keeps working exactly as it does now for people signing in on the
website; the code is simply also present for people signing in on a phone. One email serves both.

---

## Setup

```bash
cd mobile
npm install
cp .env.example .env     # then fill in the two Supabase values
```

`.env` needs the **same** two values the website already uses:

| App variable | Website equivalent |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `EXPO_PUBLIC_SITE_URL` | your deployed site, for the API routes |

The anon key is designed to be public. Every table it can reach is protected by row level security,
so the app can only ever read what that signed-in traveller is allowed to read. **Never put the
service role key in this folder** — it bypasses all of those rules.

## Running it

```bash
npm start           # dev server, open in Expo Go or a dev build
npm run typecheck   # tsc --noEmit
```

The app uses two native modules that are not in Expo Go (`@react-native-community/datetimepicker`
is, but a release build is the honest test), so for anything beyond a quick look use a development
build: `npx eas-cli build --profile development`.

## Building and submitting

No Mac required; EAS builds and signs in the cloud.

```bash
npx eas-cli login
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

`eas.json` is already configured. You have an Apple Developer account from **Gatherwell Travel**
(App Store ID 6762874183), so this app goes under the same team.

---

## How it stays identical to the website

The app does **not** keep its own copy of your content. `src/shared.ts` imports these straight out
of the repository root, and `metro.config.js` tells the bundler to watch that folder:

| Shared from the website | What it drives |
| --- | --- |
| `lib/steps.ts` | the nine steps and every seeded poll and option |
| `lib/destinations.ts` | the Gatherwell Destination Library |
| `lib/match.ts` | destination scoring against the group's votes |
| `lib/airports.ts` | home-airport lookup |
| `lib/legal.ts` | plan prices, contact details, legal name |

Change a poll option on the website and the app ships it on the next build. There is no second copy
to forget about.

Everything else is shared at runtime: the same `groups`, `group_members`, `polls`, `votes`,
`date_votes`, `step_progress` and `subscriptions` tables, under the same policies.

### The one change made to the website

Route handlers authenticated with a cookie, which a native app has no way to send. `supabaseRoute()`
in `lib/supabase/server.ts` now accepts **either** the browser's cookie **or** a bearer token, so
each route runs the same logic for both clients. Nothing about the website's behaviour changed.

One route was added, `POST /api/groups/plan`. The group's tier is the organizer's subscription, and
row level security only lets someone read their *own* subscription row, so a member's phone cannot
read it directly. The route checks membership and returns nothing but the plan name.

---

## Subscriptions are deliberately not sold in the app

Apple's Guideline 3.1.1 requires digital subscriptions sold *inside* an iOS app to use In-App
Purchase, at a 15–30% commission. So the app **reads** an existing subscription and never sells one:

- **Travellers** are unaffected. Joining and voting have always been free, which is most of your users.
- **Organizers** subscribe on the website and sign in here with the same email.

The app therefore never shows a price or a purchase button, and never links out to one. Screens that
would have offered an upgrade say where to do it instead. Keep it that way; a checkout screen or an
"upgrade" link is the most common reason an app like this is rejected.

## Before you submit

- [ ] **App icon.** `assets/icon.png` is currently the website logo. It is square and has no alpha
      channel, so it is technically valid, but a logo drawn for a web header rarely reads well at
      60px on a home screen. Worth a purpose-made 1024×1024 icon.
- [ ] **Android adaptive icon.** `assets/android-icon-foreground.png` is the same logo; Android
      masks it to a circle, so it needs a version with padding around the artwork.
- [ ] **Screenshots** for App Store Connect (6.7" iPhone at minimum).
- [ ] **Privacy questionnaire.** The app collects email address and name, and the trip answers
      travellers give. `app/privacy/page.tsx` on the website already describes this.
- [ ] **Universal links.** `app.json` claims `groupsbygatherwell.com`. For invite links to open the
      app rather than Safari, serve an
      [`apple-app-site-association`](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
      file from the website. Without it invite links still work; they just open in the browser.
- [ ] **Test the sign-in code** end to end after the email template change above.

## Layout

```
src/
  app/            screens (expo-router: every file is a route)
  components/     the visual kit, matching the website's atoms
  group/          the nine-step flow
    derive.ts     all the maths, ported from the website and kept pure
    actions.ts    every database write
    documents.ts  budget sheet, itinerary, payment schedule, invites
    steps/        one file per step
  lib/            supabase client, API client, session, sharing
  shared.ts       the bridge to the website's data
  theme.ts        the website's colours and fonts
```
