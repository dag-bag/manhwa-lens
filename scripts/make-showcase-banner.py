from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

root = Path(__file__).resolve().parent.parent
assets_dir = root / 'assets'
test_out = root / 'test-output'
assets_dir.mkdir(exist_ok=True)

img1 = Image.open(test_out / 'user-panel-fixed.png') # White oval bubble
img2 = Image.open(test_out / 'chat-bubbles-result.png') # Chat/square boxes
img3 = Image.open(test_out / 'dark-panel-result.png') # Dark narration panel
popup_img = Image.open(test_out / 'popup.png')

# Extract clean comic panel slices
crop1 = img1.crop((24, 20, 680, 480)).resize((560, 310), Image.Resampling.LANCZOS)
crop2 = img2.crop((24, 20, 680, 480)).resize((560, 310), Image.Resampling.LANCZOS)
crop3 = img3.crop((24, 20, 680, 480)).resize((560, 310), Image.Resampling.LANCZOS)

# Create a clean presentation card for popup UI
popup_card = Image.new('RGB', (560, 310), color='#130f1c')
p_w = 320
p_h = int(popup_img.height * (p_w / popup_img.width))
p_resized = popup_img.resize((p_w, p_h), Image.Resampling.LANCZOS)
# Center popup in the 560x310 card
offset_x = (560 - p_w) // 2
offset_y = max(4, (310 - p_h) // 2)
popup_card.paste(p_resized, (offset_x, offset_y))

banner_w = 1200
banner_h = 790
banner = Image.new('RGB', (banner_w, banner_h), color='#0d0a14')
draw = ImageDraw.Draw(banner)

# Gradient background
for y in range(banner_h):
    r = int(14 + (24 - 14) * (y / banner_h))
    g = int(11 + (15 - 11) * (y / banner_h))
    b = int(22 + (34 - 22) * (y / banner_h))
    draw.line([(0, y), (banner_w, y)], fill=(r, g, b))

# Header branding
draw.text((36, 22), "MANHWA LENS · ALL-STYLE UNIVERSAL TRANSLATION", fill="#caa2f9")
draw.text((36, 44), "Real-time, 100% local OCR across every comic bubble type & color scheme", fill="#ffffff")

def paste_card(base, img, x, y, title, badge):
    card = Image.new('RGBA', (img.width + 12, img.height + 42), (24, 18, 35, 255))
    c_draw = ImageDraw.Draw(card)
    # Header bar on card
    c_draw.rectangle([0, 0, card.width, 36], fill=(34, 26, 50))
    c_draw.text((14, 10), title, fill="#f2ecfa")
    # Badge
    c_draw.rectangle([card.width - 92, 7, card.width - 12, 29], fill=badge)
    c_draw.text((card.width - 82, 10), "VERIFIED", fill="#ffffff")
    card.paste(img, (6, 38))
    base.paste(card.convert('RGB'), (x, y))

paste_card(banner, crop1, 24, 82, "1. Classic Speech Bubbles (White Oval)", (147, 51, 234))
paste_card(banner, crop2, 604, 82, "2. Modern Chat / SMS Boxes (Square & Tilted)", (37, 99, 235))
paste_card(banner, crop3, 24, 442, "3. Cinematic Narration Panels (White on Black)", (16, 185, 129))
paste_card(banner, popup_card, 604, 442, "4. Lightweight Toolbar & Language Selection", (217, 119, 6))

out_path = assets_dir / 'showcase-banner.png'
banner.save(out_path, format='PNG', optimize=True)
print(f"Generated clean showcase banner {out_path} ({banner_w}x{banner_h}, {out_path.stat().st_size:,} bytes)")
