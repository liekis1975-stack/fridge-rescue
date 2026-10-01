# Fridge Rescue - Project Handoff

## Projekto tikslas

**Fridge Rescue** yra receptų paieškos aplikacija, padedanti vartotojui rasti receptus pagal turimus ingredientus, peržiūrėti recepto informaciją, išsaugoti patinkančius receptus ir paprašyti AI pritaikyti receptą.

Projektas kuriamas su **Next.js** ir programuojamas **VS Code** aplinkoje.

Naudotojas yra visiškas pradedantysis, todėl sprendimai turi būti paprasti, aiškiai paaiškinti ir neperkomplikuoti. Reikia vengti nereikalingų abstrakcijų bei perteklinių bibliotekų.

## Patvirtintas funkcionalumo planas

1. Receptų paieška pagal ingredientą arba recepto pavadinimą.
2. Pasirinkto recepto detalių peržiūra.
3. Vartotojo registracija ir prisijungimas.
4. Patinkančių receptų išsaugojimas ir pašalinimas.
5. AI recepto pritaikymas pagal vartotojo prašymą, pavyzdžiui, pakeisti ingredientą, sumažinti porciją ar pritaikyti receptą vegetariškai.

## Naudojamos sistemos

- **TheMealDB API** – receptų paieškai ir išsamiems receptų duomenims gauti.
- **Supabase Auth** – registracijai, prisijungimui, atsijungimui ir vartotojo sesijai.
- **Supabase Database** – vartotojo išsaugotiems receptams saugoti. Duomenys turi būti apsaugoti Row Level Security taisyklėmis.
- **Gemini API** – AI recepto pritaikymo atsakymams generuoti. API raktas turi likti serverio pusėje.
- **Vercel** – galutiniam Next.js aplikacijos deploy.

## Naršyklė ir serveris

### Kas vyksta naršyklėje

- Rodomas paieškos puslapis, receptų sąrašas ir recepto detalių puslapis.
- Vartotojas įveda ingredientą, recepto pavadinimą arba AI pritaikymo prašymą.
- Rodomos įkėlimo, tuščio rezultato ir klaidos būsenos.
- Vartotojas registruojasi, prisijungia, atsijungia ir mato savo išsaugotus receptus.
- Naršyklė siunčia veiksmus aplikacijos serveriui.
- Naršyklėje gali būti naudojamas Supabase viešas anon raktas pagal Supabase rekomenduojamą klientą, tačiau slapti raktai į naršyklę nepatenka.

### Kas vyksta serverio pusėje

- Serveris kreipiasi į TheMealDB API ir paruošia duomenis rodymui.
- Serveris gauna recepto detales pagal TheMealDB recepto ID.
- Serveris tikrina Supabase vartotojo sesiją prieš saugodamas ar trindamas receptą.
- Serveris skaito ir keičia vartotojo išsaugotų receptų duomenis Supabase duomenų bazėje.
- Serveris kreipiasi į Gemini API (`/api/ai` endpointas), kai vartotojas prašo pritaikyti receptą.
- Serveris saugo slaptus API raktus, tikrina įvesčių ribas ir tvarko išorinių paslaugų klaidas.

## Dabartinė projekto būsena

### Kas jau sukurta

- Veikia Next.js projektas su TypeScript, App Router, ESLint ir Tailwind CSS.
- Veikia TheMealDB receptų paieška.
- Veikia paieška pagal ingredientą.
- Veikia paieška pagal patiekalo pavadinimą.
- Veikia recepto detalių puslapis pagal `idMeal`.
- Recepto puslapyje rodomas pavadinimas, paveikslėlis, kategorija, regionas, ingredientai ir instrukcija.
- Veikia klaidų ir loading būsenos.
- Supabase yra prijungtas.
- Veikia registracija su vardu, el. paštu ir slaptažodžiu.
- Veikia prisijungimas ir atsijungimas.
- Veikia Supabase vartotojo session.
- Veikia puslapis „Mano receptai“.
- Veikia receptų išsaugojimas į Supabase.
- Veikia išsaugotų receptų pašalinimas.
- Sukurta `saved_recipes` lentelė.
- Įjungtas RLS, todėl vartotojai mato tik savo išsaugotus receptus.
- Gemini API raktas pridėtas į `.env.local` kaip `GEMINI_API_KEY`.
- `.env.local` ignoruojamas Git.
- Veikia `/api/gemini-test` – paprastas Gemini SDK patikrinimas.
- Veikia `/api/ai` – AI recepto pritaikymo endpointas.
- Veikia „AI recepto gelbėtojas" su recepto pritaikymo forma.

### AI konfigūracija

