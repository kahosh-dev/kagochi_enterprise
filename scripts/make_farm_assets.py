import os
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont
import numpy as np

os.makedirs('frontend/public/images/farm', exist_ok=True)
dest_dir = 'frontend/public/images/farm'
SIZE = 512

def create_studio_canvas(shadow_radius=200):
    # Pure clean studio backdrop with subtle radial warm light
    img = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Ground soft contact shadow
    shadow_img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_img)
    cx, cy = SIZE // 2, int(SIZE * 0.84)
    s_draw.ellipse([cx - shadow_radius, cy - 28, cx + shadow_radius, cy + 28], fill=(30, 45, 35, 60))
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(16))
    
    img = Image.alpha_composite(img, shadow_img)
    return img

# 1. ANIMAL FEED WEBP
def make_animal_feed():
    img = create_studio_canvas(shadow_radius=170)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Draw burlap sack with rich realistic texture and shading
    sack_base = (202, 168, 128)
    sack_dark = (165, 132, 92)
    sack_light = (228, 198, 158)
    
    # Main sack body
    pts = [
        (150, 200), (130, 310), (145, 420), (367, 420), (382, 310), (362, 200),
        (335, 185), (256, 198), (177, 185)
    ]
    draw.polygon(pts, fill=sack_base)
    
    # Shading and side volume
    draw.polygon([(130, 310), (145, 420), (220, 420), (195, 310)], fill=sack_dark)
    draw.polygon([(315, 310), (290, 420), (367, 420), (382, 310)], fill=sack_dark)
    draw.ellipse([180, 230, 332, 390], fill=sack_light)
    
    # Burlap weave texture simulation
    random.seed(101)
    for y in range(190, 420, 6):
        col = (sack_dark[0] + random.randint(-15, 15), sack_dark[1] + random.randint(-15, 15), sack_dark[2] + random.randint(-15, 15), 90)
        draw.line([(140, y), (370, y)], fill=col, width=1)
    for x in range(140, 370, 6):
        col = (sack_dark[0] + random.randint(-15, 15), sack_dark[1] + random.randint(-15, 15), sack_dark[2] + random.randint(-15, 15), 70)
        draw.line([(x, 195), (x, 420)], fill=col, width=1)

    # Thick tied sack hem and twine rope
    draw.line([(160, 202), (352, 202)], fill=(110, 80, 50), width=9)
    draw.ellipse([235, 195, 277, 210], fill=(140, 100, 60))
    # Hanging rope tassels
    draw.line([(246, 205), (238, 240)], fill=(120, 85, 55), width=4)
    draw.line([(254, 205), (258, 245)], fill=(120, 85, 55), width=4)
    
    # Open brim with golden grains and feed pellets
    draw.ellipse([175, 160, 337, 200], fill=(230, 190, 100))
    for _ in range(300):
        gx = random.randint(180, 332)
        gy = random.randint(162, 198)
        if ((gx - 256) / 75)**2 + ((gy - 180) / 18)**2 <= 1:
            pellet_c = random.choice([
                (218, 165, 32), (184, 134, 11), (245, 205, 110), (160, 110, 40), (139, 90, 43)
            ])
            draw.ellipse([gx - 3, gy - 2, gx + 3, gy + 2], fill=pellet_c)
            
    # Spilled pellets on the clean floor
    for _ in range(180):
        gx = random.randint(110, 400)
        gy = random.randint(400, 440)
        if ((gx - 256) / 140)**2 + ((gy - 420) / 18)**2 <= 1:
            pellet_c = random.choice([(218, 165, 32), (184, 134, 11), (190, 140, 50), (230, 180, 80)])
            draw.ellipse([gx - 4, gy - 2, gx + 4, gy + 2], fill=pellet_c)
            
    # Elegant Farm Brand Label on the sack
    draw.rounded_rectangle([192, 255, 320, 345], radius=10, fill=(250, 248, 240, 245), outline=(140, 105, 70), width=2)
    # Stitched border on label
    draw.rounded_rectangle([196, 259, 316, 341], radius=8, fill=None, outline=(180, 145, 110), width=1)
    
    # Golden wheat stalks icon on label
    draw.line([(256, 330), (256, 268)], fill=(47, 125, 58), width=3)
    for i in range(5):
        y = 272 + i * 10
        draw.line([(256, y), (242, y - 6)], fill=(47, 125, 58), width=3)
        draw.line([(256, y), (270, y - 6)], fill=(47, 125, 58), width=3)
        draw.ellipse([238, y - 9, 246, y - 3], fill=(218, 165, 32))
        draw.ellipse([266, y - 9, 274, y - 3], fill=(218, 165, 32))

    dest = os.path.join(dest_dir, 'animal-feed.webp')
    img.convert('RGB').save(dest, 'WEBP', quality=92, method=6)
    print(f'Saved {dest}')

