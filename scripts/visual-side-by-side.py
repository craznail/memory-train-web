#!/usr/bin/env python3
"""Side-by-side comparison at the same CSS scale (2x of a 375-wide viewport).
Usage: python3 scripts/visual-side-by-side.py <left.png> <right.png> <out.png> [left label] [right label]
Left (reference) and right (ours) are both resized to 750 px wide = 375 CSS px @2x."""
import sys
from PIL import Image, ImageDraw, ImageFont

left, right, out = sys.argv[1:4]
llab = sys.argv[4] if len(sys.argv) > 4 else "Reference"
rlab = sys.argv[5] if len(sys.argv) > 5 else "Ours"
W, GAP, HEAD = 750, 40, 80

def load(p):
    im = Image.open(p).convert("RGB")
    return im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)

a, b = load(left), load(right)
H = max(a.height, b.height)
canvas = Image.new("RGB", (W * 2 + GAP * 3, H + HEAD + GAP), "#EDE4DA")
font = None
for f in ["/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"]:
    try:
        font = ImageFont.truetype(f, 30); break
    except OSError:
        pass
d = ImageDraw.Draw(canvas)
for i, (im, lab) in enumerate([(a, llab), (b, rlab)]):
    x = GAP + i * (W + GAP)
    d.text((x, 22), lab, fill="#2B1A12", font=font)
    canvas.paste(im, (x, HEAD))
canvas.save(out, optimize=True)
print(out, canvas.size)
