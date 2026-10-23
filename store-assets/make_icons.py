"""Regenerate icons/icon-{16,48,128}.png (blue squircle with a white drop).

Usage: python store-assets/make_icons.py   (needs Chrome and Pillow)
"""
import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

PROJECT = Path(__file__).resolve().parent.parent
CHROME = next(p for p in [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
] if os.path.exists(p))

SVG = '''<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 128 128">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#64d2ff"/><stop offset="1" stop-color="#007aff"/></linearGradient></defs>
  <rect x="6" y="6" width="116" height="116" rx="27" fill="url(#g)"/>
  <g transform="translate(20.8 24.4) scale(3.6)">
    <path d="M12 2.5c-3.4 4.4-6 7.5-6 11a6 6 0 0 0 12 0c0-3.5-2.6-6.6-6-11z" fill="#fff"/>
    <path d="M9 14.2a3 3 0 0 0 2.4 2.9" fill="none" stroke="#0a84ff" stroke-opacity=".5" stroke-width="1.5" stroke-linecap="round"/>
  </g>
</svg>'''

with tempfile.TemporaryDirectory() as tmp:
    page = Path(tmp) / 'icon.html'
    page.write_text(SVG, encoding='utf-8')
    big = Path(tmp) / 'big.png'
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                    '--default-background-color=00000000', '--force-device-scale-factor=1',
                    '--window-size=512,512', f'--screenshot={big}', page.as_uri()],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    src = Image.open(big).convert('RGBA')
    for size in (16, 48, 128):
        out = PROJECT / 'icons' / f'icon-{size}.png'
        src.resize((size, size), Image.LANCZOS).save(out)
        print(out, size)

    # Store listing icon: 96px artwork centred in 128px with 16px transparent padding
    # (Chrome Web Store icon guidelines). The in-extension icons above stay full-bleed.
    pad = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    art = src.resize((384, 384), Image.LANCZOS)
    pad.paste(art, (64, 64), art)
    store = PROJECT / 'store-assets' / 'out' / 'store-icon-128x128.png'
    store.parent.mkdir(exist_ok=True)
    pad.resize((128, 128), Image.LANCZOS).save(store)
    print(store, 128)
