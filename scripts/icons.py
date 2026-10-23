from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1] / 'extension' / 'icons'
root.mkdir(parents=True, exist_ok=True)
for size in (16, 32, 48, 128):
    scale = 4
    image = Image.new('RGBA', (size*scale, size*scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, size*scale-1, size*scale-1), radius=size*.23*scale, fill='#7950bc')
    font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', int(size*.48*scale))
    draw.text((size*scale/2, size*scale*.47), 'ML', font=font, anchor='mm', fill='white', stroke_width=0)
    image.resize((size,size), Image.Resampling.LANCZOS).save(root / f'{size}.png')
print('Created extension icons')
