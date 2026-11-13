# Pip & het Letterbos: zo zet je het online

## 1. Op GitHub zetten (eenmalig)

1. Maak op GitHub een nieuwe repository, bijvoorbeeld **letterbos** (publiek, net als Sterke Beer).
2. Pak de zip uit in `~/Documents/letterbos` en open die map in VS Code.
3. Open de terminal (Ctrl+`) en typ:
   ```
   git init -b main
   git add .
   git commit -m "Pip & het Letterbos"
   git remote add origin https://github.com/Ramonnv/letterbos.git
   git push -u origin main
   ```
4. Zet op GitHub **Settings → Pages → Source** op **GitHub Actions**.
5. Kijk bij **Actions**: na ongeveer 15 minuten staan de web-app en de APK klaar.
   - Web-app: `https://ramonnv.github.io/letterbos/`
   - APK: onder **Releases → nieuwste**

> De tablet heeft Google Family Link, dus de APK installeren lukt misschien niet. Gebruik dan de web-app:
> open de link in Chrome op de tablet en kies ⋮ → *Toevoegen aan startscherm*. Hij werkt daarna ook offline.

## Bijwerken naar een nieuwe versie

Elke keer dat er iets in de repository verandert (een push), bouwt GitHub automatisch een nieuwe versie.
Het versienummer gaat dan vanzelf omhoog (1.1, 1.2, 1.3…).

- **Web-app:** werkt zichzelf bij. De volgende keer dat ze het spel opent met internet, heeft ze de nieuwe versie.
- **Android-app:** bij ⚙️ verschijnt een rood stipje. Bij *Ouders → Instellingen* staat dan een knop
  **Nieuwe versie downloaden**. Open de download en kies *Installeren*: hij gaat over de oude heen en de
  voortgang, sterren en cadeautjes blijven bewaard. Of download hem zelf via *Releases → nieuwste*.

> Dat over de oude heen installeren werkt alleen als elke versie met dezelfde sleutel wordt ondertekend.
> Die sleutel staat (veilig, niet zichtbaar) als geheim in GitHub: **Settings → Secrets and variables →
> Actions** met de namen `LETTERBOS_KEYSTORE` en `LETTERBOS_KEY_PASS`. Bewaar `letterbos-sleutel.txt` op een veilige plek.

## 2. Lokaal bouwen met je eigen Blender (optioneel)

Dubbelklik op **Bouw-modellen.command** (of in de terminal: `bash scripts/blender-lokaal.sh`).
Dat gebruikt `/Applications/Blender.app` om alle modellen en plaatjes te maken in `web/assets/`.
Daarna: `cd web && python3 -m http.server 8000` en open http://localhost:8000.

## 3. Spelen

- Tik op ▶ en Pip springt naar de volgende steen. Elke steen is een nieuwe klank of een woordjesfeest.
- Na elk level kiest ze een cadeautje. In 👗 kan ze Pip aankleden, in 🔤 staan haar letters, in 🏆 de bekers.
- **⚙️ Ouders** (met een rekensommetje): rapport, eigen stem inspreken, aantal levels per dag, back-upcode.

### Tips voor de stem
Op school leren kinderen de **klank** (mmm, sss, kuh) en niet de letternaam (em, es, kaa).
Een computerstem doet dat niet altijd goed. Spreek daarom bij **Ouders → Stem** de klanken het liefst zelf in.
Dat duurt een paar minuten en maakt het spel veel beter.

## Aanpassen
- Klanken, woordjes, werelden en alles wat Pip zegt: `web/js/content.js`
- 3D-modellen (Pip, cadeaus, bekers, bomen): `tools/recipes.mjs`
- Een andere voorleesstem: zet in `.github/workflows/build.yml` bij de stem-stap `LB_VOICE: nl_BE-nathalie-medium`
