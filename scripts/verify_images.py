import os
import re

public_dir = 'frontend/public'
src_dir = 'frontend/src'

img_pattern = re.compile(r'["\'`](/images/[^"\'`]+)["\'`]')
missing = []
found = []

for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.tsx', '.ts', '.css', '.html')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fh:
                text = fh.read()
            matches = img_pattern.findall(text)
            for m in matches:
                disk_path = os.path.join(public_dir, m.lstrip('/'))
                if not os.path.exists(disk_path):
                    missing.append((path, m, disk_path))
                else:
                    found.append((m, os.path.getsize(disk_path)))

print(f'Total image references checked: {len(found) + len(missing)}')
print(f'Distinct existing images found: {len(set(found))}')
for f, size in sorted(set(found)):
    print(f'  [OK] {f} ({size} bytes)')

if missing:
    print('MISSING IMAGES:')
    for p, m, d in missing:
        print(f'  [FAIL] In {p}: {m} (looked for {d})')
    exit(1)
else:
    print('\nSUCCESS: All referenced images exist on disk!')
