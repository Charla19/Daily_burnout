from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

font_path = 'C:/Windows/Fonts/arialbd.ttf'
for size in (192, 512):
    image = Image.new('RGB', (size, size), '#e6403a')
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(font_path, int(size * .62))
    draw.text((size * .47, size * .45), 'd', anchor='mm', fill='white', font=font)
    draw.ellipse((size * .66, size * .67, size * .75, size * .76), fill='#171717')
    image.save(Path('public') / f'icon-{size}.png')
