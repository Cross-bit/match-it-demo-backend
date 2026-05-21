# Match-it Backend

Backendové služby pro mobilní aplikaci **Match-it** — výzkumný prototyp skupinového doporučovacího systému, který pomáhá skupinám přátel najít shodu na filmu nebo restauraci v okolí pomocí hlasovacích relací a skupinových doporučovacích algoritmů.

> Mobilní aplikace je dostupná v repozitáři [match-it-android](https://github.com/Cross-bit/match-it-demo-mobile/tree/thesis).

---

## Přehled

Match-it umožňuje skupině uživatelů vytvořit společnou hlasovací relaci, procházet doporučené aktivity — filmy nebo restaurace — a postupně dojít ke shodě. Backend je rozdělen do několika mikroslužeb, z nichž každá pokrývá samostatnou oblast aplikace.

```
                        ┌──────────────────────────────────────────────┐
                        │              Match-it Backend                │
                        │                                              │
  Android aplikace ───► │  user-account-manager                        │
                        │  friendship-manager                          │
                        │  matching-sessions-service                   │
                        │  activity-recommendation-system              │
                        │                                              │
                        │  Externí služby: Mailgun · FCM               │
                        │  Google Places API · The Movie Database      │
                        └──────────────────────────────────────────────┘
```

---

## Služby

Všechny služby se nacházejí ve složce `./services/`. Každá podsložka odpovídá jedné samostatně nasaditelné službě.

### `user-account-manager` · TypeScript / Node.js / Express

Zajišťuje registraci uživatelů, přihlášení, autentizaci pomocí JWT, obnovu tokenů a správu profilu včetně nahrávání profilového obrázku.

### `friendship-manager` · TypeScript / Node.js / Express

Spravuje žádosti o přátelství, vytváření a rušení přátelství a vyhledávání uživatelů. Sdílí databázi se službou `user-account-manager`, aby bylo možné efektivně provádět relační dotazy nad uživateli a jejich vazbami.

### `matching-sessions-service` · TypeScript / Node.js / Express

Hlavní služba řídící životní cyklus hlasovací relace — od vytvoření skupiny a pozvání členů přes živé hlasování až po detekci shody. Komunikuje obousměrně s klienty a deleguje generování doporučení na službu `activity-recommendation-system`.

### `activity-recommendation-system` · Python / Flask

Poskytuje doporučovací endpointy využívané službou `matching-sessions-service`. Implementuje algoritmy skupinového doporučování pro návrh aktivit. Aktuálně podporuje **doporučování filmů**; doporučování restaurací využívá externí data o místech z Google Places API.

---

## Databáze

Systém používá jednu instanci **PostgreSQL**. Schéma je definováno pomocí očíslovaných inicializačních skriptů ve složce `./databases/postgresql/db1/init/`.

Tabulky jsou záměrně oddělené podle domén jednotlivých služeb. Vazby mezi doménami jsou udržovány pomocí sdílených UUID namísto cizích klíčů napříč doménami, aby bylo možné schéma v budoucnu snadněji rozdělit do samostatných databází pro jednotlivé služby.

---

## Externí závislosti

| Služba | Účel |
|---|---|
| [Mailgun](https://www.mailgun.com/) | Transakční e-maily, například registrace a pozvánky |
| [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) | Push notifikace |
| [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview) | Vyhledávání restaurací v okolí |
| [The Movie Database (TMDB)](https://www.themoviedb.org/documentation/api) | Metadata filmů, například popisy, hodnocení a plakáty |

---

## Příprava datasetů

Skripty pro přípravu datasetů se nacházejí ve složce `./tools/data/`. Podrobnosti jsou uvedeny v README souborech v jednotlivých podsložkách.

**Filmy:** Doporučovač filmů založený na metodě EASE vyžaduje pro trénování dataset [MovieLens](https://grouplens.org/datasets/movielens/). Pro přípravu zmenšené verze datasetu použijte připravený skript. EASE vytváří úplnou item×item ko-výskytovou matici a počítá její inverzi, což je při použití celého datasetu náročné na paměť i výpočetní čas.

Zpracované soubory patří do složky:

```text
services/activity-recommendation-system/src/datasets/movies/ml/
```

Podrobnosti jsou v souboru `tools/data/movies/README.md`.

**Restaurace:** Doporučování restaurací využívá předem stažený dataset získaný přes Google Places API. Tento dataset není součástí repozitáře.

Podrobnosti jsou v souboru `tools/data/restaurants/README.md`.

---

## Lokální spuštění

Celý backend lze v development režimu spustit z kořenové složky repozitáře:

```sh
./tools/build/compose.sh --dev up
```

Příkaz používá Docker Compose a spustí všechny služby společně s databází.

### Požadavky

- Docker + Docker Compose
- Nakonfigurovaný soubor `.env.dev`; jako základ použijte `.env.example` v kořeni repozitáře

### Konfigurace prostředí

Vytvořte soubor `.env.dev` podle připravené šablony:

```bash
cp .env.example .env.dev
```

#### Firebase credentials (FCM)

Push notifikace přes Firebase vyžadují service account JSON soubor uložený přímo v repozitáři. Nastavení proměnné prostředí samo o sobě nestačí.

1. Otevřete [Firebase Console](https://console.firebase.google.com/) → **Project Settings → Service Accounts → Generate new private key**
2. Stažený soubor uložte jako:
   ```text
   config/credentials/firebase.json
   ```
3. Zkontrolujte, že `.env.dev` obsahuje:
   ```dotenv
   FIREBASE_APPLICATION_CREDENTIALS=./config/credentials/firebase.json
   ```

⚠️ Aplikace je navržena pro skupinovou interakci. Klíčové části systému — tvorba skupiny, pozvánky a synchronizované hlasovací relace — využívají Firebase Cloud Messaging.

Bez FCM systém nepodporuje plnohodnotnou multi-user relaci.

> FCM credentials jsou vyžadovány službami `matching-sessions-service` a `friendship-manager`. Složka `config/credentials/` je uvedena v `.gitignore`; soubor s credentials nikdy necommitujte.

#### Povinné proměnné

| Proměnná | Popis |
|---|---|
| `ACCESS_TOKEN_SECRET` | Tajný klíč pro podepisování JWT access tokenů |
| `REFRESH_TOKEN_SECRET` | Tajný klíč pro podepisování JWT refresh tokenů |
| `FIREBASE_APPLICATION_CREDENTIALS` | Cesta k FCM credentials souboru, viz výše |
| `TMDB_API_KEY` | Klíč vyžadovaný pro metadata filmů |
| `GOOGLE_PLACES_API_KEY` | Klíč vyžadovaný pro data restaurací a stahování fotografií |

#### Volitelné proměnné

| Proměnná | Popis |
|---|---|
| `EMAIL_MAILGUN_API_KEY` | Vyžadováno pouze pro e-mailové ověření registrace; ve výchozím nastavení je vypnuto přes `BYPASS_EMAIL_VERIFICATION` |
| `SUDO_API_KEY` | Povoluje privilegované REST endpointy |

### Poznámky k síti

- Android emulátor: pro přístup k backendu běžícímu na hostitelském počítači použijte `10.0.2.2`
- Fyzické zařízení: použijte lokální IP adresu počítače, například `192.168.x.x`

Některé URL v souboru `.env.dev` může být potřeba upravit podle zvoleného prostředí. Podrobnosti jsou uvedeny v komentářích přímo v souboru.

---

## Unit testy

Unit testy jsou aktuálně připravené pro TypeScript služby a doporučovací systém:

- `matching-sessions-service`
- `friendship-manager`
- `user-account-manager`
- `activity-recommendation-system` (Python `unittest`)

### Spuštění testů jedné služby lokálně

Z adresáře konkrétní služby spusťte:

```sh
npm test
```

### Spuštění testů pomocí pomocného skriptu

Z kořenové složky repozitáře:

```sh
./tools/tests/run-unit-tests.sh
```

Výchozí režim je `local` a nevyžaduje Docker. Skript spustí `npm test` v adresářích jednotlivých služeb.

Explicitní spuštění v lokálním režimu:

```sh
./tools/tests/run-unit-tests.sh --mode local
```

Spuštění v Docker režimu:

```sh
./tools/tests/run-unit-tests.sh --mode docker
```

Spuštění pouze jedné služby:

```sh
./tools/tests/run-unit-tests.sh --service matching-sessions-service
```

Přeskočení rebuildu pro rychlejší opakovaná spuštění:

```sh
./tools/tests/run-unit-tests.sh --no-build
```

### Praktický workflow

- Pro rychlou lokální iteraci spusťte `npm test` přímo v adresáři konkrétní služby.
- Pro reprodukovatelné spuštění podobné CI použijte Docker režim:
  ```sh
  ./tools/tests/run-unit-tests.sh --mode docker
  ```
- Testy nejsou závislé na běžícím `docker compose up`; Docker režim používá krátkodobé kontejnery přes `docker compose run --rm`.

---

## Integrační testy

Projekty integračních testů jsou ve složce `integration/`:

- `integration/config-integrity-test`
- `integration/api-tests`

Oba typy testů lze spustit pomocí pomocného skriptu:

```sh
./tools/tests/run-integration-tests.sh
```

Spuštění pouze kontroly konfigurace:

```sh
./tools/tests/run-integration-tests.sh --config-only
```

Spuštění pouze API integračních testů:

```sh
./tools/tests/run-integration-tests.sh --api-only
```

Podrobnosti k API integračním testům, včetně testovaných toků, prostředí a řešení problémů, jsou v souboru:

```text
integration/api-tests/README.MD
```

Pokud má skript před testy spustit backendové služby:

```sh
./tools/tests/run-integration-tests.sh --with-stack
```

---

## Struktura repozitáře

```
.
├── databases/
│   └── postgresql/db1/
│       └── init/                    # Očíslované SQL inicializační skripty
├── services/
│   ├── user-account-manager/
│   ├── friendship-manager/
│   ├── matching-sessions-service/
│   │   └── config/credentials/      # FCM credentials (git-ignored)
│   └── activity-recommendation-system/
│       └── src/
│           └── services/
│              └── datasets/
│                  ├── movies/ml/       # Připravená MovieLens data (nejsou součástí repozitáře)
│                  └── restaurants/     # Připravená Places API data (nejsou součástí repozitáře)
└── tools/
    ├── build/
    │   └── compose.sh               # Pomocný skript pro build a spuštění
    ├── tests/
    │   ├── run-unit-tests.sh        # Spouští unit testy (local/docker)
    │   └── run-integration-tests.sh # Spouští integrační testy
    └── data/
        ├── movies/                  # Skript pro přípravu MovieLens dat + README
        └── restaurants/             # Skript pro agregaci dat z Google Places + README
```

---

> Tento repozitář obsahuje výzkumný prototyp vytvořený jako součást bakalářské práce. Některé datasety použité v experimentech nejsou součástí repozitáře.

## Licence

Copyright (c) 2026 Ondřej Kříž

Tento software je výzkumný prototyp licencovaný pouze pro **nekomerční výzkumné a vzdělávací účely**. Komerční použití je zakázáno bez výslovného písemného souhlasu.

Úplné licenční podmínky jsou uvedeny v souboru [LICENSE](./LICENSE). Pro dotazy ohledně komerční licence kontaktujte: ondra.kryz@seznam.cz