from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(OUT, exist_ok=True)

BG = (20, 20, 20, 255)      # #141414
FG = (255, 255, 255, 255)   # white


def draw_lines(draw, size, margin_ratio):
    margin = int(size * margin_ratio)
    line_h = max(2, int(size * 0.07))
    gap = int(size * 0.10)
    widths = [0.62, 0.62, 0.40]
    y = margin + int(size * 0.06)
    for w in widths:
        x0 = margin
        x1 = margin + int((size - margin * 2) * w)
        draw.rounded_rectangle([x0, y, x1, y + line_h], radius=line_h // 2, fill=FG)
        y += line_h + gap


def make_icon(size, maskable=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = int(size * (0.5 if maskable else 0.22))
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)
    margin_ratio = 0.30 if maskable else 0.22
    draw_lines(draw, size, margin_ratio)
    return img


for size in (192, 512):
    make_icon(size, maskable=False).save(os.path.join(OUT, f'icon-{size}.png'))
    make_icon(size, maskable=True).save(os.path.join(OUT, f'icon-maskable-{size}.png'))

print('icons generated')
