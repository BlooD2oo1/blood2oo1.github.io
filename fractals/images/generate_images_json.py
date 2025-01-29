import os
import json

image_folder = "./"
image_files = [f for f in os.listdir(image_folder) if f.endswith((".jpg", ".png", ".jpeg", ".webp"))]

with open("images.json", "w") as f:
    json.dump(image_files, f, indent=4)

print("done")