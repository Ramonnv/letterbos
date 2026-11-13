# Maakt de app-icoontjes (web en Android) van de Blender-render van Pip.
import sys, os
from PIL import Image, ImageDraw
src = sys.argv[1] if len(sys.argv) > 1 else "web/assets/renders/pip.png"
pip = Image.open(src).convert("RGBA")
bb = pip.getbbox(); pip = pip.crop(bb)
def icon(n):
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, n - 1, n - 1], radius=n // 5, fill=(169, 155, 255, 255))
    d.ellipse([n * .12, n * .55, n * .88, n * 1.1], fill=(255, 159, 208, 255))
    s = int(n * .86); w, h = pip.size; k = s / max(w, h)
    p = pip.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)
    im.alpha_composite(p, ((n - p.width) // 2, n - p.height - int(n * .04)))
    return im
icon(192).save("web/icon-192.png"); icon(512).save("web/icon-512.png")
for name, n in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    os.makedirs(f"Resources/mipmap-{name}", exist_ok=True); icon(n).save(f"Resources/mipmap-{name}/appicon.png")
print("icoontjes klaar")
