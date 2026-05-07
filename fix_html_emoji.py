import os, sys
sys.stdout.reconfigure(encoding='utf-8')

# All patterns use explicit Unicode escapes (no ambiguity)
HTML_FIXES = [
    # left arrow U+2190 = E2 86 90: U+00E2 + U+2020(dagger) + U+0090(ctrl)
    ("â†", "←"),
    # pedestrian U+1F6B6 = F0 9F 9A B6: U+00F0 + U+0178 + U+0161(s-caron) + U+00B6(pilcrow)
    ("ðŸš¶", "\U0001f6b6"),
    # convenience store U+1F3EA = F0 9F 8F AA: U+00F0 + U+0178 + U+008F(ctrl) + U+00AA(fem-ord)
    ("ðŸª", "\U0001f3ea"),
    # sun with face U+1F31E = F0 9F 8C 9E: U+00F0 + U+0178 + U+0152(OE-cap) + U+017E(z-caron)
    ("ðŸŒž", "\U0001f31e"),
    # crescent moon U+1F319 = F0 9F 8C 99: U+00F0 + U+0178 + U+0152(OE-cap) + U+2122(trademark)
    ("ðŸŒ™", "\U0001f319"),
]

templates_dir = r"c:\Users\kamil computer\Desktop\hina pos final\templates"
total = 0
for fname in os.listdir(templates_dir):
    if not fname.endswith('.html'):
        continue
    path = os.path.join(templates_dir, fname)
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    original = text
    for broken, correct in HTML_FIXES:
        text = text.replace(broken, correct)
    if text != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Fixed: {fname}")
        total += 1

print(f"\nTotal HTML files fixed: {total}")
