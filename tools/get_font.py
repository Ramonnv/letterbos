# Haalt de lettertypes op bij Google Fonts, zodat ze ook offline in de app werken:
#  - "Baloo 2" voor knoppen en tekst
#  - "Andika", een leesletter voor beginnende lezers (a en g zoals kinderen ze leren schrijven)
import sys, os, re, urllib.request
out = sys.argv[1] if len(sys.argv) > 1 else "web/fonts"
os.makedirs(out, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
def get(family, fname):
    css = urllib.request.urlopen(urllib.request.Request("https://fonts.googleapis.com/css2?family=" + family + "&display=swap", headers=UA)).read().decode()
    blocks = re.findall(r"/\* latin \*/\s*@font-face\s*{[^}]*}", css)
    src = re.search(r"url\((https://[^)]+\.woff2)\)", blocks[0] if blocks else css).group(1)
    urllib.request.urlretrieve(src, os.path.join(out, fname))
    print(fname, os.path.getsize(os.path.join(out, fname)), "bytes")
get("Baloo+2:wght@400..800", "baloo.woff2")
get("Andika:wght@700", "andika.woff2")
get("Andika:wght@400", "andika-regular.woff2")
