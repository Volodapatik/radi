from pathlib import Path
from PIL import Image

root = Path('/home/ubuntu/radio-folder-streamer/assets/images')
for name in ('icon.png', 'splash-icon.png', 'favicon.png', 'android-icon-foreground.png'):
    path = root / name
    image = Image.open(path).convert('RGB')
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    image.save(path, format='PNG', optimize=True, compress_level=9)
