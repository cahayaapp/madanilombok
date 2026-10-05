"""Read the two user-supplied workbooks without modifying them.

Run with the bundled Python runtime (openpyxl), then node scripts/import-smp-update.mjs.
"""
import hashlib
import json
import sys
from pathlib import Path
import openpyxl

folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads'
names = ['GURU WALI SMP 2026-2027.xlsx', 'JADWAL SMP GANJIL 2026-2027 TERBARU.xlsx']
output = {}
for name in names:
    path = folder / name
    workbook = openpyxl.load_workbook(path, data_only=True)
    output[name] = {}
    for sheet in workbook:
        rows = [{'row': row[0].row, 'cells': {c.column_letter: c.value for c in row if c.value is not None}}
                for row in sheet if any(c.value is not None for c in row)]
        output[name][sheet.title] = {'rows': rows, 'merges': [str(m) for m in sheet.merged_cells.ranges]}
    output[name]['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    workbook.close()
Path('seed/imports/smp-2026-2027-source.json').write_text(json.dumps(output, ensure_ascii=False, indent=2, default=str) + '\n')