# 2. VACCINATION WEBP
def make_vaccination():
    img = create_studio_canvas(shadow_radius=160)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # 3D Veterinary Syringe & Medicine Glass Vial
    # Draw Glass Vial on Left
    vx, vy = 160, 210
    vw, vh = 95, 175
    
    # Vial Liquid (Teal/Aquamarine vaccine)
    draw.rounded_rectangle([vx, vy + 45, vx + vw, vy + vh], radius=12, fill=(18, 140, 126, 210))
    # Liquid surface meniscus
    draw.ellipse([vx, vy + 38, vx + vw, vy + 52], fill=(45, 185, 165, 230))
    # Glass bottle neck & crimp cap
    draw.rounded_rectangle([vx + 22, vy + 12, vx + vw - 22, vy + 45], radius=4, fill=(210, 220, 225, 200))
    draw.rounded_rectangle([vx + 16, vy - 2, vx + vw - 16, vy + 16], radius=5, fill=(160, 175, 185), outline=(120, 135, 145), width=2)
    # Glass reflections & highlights
    draw.line([(vx + 10, vy + 50), (vx + 10, vy + vh - 10)], fill=(255, 255, 255, 180), width=4)
    draw.line([(vx + vw - 10, vy + 50), (vx + vw - 10, vy + vh - 10)], fill=(255, 255, 255, 90), width=2)
    
    # Vial White Label with Medical Cross
    lx, ly, lw, lh = vx + 8, vy + 65, vw - 16, 75
    draw.rounded_rectangle([lx, ly, lx + lw, ly + lh], radius=6, fill=(255, 255, 255, 240), outline=(200, 215, 220), width=1)
    # Green cross
    cx, cy = lx + lw // 2, ly + lh // 2
    draw.rectangle([cx - 5, cy - 16, cx + 5, cy + 16], fill=(47, 125, 58))
    draw.rectangle([cx - 16, cy - 5, cx + 16, cy + 5], fill=(47, 125, 58))
    
    # Draw Veterinary Syringe (angled across, piercing downward or beside)
    # Barrel: from (350, 150) down-left to (275, 330)
    # Syringe body
    draw.polygon([(300, 170), (360, 195), (295, 340), (235, 315)], fill=(230, 242, 248, 190), outline=(130, 170, 195), width=2)
    # Plunger shaft and thumb ring
    draw.line([(330, 182), (395, 105)], fill=(120, 145, 160), width=8)
    draw.ellipse([385, 90, 425, 130], fill=None, outline=(120, 145, 160), width=5)
    # Liquid in syringe
    draw.polygon([(282, 230), (328, 250), (280, 330), (236, 315)], fill=(18, 140, 126, 200))
    # Measurement tick marks on syringe
    for i in range(6):
        t1x, t1y = 280 + i * 8, 210 + i * 16
        draw.line([(t1x, t1y), (t1x + 12, t1y + 5)], fill=(80, 110, 130), width=2)
    # Stainless Steel Needle hub and bevel needle
    draw.polygon([(235, 315), (295, 340), (275, 360), (245, 348)], fill=(170, 185, 195))
    draw.line([(260, 354), (205, 410)], fill=(195, 205, 215), width=4)
    # Needle sharp tip sparkle
    draw.ellipse([200, 405, 210, 415], fill=(255, 255, 255))
    
    # Shield badge in background (health & protection)
    badge = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(badge)
    b_draw.ellipse([256 - 150, 256 - 150, 256 + 150, 256 + 150], fill=(47, 125, 58, 20))
    img = Image.alpha_composite(badge, img)

    dest = os.path.join(dest_dir, 'vaccination.webp')
    img.convert('RGB').save(dest, 'WEBP', quality=92, method=6)
    print(f'Saved {dest}')

