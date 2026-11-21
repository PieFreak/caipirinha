"""Draws the app's icons into public/icons/. Needs Pillow: run it with any Python that has it.

The icon is a caipirinha: a tumbler of pale lime drink with ice, a straw and a lime wheel
on the rim, on the app's deep teal.
    python tools/make_icons.py
"""
import math
import os
from PIL import Image, ImageDraw

GREEN = (15, 76, 76)   # the app's deep teal
GLASS = (238, 248, 240)
DRINK = (201, 230, 132)
ICE = (247, 252, 244)
STRAW = (255, 194, 71)
RIND = (50, 166, 106)
FLESH = (226, 244, 170)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")


def icon(size, share, rounded):
    """share: how much of the icon the drawing takes; a maskable icon keeps it well inside."""
    scale = 4  # drawn large and scaled down, for smooth edges
    big = size * scale
    image = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if rounded:
        draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.22), fill=GREEN)
    else:
        draw.rectangle([0, 0, big, big], fill=GREEN)

    # The drawing is laid out on a unit square and placed in the middle at the given share.
    def at(x, y):
        return (big * (0.5 + (x - 0.5) * share), big * (0.5 + (y - 0.5) * share))

    def length(v):
        return big * share * v

    def polygon(points, fill):
        draw.polygon([at(x, y) for x, y in points], fill=fill)

    # The glass: wider at the rim than at the foot.
    polygon([(0.20, 0.24), (0.76, 0.24), (0.69, 0.92), (0.27, 0.92)], GLASS)
    # The drink inside it, a little below the rim and inside the walls.
    polygon([(0.255, 0.40), (0.705, 0.40), (0.655, 0.875), (0.305, 0.875)], DRINK)

    # Two ice cubes, tilted.
    def cube(cx, cy, half, turn):
        corners = []
        for k in range(4):
            angle = turn + math.pi / 4 + k * math.pi / 2
            corners.append((cx + half * math.cos(angle), cy + half * math.sin(angle)))
        polygon(corners, ICE)

    cube(0.40, 0.56, 0.085, 0.35)
    cube(0.55, 0.72, 0.080, -0.30)

    # The straw, leaning out of the glass to the left.
    draw.line([at(0.50, 0.84), at(0.33, 0.06)], fill=STRAW, width=max(1, int(length(0.05))))

    # A lime wheel on the rim: rind, flesh, and the lines between its segments.
    cx, cy, radius = 0.74, 0.25, 0.185
    x0, y0 = at(cx - radius, cy - radius)
    x1, y1 = at(cx + radius, cy + radius)
    draw.ellipse([x0, y0, x1, y1], fill=RIND)
    inner = radius * 0.78
    x0, y0 = at(cx - inner, cy - inner)
    x1, y1 = at(cx + inner, cy + inner)
    draw.ellipse([x0, y0, x1, y1], fill=FLESH)
    for k in range(4):
        angle = k * math.pi / 4 + 0.2
        dx, dy = inner * math.cos(angle), inner * math.sin(angle)
        draw.line([at(cx - dx, cy - dy), at(cx + dx, cy + dy)], fill=RIND, width=max(1, int(length(0.016))))
    dot = radius * 0.13
    x0, y0 = at(cx - dot, cy - dot)
    x1, y1 = at(cx + dot, cy + dot)
    draw.ellipse([x0, y0, x1, y1], fill=RIND)

    return image.resize((size, size), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)
# An iPhone rounds the corners itself and shows no transparency: a full square.
icon(180, 0.74, rounded=False).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"))
icon(192, 0.74, rounded=True).save(os.path.join(OUT, "icon-192.png"))
icon(512, 0.74, rounded=True).save(os.path.join(OUT, "icon-512.png"))
icon(512, 0.56, rounded=False).convert("RGB").save(os.path.join(OUT, "icon-maskable-512.png"))
print("icons written to", OUT)
