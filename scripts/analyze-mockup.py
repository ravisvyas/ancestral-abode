#!/usr/bin/env python3
"""Analyse a long design mockup: segment it into horizontal bands and report
the dominant palette of each band plus overall colour statistics."""
import sys
from collections import Counter
from PIL import Image

path = sys.argv[1]
im = Image.open(path).convert("RGB")
W, H = im.size
print(f"size: {W}x{H}")

small = im.resize((160, round(H * 160 / W)), Image.LANCZOS)
sw, sh = small.size
px = small.load()

rows = []
for y in range(sh):
    r = g = b = 0
    for x in range(sw):
        pr, pg, pb = px[x, y]
        r += pr; g += pg; b += pb
    rows.append((r // sw, g // sw, b // sw))

# Palette via quantisation of the full image
q = im.resize((220, round(H * 220 / W))).quantize(colors=14, method=Image.MEDIANCUT)
palette = q.getpalette()
counts = Counter(q.getdata())
print("\n--- DOMINANT PALETTE (14 clusters) ---")
for idx, n in counts.most_common(14):
    hexc = "%02x%02x%02x" % tuple(palette[idx * 3: idx * 3 + 3])
    print(f"  #{hexc}  {100*n/counts.total():5.1f}%")

# Band segmentation on smoothed row colour
band_h = max(3, sh // 120)
bands = []
start = 0
for y in range(band_h, sh, band_h):
    a = rows[y - band_h]; b = rows[y]
    d = abs(a[0]-b[0]) + abs(a[1]-b[1]) + abs(a[2]-b[2])
    if d > 90:
        bands.append((start, y))
        start = y
bands.append((start, sh))

def dom(y0, y1):
    c = Counter()
    for y in range(y0, y1):
        for x in range(0, sw, 2):
            c[px[x, y]] += 1
    if not c:
        return None, 0
    (col, n), = c.most_common(1)
    return col, 100 * n / sum(c.values())

print("\n--- SECTION BANDS ---")
for y0, y1 in bands:
    col, purity = dom(y0, y1)
    hexc = "%02x%02x%02x" % col
    print(f"  y {y0*W//sw:5d}-{y1*W//sw:5d}px  {100*y0/sh:5.1f}%-{100*y1/sh:5.1f}%  dominant #{hexc} ({purity:.0f}% pure)")

# Brightness profile to locate imagery vs flat blocks
print("\n--- ROW DETAIL (every ~5% of height) ---")
for y in range(0, sh, max(1, sh // 20)):
    r, g, b = rows[y]
    lum = 0.299*r + 0.587*g + 0.114*b
    print(f"  {100*y/sh:5.1f}%  rgb({r:3d},{g:3d},{b:3d})  lum {lum:5.1f}")