# 3. FARM INCOME WEBP
def make_farm_income():
    img = create_studio_canvas(shadow_radius=180)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Soft emerald aura
    aura = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(aura)
    a_draw.ellipse([256 - 160, 256 - 160, 256 + 160, 256 + 160], fill=(47, 125, 58, 25))
    img = Image.alpha_composite(aura, img)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Stacked golden coins with embossed wheat/KES emblems
    def draw_coin(cx, cy, radius_x=55, radius_y=24, thickness=16, label='KES'):
        # 3D coin edge
        for t in range(thickness, 0, -1):
            draw.ellipse([cx - radius_x, cy - radius_y + t, cx + radius_x, cy + radius_y + t], fill=(190, 135, 20))
        # Top face
        draw.ellipse([cx - radius_x, cy - radius_y, cx + radius_x, cy + radius_y], fill=(245, 195, 45), outline=(215, 155, 25), width=2)
        # Inner rim
        draw.ellipse([cx - radius_x + 7, cy - radius_y + 4, cx + radius_x - 7, cy + radius_y - 4], fill=(255, 215, 75), outline=(230, 175, 35), width=1)
        # Wheat stalk symbol on coin
        draw.line([(cx, cy + 8), (cx, cy - 8)], fill=(180, 125, 15), width=2)
        draw.line([(cx, cy - 2), (cx - 8, cy - 6)], fill=(180, 125, 15), width=2)
        draw.line([(cx, cy - 2), (cx + 8, cy - 6)], fill=(180, 125, 15), width=2)

    # Stack 1: Left
    for y in range(350, 290, -18):
        draw_coin(170, y, 48, 20, 14)
    # Stack 2: Right
    for y in range(365, 310, -18):
        draw_coin(335, y, 46, 19, 13)
    # Stack 3: Center (Tallest)
    for y in range(340, 230, -18):
        draw_coin(256, y, 56, 24, 15)

    # Ascending vibrant green profit trendline with glowing nodes
    pts = [(120, 270), (195, 240), (280, 175), (380, 115)]
    # Shadow of the line
    draw.line([(x, y + 6) for x, y in pts], fill=(20, 80, 35, 70), width=7)
    # Main glowing line
    draw.line(pts, fill=(47, 125, 58), width=6)
    # Upward arrowhead
    draw.polygon([(380, 115), (355, 115), (370, 135)], fill=(47, 125, 58))
    
    # Glowing data dots along the path
    for (x, y) in pts:
        draw.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(255, 255, 255), outline=(47, 125, 58), width=3)
        draw.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(47, 125, 58))

    dest = os.path.join(dest_dir, 'farm-income.webp')
    img.convert('RGB').save(dest, 'WEBP', quality=92, method=6)
    print(f'Saved {dest}')

