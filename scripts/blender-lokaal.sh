#!/bin/bash
# Bouwt de 3D-modellen en plaatjes met de Blender op je Mac.
set -e
cd "$(dirname "$0")/.."
BLENDER="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
[ -x "$BLENDER" ] || BLENDER="$(command -v blender)"
echo "Blender: $BLENDER"
node tools/recipes.mjs > web/assets/models.json
LB_SAMPLES="${LB_SAMPLES:-64}" "$BLENDER" -b --factory-startup -P blender/build_assets.py -- web/assets/models.json web/assets
python3 tools/make_icons.py web/assets/renders/pip.png || true
echo "Klaar! Start het spel met:  cd web && python3 -m http.server 8000"
