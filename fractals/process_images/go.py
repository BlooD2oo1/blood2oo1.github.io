import os
import shutil
import json
from pathlib import Path
from PIL import Image

SRC_ROOT = Path("src")
DST_ROOT = Path("../gallery")
INDEX_FILE = Path("index.html")  # a script mellett legyen

def convert_images(src_dir, dst_dir):
    images_dst = dst_dir / "images"
    images_dst.mkdir(parents=True, exist_ok=True)

    for file in src_dir.glob("*.png"):
        # Fő jpg konverzió
        img = Image.open(file).convert("RGB")
        jpg_path = images_dst / f"{file.stem}.jpg"
        img.save(jpg_path, "JPEG", quality=80)

        # Thumbnail (max 1280 px szélesség)
        tn_img = img.copy()
        w, h = tn_img.size
        if w > 1280:
            new_h = int(h * (1280 / w))
            tn_img = tn_img.resize((1280, new_h), Image.LANCZOS)

        tn_path = images_dst / f"{file.stem}_tn.jpg"
        tn_img.save(tn_path, "JPEG", quality=80)

def generate_json(dst_dir):
    images_dst = dst_dir / "images"
    jpg_files = [
        f"images/{f.name}"
        for f in sorted(images_dst.glob("*.jpg"))
        if not f.name.endswith("_tn.jpg")
    ]

    data = {
        "title": dst_dir.name,
        "description": "Kaleidoscopic IFS Fractals",
        "images": jpg_files
    }

    json_path = dst_dir / "album.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    return [images_dst / Path(f).name for f in data["images"]]

def add_border(img, border=5, color=(0, 0, 0)):
    """Ad egy fix méretű fekete keretet a kép köré."""
    w, h = img.size
    new_img = Image.new("RGB", (w + 2*border, h + 2*border), color)
    new_img.paste(img, (border, border))
    return new_img

def generate_gallery_thumbnail(dst_dir, jpg_files):
    if not jpg_files:
        return

    # Első kép közepének kivágása 512x512-re + border
    base_img = Image.open(jpg_files[0])
    w, h = base_img.size
    min_side = min(w, h)
    left = (w - min_side) // 2
    top = (h - min_side) // 2
    right = left + min_side
    bottom = top + min_side
    crop = base_img.crop((left, top, right, bottom)).resize((512, 512), Image.LANCZOS)
    #crop = add_border(crop, border=3)

    # Ha van több kép, max 3-at oldalt
    for i, extra in enumerate(jpg_files[1:4], start=0):
        extra_img = Image.open(extra)
        w, h = extra_img.size
        min_side = min(w, h)
        left = (w - min_side) // 2
        top = (h - min_side) // 2
        right = left + min_side
        bottom = top + min_side
        thumb = extra_img.crop((left, top, right, bottom)).resize((150, 150), Image.LANCZOS)
        thumb = add_border(thumb, border=4)

        # Pozíció (jobb oldal, sorban)
        x_offset = 512 - 150 - 20
        y_offset = i * (150+20) + 8
        crop.paste(thumb, (x_offset, y_offset))

    tn_path = dst_dir / "tn.jpg"
    crop.save(tn_path, "JPEG", quality=85)

def main():
    for src_sub in SRC_ROOT.iterdir():
        if src_sub.is_dir():
            dst_sub = DST_ROOT / src_sub.name
            if not dst_sub.exists():
                print(f"Létrehozás: {dst_sub}")
                dst_sub.mkdir(parents=True)

                # Konverzió és tn generálás
                convert_images(src_sub, dst_sub)

                # index.html másolása
                if INDEX_FILE.exists():
                    shutil.copy(INDEX_FILE, dst_sub / "index.html")

                # JSON generálás és tn.jpg létrehozása
                jpg_files = generate_json(dst_sub)
                generate_gallery_thumbnail(dst_sub, jpg_files)

if __name__ == "__main__":
    main()