- **Provider:** Gemini API
- **SDK:** `@google/genai`
- **Modelis:** `gemini-3.8-flash`
- **Serverio endpointas:** `/api/ai`
- **API raktas:** `GEMINI_API_KEY`
- Raktas laikomas tik serverio pusėje

### Esami pagrindiniai failai ir aplankai

- `app/` – Next.js puslapių ir išdėstymo failai.
- `public/` – vieši statiniai failai.
- `package.json` – projekto priklausomybės ir komandos.
- `package-lock.json` – npm priklausomybių versijų užraktas.
- `tsconfig.json` – TypeScript nustatymai.
- `next.config.ts` – Next.js nustatymai.
- `eslint.config.mjs` – ESLint nustatymai.
- `postcss.config.mjs` – PostCSS ir Tailwind nustatymai.
- `next-env.d.ts` – Next.js TypeScript tipų deklaracijos.
- `.gitignore` – Git ignoruojami failai.
- `README.md` – pradinė Next.js dokumentacija.
- `AGENTS.md` ir `CLAUDE.md` – agentų darbo gairės.

### Atliktos komandos

- `node --version` – patikrinta Node.js versija `v24.19.0`.
- `npm --version` – patikrinta npm versija `11.17.0`.
- `npx create-next-app@latest . --typescript --eslint --tailwind --app --use-npm --import-alias "@/*" --yes` – sukurtas Next.js projektas.
- `npm install --no-audit --no-fund --ignore-scripts` – užbaigtas npm priklausomybių diegimas.
- `npm run lint` – patikra praėjo be klaidų.
- `npm run build` – gamybinis build sėkmingas.
- `npm run dev -- --hostname 127.0.0.1` – paleistas kūrimo serveris.
- `Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing` – gautas atsakymas `200 OK`.

Pirmasis `create-next-app` diegimo bandymas buvo trumpam nutrūkęs su `SIGINT` ir Windows `EPERM` valymo įspėjimais, tačiau priklausomybių diegimas vėliau užbaigtas sėkmingai.

### Dabartinės klaidos

Šiuo metu žinomų projekto kodo klaidų nėra. `lint` ir `build` patikros buvo sėkmingos. Serverio `exit code 1` atsirado po kūrimo proceso nutraukimo ir nėra įrodymas, kad aplikacija neveikia.

## Žinomos problemos

- Gemini kartais grąžina `503 UNAVAILABLE` dėl didelės serverio apkrovos. Tai nėra API rakto ar pagrindinės aplikacijos logikos klaida. Aplikacija rodo suprantamą klaidos pranešimą vartotojui.

## Saugumo taisyklės

- `.env.local` failo nekelti į GitHub ir neįtraukti į commitus.
- `GEMINI_API_KEY` nedėti į `NEXT_PUBLIC_...` kintamąjį.
- Slaptus raktus laikyti tik serverio pusėje.
- Naršyklė neturi tiesiogiai kviesti Gemini API.
- Service-role raktų niekada nekelti į naršyklės kodą.
- Supabase duomenų bazėje naudoti Row Level Security, kad vartotojas pasiektų tik savo išsaugotus receptus.
- Išorinių API atsakymus ir vartotojo įvestį tikrinti bei tvarkyti klaidas.

## Dizaino kryptis

Aplikacija turi būti ne tik funkcionali, bet ir vizualiai tvarkinga:

- naudoti modernias receptų korteles;
- pasirūpinti geru spacing ir aiškia informacijos hierarchija;
- naudoti aiškius mygtukus bei įkėlimo būsenas;
- užtikrinti responsive dizainą telefonui ir kompiuteriui;
- neperkrauti projekto bereikalingomis UI ar kitomis bibliotekomis;
- išlaikyti paprastą, lengvai suprantamą struktūrą.

## CURRENT NEXT STEP

- Projektas baigtas iki 16 užduoties imtinai.
- Veikia TheMealDB paieška ir recepto detalės.
- Veikia Supabase Auth, session, „Mano receptai“ ir „Mano AI receptai“ su RLS.
- Veikia `/api/gemini-test` ir `/api/ai`.
- Veikia „AI recepto gelbėtojas“ ir pritaikytų receptų išsaugojimas.
- 16 užduotis:
  - Pilnai patikrintas ir sutvarkytas API klaidų valdymas (Gemini 401, 429, 503, 502).
  - TheMealDB gedimų gaudymas ir vartotojui pateikiami aiškūs lietuviški pranešimai.
  - Supabase RLS apsaugos testai (neautorizuoti ir svetimi veiksmai blokuojami DB lygyje).
  - Pašalinti techniniai stack trace / klaidų pranešimai, visi pranešimai pateikiami aiškia lietuvių kalba.
- Kitas darbas prasidės nuo naujo atsiskaitymo reikalavimų.
