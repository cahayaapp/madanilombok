"""Read-only extraction of the user-supplied SD workbook, including merged cells."""
import hashlib
import json
import sys
from pathlib import Path
import openpyxl

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/JADWAL PELAJARAN semester GANJIL 2026-2027.xlsx'
workbook = openpyxl.load_workbook(path, data_only=True)
result = {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'sheets': {}}
for sheet in workbook:
    result['sheets'][sheet.title] = {
        'rows': [{'row': row[0].row, 'cells': {c.column_letter: c.value for c in row if c.value is not None}}
                 for row in sheet if any(c.value is not None for c in row)],
        'merges': [str(m) for m in sheet.merged_cells.ranges]
    }
workbook.close()
Path('seed/imports/sd-2026-2027-source.json').write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str) + '\n')
