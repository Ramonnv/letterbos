# 🐉 Pip & het Letterbos

Een 3D-leesspel voor kleuters (ongeveer 4 tot 6 jaar) die heel graag willen leren lezen.
Pip is een klein letterdraakje met honger naar letters. Je dochter voert hem letters, en zo leert ze
de klanken, hoort ze woordjes in stukjes, en leest ze uiteindelijk zelf korte woordjes zoals *kip*, *maan* en *boom*.

Alles wordt voorgelezen, dus ze hoeft niets te kunnen lezen om te spelen.

- **4 werelden** op een 3D-eiland: het Bos, het Strand, het Kasteel en de Sterrenberg (daar wordt het avond)
- **27 klanken** in de volgorde die op school ook vaak gebruikt wordt (eerst i, k, m, aa, s…), **42 levels**
- **Spelletjes**: letters voeren aan Pip, beginklank zoeken, hakken en plakken (k–i–p → 🐔), zelf lezen,
  woordjes bouwen, en elke nieuwe letter met je vinger overtrekken
- **Beloningen**: sterren per level, na elk level een **cadeautje** voor Pip (strik, kroon, cape, nieuwe kleur…),
  een **beker** per wereld, een **letterboek** en een **oorkonde** om te printen
- **Rapport voor ouders**: welke klanken goed gaan en welke nog geoefend moeten worden, speeltijd per dag,
  gelezen woordjes en tips om samen te oefenen. Printen of als PDF bewaren.
- **Eigen stem**: papa of mama kan elke klank zelf inspreken (Ouders → Stem). Pip gebruikt dan jouw stem.
- Moeilijke letters komen vaker terug. Na twee keer fout wijst Pip het goede antwoord aan, zodat ze nooit vastloopt.
- Instelbaar aantal nieuwe levels per dag (standaard 3)

## Spelen

- **Web-app:** `https://<jouw-naam>.github.io/letterbos/` (op de tablet: ⋮ → *Toevoegen aan startscherm*)
- **Android-app:** download **Letterbos.apk** onder *Releases*

Voortgang wordt op het apparaat bewaard. Het ouderdeel zit achter ⚙️ (met een rekensommetje).

## Hoe het gebouwd wordt

Precies zoals Sterke Beer. Bij elke push bouwt **GitHub Actions** alles automatisch:

1. **Blender** (CLI) bouwt de 3D-modellen uit `tools/recipes.mjs` → `web/assets/models/*.glb`
   en rendert met Cycles Pip, de bekers en een icoontje van elk cadeau (`blender/build_assets.py`).
2. **Piper** (Nederlandse voorleesstem) maakt van alle zinnetjes mp3'tjes (`tools/make_speech.py`).
3. **.NET for Android** verpakt het spel in een APK (`MainActivity.cs`) en zet hem bij *Releases*.
4. De web-app wordt gepubliceerd op **GitHub Pages**.

Het spel zelf staat in `web/` (three.js). Lokaal testen: `cd web && python3 -m http.server` en open http://localhost:8000.
Zonder Blender-modellen bouwt het spel dezelfde modellen zelf op uit de recepten. Zonder Piper-stem gebruikt het
de stem van het apparaat.

Zie `LEESMIJ.md` voor de stappen om het op GitHub te zetten en lokaal met Blender te bouwen.
