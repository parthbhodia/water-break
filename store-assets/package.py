"""Build the Chrome Web Store upload zip: dist/water-break-<version>.zip

Usage: python store-assets/package.py
Only runtime files are included (no store assets, docs, or build scripts).
"""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCLUDE = ['manifest.json', 'background.js', 'content.js', 'content.css',
           'popup.html', 'popup.js', 'popup.css', 'tour.js', 'i18n.js']
INCLUDE_DIRS = ['icons', '_locales']
SKIP_NAMES = {'icon.svg'}  # source art, not referenced by the manifest

version = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))['version']
out = ROOT / 'dist' / f'water-break-{version}.zip'
out.parent.mkdir(exist_ok=True)

files = [ROOT / f for f in INCLUDE]
for d in INCLUDE_DIRS:
    files += [p for p in sorted((ROOT / d).rglob('*')) if p.is_file() and p.name not in SKIP_NAMES]

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(f, f.relative_to(ROOT).as_posix())  # manifest.json must be at the zip root

print(out, f'{out.stat().st_size / 1024:.0f} KB,', len(files), 'files')
