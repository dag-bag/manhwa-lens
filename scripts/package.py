from pathlib import Path
import json
import hashlib
import zipfile

root = Path(__file__).resolve().parent.parent
source = root / 'dist' / 'manhwa-lens'
manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
version = manifest['version']
assert version == '1.1.0'
output = root / f'Manhwa-Lens-{version}.zip'
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(source.rglob('*')):
        if file.is_file():
            archive.write(file, (Path('manhwa-lens') / file.relative_to(source)).as_posix())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert json.loads(archive.read('manhwa-lens/manifest.json'))['version'] == version
    for name in ('offscreen.js', 'content.js', 'ocr-layout.mjs', 'README.md', 'TEST-RESULTS.md'):
        assert archive.read('manhwa-lens/' + name) == (source / name).read_bytes()
    print(f'Verified version {version}; {len(archive.namelist())} files; all archive CRCs passed')
print(f'{output.name}: {output.stat().st_size:,} bytes')
print('SHA256:', hashlib.sha256(output.read_bytes()).hexdigest())
