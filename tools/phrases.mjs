// Schrijft alle zinnetjes en klanken die Pip zegt naar een JSON-lijst (voor tools/make_speech.py).
// Gebruik:  node tools/phrases.mjs > /tmp/phrases.json
import { allPhrases } from '../web/js/content.js';
process.stdout.write(JSON.stringify(allPhrases(), null, 1));