# 4. FARM EXPENSES WEBP
def make_farm_expenses():
    img = create_studio_canvas(shadow_radius=180)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Soft warm terracotta/ruby aura
    aura = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(aura)
    a_draw.ellipse([256 - 160, 256 - 160, 256 + 160, 256 + 160], fill=(200, 60, 45, 20))
    img = Image.alpha_composite(aura, img)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Farm Accounting Ledger Book & Expense Receipt
    # Ledger book background (angled)
    draw.rounded_rectangle([130, 175, 330, 410], radius=12, fill=(245, 245, 240), outline=(190, 195, 190), width=2)
    # Spine (crimson / leather)
    draw.rounded_rectangle([130, 175, 155, 410], radius=8, fill=(185, 45, 40))
    
    # Ledger lines
    for ly in range(215, 390, 22):
        draw.line([(170, ly), (315, ly)], fill=(215, 225, 225), width=2)
    draw.line([(275, 200), (275, 395)], fill=(235, 185, 180), width=2)
    
    # Calculator / Cost terminal on foreground right
    cx, cy, cw, ch = 250, 230, 140, 175
    # 3D shadow and body
    draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=14, fill=(45, 55, 62), outline=(30, 40, 45), width=2)
    # Screen (LCD display showing cost)
    draw.rounded_rectangle([cx + 14, cy + 15, cx + cw - 14, cy + 55], radius=6, fill=(180, 205, 185))
    # Simulated digits on screen
    draw.line([(cx + 30, cy + 35), (cx + cw - 25, cy + 35)], fill=(30, 45, 35), width=4)
    
    # Calculator buttons (grid of 3x3)
    for row in range(3):
        for col in range(3):
            bx = cx + 20 + col * 36
            by = cy + 70 + row * 28
            bcolor = (205, 65, 55) if (row == 2 and col == 2) else (85, 95, 105)
            draw.rounded_rectangle([bx, by, bx + 28, by + 20], radius=4, fill=bcolor)

    # Expense Tag / Receipt with red outgoing arrow
    draw.polygon([(180, 140), (260, 140), (280, 170), (260, 200), (180, 200)], fill=(225, 45, 45))
    draw.ellipse([195, 165, 205, 175], fill=(255, 255, 255))
    draw.line([(220, 170), (255, 170)], fill=(255, 255, 255), width=3)
    draw.line([(245, 160), (255, 170)], fill=(255, 255, 255), width=3)
    draw.line([(245, 180), (255, 170)], fill=(255, 255, 255), width=3)

    dest = os.path.join(dest_dir, 'farm-expenses.webp')
    img.convert('RGB').save(dest, 'WEBP', quality=92, method=6)
    print(f'Saved {dest}')

# 5. OPERATING LOSS WEBP
def make_operating_loss():
    img = create_studio_canvas(shadow_radius=180)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Soft ruby/amber warning aura
    aura = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(aura)
    a_draw.ellipse([256 - 160, 256 - 160, 256 + 160, 256 + 160], fill=(220, 50, 40, 22))
    img = Image.alpha_composite(aura, img)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Financial chart card background
    draw.rounded_rectangle([110, 140, 402, 390], radius=16, fill=(255, 255, 255, 245), outline=(230, 215, 215), width=2)
    # Subtle chart gridlines
    for gy in range(180, 370, 45):
        draw.line([(135, gy), (377, gy)], fill=(240, 240, 240), width=1)
        
    # Declining red deficit / loss trendline
    pts = [(140, 190), (210, 220), (285, 260), (370, 345)]
    # Drop shadow of trendline
    draw.line([(x, y + 6) for x, y in pts], fill=(180, 30, 30, 60), width=7)
    # Downward red line
    draw.line(pts, fill=(215, 45, 40), width=6)
    # Downward arrow head
    draw.polygon([(370, 345), (370, 320), (345, 340)], fill=(215, 45, 40))
    
    # Red data points along the downward slope
    for (x, y) in pts:
        draw.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(255, 255, 255), outline=(215, 45, 40), width=3)
        draw.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(215, 45, 40))
        
    # Deficit / Alert Badge
    draw.rounded_rectangle([200, 290, 312, 335], radius=10, fill=(253, 237, 237), outline=(239, 145, 145), width=2)
    # Minus icon & alert
    draw.line([(222, 312), (242, 312)], fill=(215, 45, 40), width=4)
    draw.line([(255, 305), (295, 305)], fill=(180, 40, 40), width=3)
    draw.line([(255, 318), (285, 318)], fill=(180, 40, 40), width=2)

    dest = os.path.join(dest_dir, 'operating-loss.webp')
    img.convert('RGB').save(dest, 'WEBP', quality=92, method=6)
    print(f'Saved {dest}')

if __name__ == '__main__':
    make_animal_feed()
    make_vaccination()
    make_farm_income()
    make_farm_expenses()
    make_operating_loss()
    print('All farm assets generated successfully!')
