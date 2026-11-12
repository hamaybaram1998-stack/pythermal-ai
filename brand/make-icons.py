#!/usr/bin/env python3
"""Generate branded PWA and Android icons from brand/pythermal-logo.png.
If the uploaded image is not present, generate a temporary fallback icon.
"""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'brand'/'pythermal-logo.png'
if source.exists():
    im=Image.open(source).convert('RGBA')
else:
    im=Image.new('RGBA',(512,512),'#101a2c')
    d=ImageDraw.Draw(im)
    d.ellipse((55,55,457,457),fill='#207bb9',outline='#7e78df',width=24)
    d.ellipse((145,145,367,367),fill='#13172c',outline='#61dcff',width=18)
    print('WARNING: Brand image not yet uploaded; using temporary fallback.')
side=min(im.size)
left=(im.width-side)//2;top=(im.height-side)//2
im=im.crop((left,top,left+side,top+side))
for size in (192,512):
    im.resize((size,size),Image.Resampling.LANCZOS).save(ROOT/f'icon-{size}.png')
android=ROOT/'android/app/src/main/res'
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    folder=android/f'mipmap-{density}'
    folder.mkdir(parents=True,exist_ok=True)
    im.resize((size,size),Image.Resampling.LANCZOS).save(folder/'ic_launcher.png')
print('Generated PWA and Android launcher icons')
