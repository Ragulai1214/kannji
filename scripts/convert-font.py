import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
root = Path(__file__).resolve().parent.parent
font = TTFont(root / 'public/fonts/NotoSerifJP-Bold.ttf')
glyph_set = font.getGlyphSet()
cmap = font.getBestCmap()
section = (root / 'docs/specification.md').read_text(encoding='utf-8').split('## 6.')[1].split('## 7.')[0]
chars = ''.join(line.strip().replace('・', '') for line in section.splitlines() if len(line.split('・')) >= 35) + '1'
assert len(chars) == len(set(chars)) == 251
class Pen(BasePen):
    def __init__(self):
        super().__init__(glyph_set)
        self.commands = []
    def emit(self, op, *points):
        self.commands.append(op + ' ' + ' '.join(str(round(v, 3)) for p in points for v in p))
    def _moveTo(self, p): self.emit('m', p)
    def _lineTo(self, p): self.emit('l', p)
    def _qCurveToOne(self, p1, p2): self.emit('q', p2, p1)
    def _curveToOne(self, p1, p2, p3): self.emit('b', p3, p1, p2)
    def _closePath(self): pass
    def _endPath(self): pass
glyphs = {}
for char in chars:
    glyph = glyph_set[cmap[ord(char)]]
    pen = Pen()
    glyph.draw(pen)
    glyphs[char] = {'ha': glyph.width, 'x_min': 0, 'x_max': glyph.width, 'o': ' '.join(pen.commands)}
data = {'familyName': 'Kannji Outline', 'resolution': font['head'].unitsPerEm, 'ascender': font['hhea'].ascent, 'descender': font['hhea'].descent, 'underlineThickness': font['post'].underlineThickness, 'boundingBox': {'yMin': font['head'].yMin, 'yMax': font['head'].yMax}, 'glyphs': glyphs, 'copyright': 'Derived from Noto Serif JP, Copyright 2012 Google Inc. SIL OFL 1.1; see OFL.txt.'}
output = root / 'public/fonts/kannji-outline.typeface.json'
output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Generated {len(glyphs)} glyphs, {output.stat().st_size} bytes')
