"""Regenerate the checked-in UI font. Requires fonttools, not needed to build."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
source = root / 'public/fonts/NotoSerifJP-Bold.ttf'
font = TTFont(source)
original_cmap = font.getBestCmap()
# Include source text (all 250 kanji, labels and comments), ASCII and Japanese punctuation.
text = ''.join(path.read_text(encoding='utf-8-sig') for path in (root / 'src').rglob('*.ts'))
unicodes = set(map(ord, text)) | set(range(0x20, 0x7f)) | set(range(0x3000, 0x3040))
options = subset.Options()
options.name_IDs = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=unicodes)
subsetter.subset(font)
for record in font['name'].names:
    if record.nameID in (1, 3, 4, 6, 16, 17):
        values = {1: 'Kannji UI', 3: 'Kannji UI Bold 1.0', 4: 'Kannji UI Bold', 6: 'KannjiUI-Bold', 16: 'Kannji UI', 17: 'Bold'}
        record.string = values[record.nameID].encode(record.getEncoding())
output = root / 'public/fonts/kannji-ui-bold.ttf'
font.save(output)
generated = TTFont(output)
assert (unicodes & original_cmap.keys()) <= generated.getBestCmap().keys(), 'UI font lost a required character'
print(f'UI font: {source.stat().st_size:,} -> {output.stat().st_size:,} bytes; {len(font.getBestCmap())} code points')
