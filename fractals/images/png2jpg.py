#pip install Pillow

import os
from PIL import Image

directory = "./"

for filename in os.listdir(directory):
    if filename.lower().endswith(".png"):

        png_path = os.path.join(directory, filename)
        image = Image.open(png_path)
        
        jpg_path = os.path.join(directory, f"{os.path.splitext(filename)[0]}.jpg")
        
        image.convert("RGB").save(jpg_path, "JPEG", quality=98)

        print(f"done: {png_path} -> {jpg_path}")