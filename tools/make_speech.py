# Maakt de stem van Pip: elke zin als mp3'tje, met een natuurlijke Nederlandse stem.
#
#   pip install edge-tts
#   node tools/phrases.mjs > /tmp/phrases.json
#   python3 tools/make_speech.py /tmp/phrases.json web/assets/spraak
#
# Standaard: de neurale stem "Fenna" (nl-NL-FennaNeural), iets hoger en rustiger, zodat het bij
# een klein draakje past. Andere stemmen: LB_VOICE=nl-NL-ColetteNeural of nl-NL-MaartenNeural.
# Toonhoogte en tempo: LB_PITCH (bijv. +12Hz) en LB_RATE (bijv. -8%).
# Lukt edge-tts niet (geen internet), dan valt het terug op Piper (offline, minder mooi).
import json, sys, os, hashlib, asyncio, subprocess

raw = json.load(open(sys.argv[1]))
# lijst van {"t": tekst, "klank": true/false} (of gewoon teksten)
items = [(x, False) if isinstance(x, str) else (x["t"], bool(x.get("klank"))) for x in raw]
phrases = [t for t, _ in items]
is_klank = {t: k for t, k in items}
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
VOICE = os.environ.get("LB_VOICE", "nl-NL-FennaNeural")
PITCH = os.environ.get("LB_PITCH", "+12Hz")
RATE = os.environ.get("LB_RATE", "-8%")
TAG = f"{VOICE}|{PITCH}|{RATE}|v2"

def fname(t):
    return hashlib.sha1((TAG + "|" + t).encode("utf-8")).hexdigest()[:12] + ".mp3"

async def edge_all():
    import edge_tts
    sem = asyncio.Semaphore(6)
    done = 0
    async def one(t):
        nonlocal done
        dst = os.path.join(out, fname(t))
        if os.path.exists(dst) and os.path.getsize(dst) > 500:
            done += 1; return
        async with sem:
            for attempt in range(4):
                try:
                    rate = "-30%" if is_klank.get(t) else RATE   # klanken langzaam en duidelijk
                    await edge_tts.Communicate(t, VOICE, rate=rate, pitch=PITCH).save(dst)
                    if os.path.getsize(dst) > 500: break
                except Exception as e:
                    print("opnieuw:", t, e, flush=True); await asyncio.sleep(2 + attempt * 3)
        done += 1
        if done % 40 == 0: print(f"{done}/{len(phrases)}", flush=True)
    await asyncio.gather(*(one(t) for t in phrases))

def trim(dst):
    if dst.endswith(".done.mp3"): return
    # stilte aan begin en eind eraf, zodat zinnen vlot op elkaar volgen
    tmp = dst + ".tmp.mp3"
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", dst, "-af",
        # stilte eraf, en zachte stukjes (zoals een lange "mmmm") net zo hard maken als de rest
        "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
        "dynaudnorm=f=50:g=5:p=0.9:m=20,loudnorm=I=-15:TP=-1.5:LRA=7",
        "-ac", "1", "-b:a", "64k", tmp])
    if r.returncode == 0 and os.path.getsize(tmp) > 300: os.replace(tmp, dst)

def piper_all():
    import wave, urllib.request
    from piper import PiperVoice
    v = os.environ.get("LB_PIPER", "nl_BE-nathalie-medium")
    lang, rest = v.split("-", 1); name, q = rest.rsplit("-", 1)
    base = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{lang.split('_')[0]}/{lang}/{name}/{q}/{v}"
    model = os.path.expanduser(f"~/.cache/{v}.onnx")
    for ext in (".onnx", ".onnx.json"):
        if not os.path.exists(model.replace(".onnx", ext)): urllib.request.urlretrieve(base + ext, model.replace(".onnx", ext))
    voice = PiperVoice.load(model)
    for t in phrases:
        dst = os.path.join(out, fname(t))
        if os.path.exists(dst): continue
        with wave.open("/tmp/lb.wav", "wb") as wf:
            voice.synthesize_wav(t, wf) if hasattr(voice, "synthesize_wav") else voice.synthesize(t, wf)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", "/tmp/lb.wav", "-ac", "1", "-b:a", "64k", dst], check=True)

try:
    asyncio.run(edge_all())
    print("stem: edge-tts", VOICE, flush=True)
except Exception as e:
    print("edge-tts lukte niet:", e, "→ Piper", flush=True)
    piper_all()

index = {}
for t in phrases:
    dst = os.path.join(out, fname(t))
    if os.path.exists(dst) and os.path.getsize(dst) > 300:
        trim(dst); index[t] = fname(t)
json.dump(index, open(os.path.join(out, "index.json"), "w"), ensure_ascii=False, indent=0)
print("klaar:", len(index), "van", len(phrases), "zinnen", flush=True)
if len(index) < 0.95 * len(phrases):
    sys.exit("Te weinig zinnen gemaakt: de app zou (deels) stil zijn")
