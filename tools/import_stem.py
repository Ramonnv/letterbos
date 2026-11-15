# Zet een stem-pakket (uit Canva of een andere bron) om naar losse, nette mp3'tjes in stem/<naam>/.
#   python3 tools/import_stem.py pip-stem-alles.pack /tmp/lines.json stem/lotte
# Pakket: herhaald [5 cijfers regelnummer][10 cijfers lengte][mp3-bytes]
import sys, os, json, hashlib, subprocess
pack, lines_f, out = sys.argv[1], sys.argv[2], sys.argv[3]
lines = json.load(open(lines_f))
klank = set(json.load(open(sys.argv[4]))) if len(sys.argv) > 4 else set()
os.makedirs(out, exist_ok=True)
data = open(pack, 'rb').read(); p = 0; index = {}
while p < len(data):
    i = int(data[p:p+5]); n = int(data[p+5:p+15]); p += 15
    mp3 = data[p:p+n]; p += n
    text = lines[i]
    name = hashlib.sha1(text.encode()).hexdigest()[:12] + '.mp3'
    raw = '/tmp/_raw.mp3'; open(raw, 'wb').write(mp3)
    af = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
    if text in klank: af += "atempo=0.8,"
    af += "dynaudnorm=f=50:g=5:p=0.9:m=20,loudnorm=I=-15:TP=-1.5:LRA=7"
    dst = os.path.join(out, name)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', af, '-ac', '1', '-ar', '24000', '-b:a', '64k', dst], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout or 0)
    if dur < 0.3:   # heel kort woordje: niet te veel wegknippen
        af2 = af.replace('-50dB', '-65dB')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', af2, '-ac', '1', '-ar', '24000', '-b:a', '64k', dst], check=True)
    index[text] = name
json.dump(index, open(os.path.join(out, 'index.json'), 'w'), ensure_ascii=False, indent=0)
print(len(index), 'van', len(lines), 'zinnen geïmporteerd naar', out)
