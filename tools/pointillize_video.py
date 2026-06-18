import os
from PIL import Image, ImageDraw

def pointillize(path, out, target_size=(360, 480), dot_size=8, corner_radius=2):
    img = Image.open(path).convert("RGB")

    target_w, target_h = target_size
    target_ratio = target_w / target_h
    src_w, src_h = img.size
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        offset = (src_w - new_w) // 2
        img = img.crop((offset, 0, offset + new_w, src_h))
    else:
        new_h = int(src_w / target_ratio)
        offset = (src_h - new_h) // 2
        img = img.crop((0, offset, src_w, offset + new_h))

    img = img.resize(target_size)
    w, h = img.size
    result = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(result)

    for y in range(0, h, dot_size):
        for x in range(0, w, dot_size):
            box = (x, y, min(x+dot_size, w), min(y+dot_size, h))
            region = img.crop(box)
            avg_color = tuple(int(c) for c in region.resize((1,1)).getpixel((0,0)))
            x0, y0 = x, y
            x1, y1 = min(x+dot_size, w) - 1, min(y+dot_size, h) - 1
            draw.rounded_rectangle([x0, y0, x1, y1], radius=corner_radius, fill=avg_color)

    result.save(out)

os.makedirs("blink_frames", exist_ok=True)
files = sorted([f for f in os.listdir("frames") if f.endswith(('.jpg','.png'))])
for i, fname in enumerate(files):
    pointillize(f"frames/{fname}", f"blink_frames/blink_{i:03d}.png")
    print(f"{i+1}/{len(files)} 완료")