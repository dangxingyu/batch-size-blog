"""Trim unused glyphs and axis extremes; bound spacing changes at visible sizes.

Regenerate with: uv run --with 'fonttools[woff]' python scripts/subset-blog-font.py
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

repository = Path(__file__).resolve().parents[1]
assets = repository / "batch-size"
source = assets / "fonts/fraunces-latin-full-normal.woff2"
output = assets / "fonts/fraunces-essay.woff2"
text = "".join(path.read_text() for path in [
    repository / "index.html", assets / "app.js", assets / "playable.js"
])
characters = set(range(32, 256)) | {ord(character) for character in text}
font = TTFont(source)
# Keep every axis value the article uses, trimming the unused extremes.
instantiateVariableFont(font, {"wght": (400, 400, 700), "opsz": (9, 9, 100),
    "SOFT": (0, 0, 30), "WONK": 1}, inplace=True)
options = subset.Options()
options.flavor = "woff2"
options.layout_features = ["*"]
options.name_IDs = ["*"]
options.name_languages = ["*"]
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=characters)
subsetter.subset(font)
font.recalcTimestamp = False
font.save(output)

# Axis normalization can round a metric by at most 2/2000 em (0.076px at 76px).
max_metric_change = 0
for axes in [
    {"wght": 450, "opsz": 72, "SOFT": 30, "WONK": 1},
    {"wght": 400, "opsz": 16, "SOFT": 0, "WONK": 1},
    {"wght": 400, "opsz": 76, "SOFT": 0, "WONK": 1},
]:
    original = instantiateVariableFont(TTFont(source), axes, inplace=False)
    compact_font = TTFont(output)
    retained_axes = {axis.axisTag for axis in compact_font["fvar"].axes}
    compact = instantiateVariableFont(compact_font,
        {tag: value for tag, value in axes.items() if tag in retained_axes}, inplace=False)
    for codepoint, glyph in compact.getBestCmap().items():
        source_glyph = original.getBestCmap()[codepoint]
        change = max(abs(a - b) for a, b in zip(original["hmtx"].metrics[source_glyph], compact["hmtx"].metrics[glyph]))
        max_metric_change = max(max_metric_change, change)
assert max_metric_change <= 2
print(f"Font: {source.stat().st_size:,} -> {output.stat().st_size:,} bytes; metric change <= {max_metric_change}/2000 em.")
