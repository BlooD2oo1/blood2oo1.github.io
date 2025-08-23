import os
from pathlib import Path
from collections import defaultdict

# Root path to search
SRC_ROOT = Path("src")

def find_duplicate_filenames(root):
    """
    Recursively walk through 'root' and collect all filenames.
    Group files that share the same name, even if they are in different folders.
    """
    files_by_name = defaultdict(list)

    # Walk the directory tree
    for path in root.rglob("*"):
        if path.is_file():
            files_by_name[path.name].append(path)

    # Filter only duplicates
    duplicates = {name: paths for name, paths in files_by_name.items() if len(paths) > 1}
    return duplicates

def main():
    duplicates = find_duplicate_filenames(SRC_ROOT)

    if not duplicates:
        print("No duplicate filenames found.")
    else:
        print("Duplicate filenames found:\n")
        for name, paths in duplicates.items():
            print(f"File name: {name}")
            for p in paths:
                print(f"   -> {p}")
            print()

if __name__ == "__main__":
    main()