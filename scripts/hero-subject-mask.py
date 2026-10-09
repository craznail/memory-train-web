#!/usr/bin/env python3
"""Elephant (subject) mask for the home hero, used by visual-layout-check.mjs to measure the gap
between the hero text and the elephant (trunk/face).
Segments the warm-grey elephant (hue < 0.085, value < 0.92, sat > 0.25) in the @2x art, keeps the
connected component that contains the head, and writes the leftmost subject x per source row.
Usage: python3 scripts/hero-subject-mask.py  →  scripts/hero-subject-mask.json"""
import colorsys, json, os
from collections import deque
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, '..', 'src', 'assets', 'illustrations', 'hero-elephant-landscape@2x.webp')
im = Image.open(src).convert('RGB'); W, H = im.size; px = im.load()
on = [[False] * W for _ in range(H)]
for y in range(H):
    for x in range(W):
        h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in px[x, y]))
        on[y][x] = v < 0.92 and h < 0.085 and s > 0.25
seed = (530, 150)  # elephant head
seen = [[False] * W for _ in range(H)]; q = deque([seed]); seen[seed[1]][seed[0]] = True
while q:
    x, y = q.popleft()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and on[ny][nx] and not seen[ny][nx]:
            seen[ny][nx] = True; q.append((nx, ny))
left = [next((x for x in range(W) if seen[y][x]), None) for y in range(H)]
json.dump({'src': 'hero-elephant-landscape@2x.webp', 'width': W, 'height': H, 'leftmostX': left}, open(os.path.join(HERE, 'hero-subject-mask.json'), 'w'))
print('rows with subject', sum(v is not None for v in left), 'min x', min(v for v in left if v is not None))
