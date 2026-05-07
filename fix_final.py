"""
Final encoding fix using exact Unicode codepoints confirmed by debug analysis.
All patterns read as UTF-8 Unicode strings.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

FIXES = [
    # check mark U+2713 — E2 9C 93 via cp1252: a-circ + oe-lig + left-dquote
    ("âœ“", "✓"),
    # cross mark U+274C — E2 9D 8C via cp1252: a-circ + U+009D ctrl + OE-lig
    ("âŒ", "❌"),
    # warning sign stray ctrl byte — remove U+008F left after partial fix
    ("⚠️", "⚠️"),
    # box drawing light horiz U+2500 — E2 94 80: a-circ + right-dquote + euro
    ("â”€", "─"),
    # credit card U+1F4B3 — F0 9F 92 B3: eth + Y-diaer + right-squote + superscript3
    ("ðŸ’³", "\U0001f4b3"),
    # mobile phone U+1F4F1 — F0 9F 93 B1: eth + Y-diaer + left-dquote + plus-minus
    ("ðŸ“±", "\U0001f4f1"),
    # magnifying glass U+1F50D (was garbled telescope) — F0 9F 93 AD: eth + Y-diaer + left-dquote + soft-hyphen
    ("ðŸ“­", "\U0001f50d"),
    # calendar U+1F4C5 — F0 9F 93 85: eth + Y-diaer + left-dquote + ellipsis
    ("ðŸ“…", "\U0001f4c5"),
    # shopping cart U+1F6D2 — F0 9F 9B 92: eth + Y-diaer + right-angle-quote + right-squote
    ("ðŸ›’", "\U0001f6d2"),
    # package U+1F4E6 — F0 9F 93 A6: eth + Y-diaer + left-dquote + broken-bar
    ("ðŸ“¦", "\U0001f4e6"),
    # camera U+1F4F7 — F0 9F 93 B7: eth + Y-diaer + left-dquote + middle-dot
    ("ðŸ“·", "\U0001f4f7"),
    # target U+1F3AF — F0 9F 8E AF: eth + Y-diaer + Z-caron + macron
    ("ðŸŽ¯", "\U0001f3af"),
    # money bag U+1F4B0 — F0 9F 92 B0: eth + Y-diaer + right-squote + degree
    ("ðŸ’°", "\U0001f4b0"),
    # bar chart U+1F4CA — F0 9F 93 8A: eth + Y-diaer + left-dquote + S-caron
    ("ðŸ“Š", "\U0001f4ca"),
    # chart up U+1F4C8 — F0 9F 93 88: eth + Y-diaer + left-dquote + modifier-circ
    ("ðŸ“ˆ", "\U0001f4c8"),
    # receipt U+1F9FE — F0 9F A7 BE: eth + Y-diaer + section + 3/4
    ("ðŸ§¾", "\U0001f9fe"),
    # rocket U+1F680 — F0 9F 9A 80: eth + Y-diaer + s-caron + euro
    ("ðŸš€", "\U0001f680"),
    # bulb U+1F4A1 — F0 9F 92 A1: eth + Y-diaer + right-squote + inverted-excl
    ("ðŸ’¡", "\U0001f4a1"),
    # bullet U+2022 — E2 80 A2: a-circ + euro + cent
    ("â€¢", "•"),
    # right arrow U+2192 — E2 86 92: a-circ + dagger + right-squote
    ("â†’", "→"),
    # right single quote U+2019 — E2 80 99: a-circ + euro + trademark
    ("â€™", "’"),
    # em dash U+2014 — E2 80 94: a-circ + euro + right-dquote
    ("â€”", "—"),
    # en dash U+2013 — E2 80 93: a-circ + euro + left-dquote
    ("â€“", "–"),
    # left double quote U+201C — E2 80 9C: a-circ + euro + oe-lig
    ("â€œ", "“"),
    # check mark U+2705 — E2 9C 85: a-circ + oe-lig + ellipsis
    ("âœ…", "✅"),
]

base = r"c:\Users\kamil computer\Desktop\hina pos final"
dirs = [
    os.path.join(base, "static", "js"),
    os.path.join(base, "static", "css"),
    os.path.join(base, "templates"),
]

total = 0
for d in dirs:
    for root, subdirs, files in os.walk(d):
        subdirs[:] = [s for s in subdirs if s != "venv"]
        for fname in files:
            if not fname.endswith((".js", ".css", ".html")):
                continue
            path = os.path.join(root, fname)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    text = f.read()
                original = text
                for broken, correct in FIXES:
                    text = text.replace(broken, correct)
                if text != original:
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(text)
                    print(f"Fixed: {fname}")
                    total += 1
            except Exception as e:
                print(f"Error {fname}: {e}")

print(f"\nTotal files fixed: {total}")
