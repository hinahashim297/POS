# Fix mojibake: UTF-8 emoji bytes that were decoded as cp1252 and re-saved as UTF-8.
# Each broken pattern is the cp1252 characters encoded as UTF-8, read back as Unicode.
# Pattern derivation: emoji UTF-8 bytes -> decoded per cp1252 -> stored as UTF-8 -> read as Unicode.
import os

FIXES = [
    # ✔  U+2714 = E2 9C 94  ->  cp1252: â œ "
    ("âœ”", "✔"),
    # ✅  U+2705 = E2 9C 85  ->  cp1252: â œ …
    ("âœ…", "✅"),
    # ❌  U+274C = E2 9D 8C  ->  cp1252: â [9D=undefined,dropped] Œ
    ("âŒ", "❌"),
    # ⚠️  U+26A0 U+FE0F = E2 9A A0 EF B8 8F  ->  cp1252: â š NBSP ï ¸ [8F=undefined,dropped]
    ("âš ï¸", "⚠️"),
    # ─   U+2500 = E2 94 80  ->  cp1252: â " €
    ("â”€", "─"),
    # 💳  U+1F4B3 = F0 9F 92 B3  ->  cp1252: ð Ÿ ' ³
    ("ðŸ’³", "\U0001f4b3"),
    # 📱  U+1F4F1 = F0 9F 93 B1  ->  cp1252: ð Ÿ " ±
    ("ðŸ“±", "\U0001f4f1"),
    # 📅  U+1F4C5 = F0 9F 93 85  ->  cp1252: ð Ÿ " …
    ("ðŸ“…", "\U0001f4c5"),
    # 🔭  U+1F52D = F0 9F 94 AD  ->  cp1252: ð Ÿ " ­(soft-hyphen)
    ("ðŸ”­", "\U0001f52d"),
    # 🛒  U+1F6D2 = F0 9F 9B 92  ->  cp1252: ð Ÿ › '
    ("ðŸ›’", "\U0001f6d2"),
    # 📦  U+1F4E6 = F0 9F 93 A6  ->  cp1252: ð Ÿ " ¦
    ("ðŸ“¦", "\U0001f4e6"),
    # 📷  U+1F4F7 = F0 9F 93 B7  ->  cp1252: ð Ÿ " ·
    ("ðŸ“·", "\U0001f4f7"),
    # 🎯  U+1F3AF = F0 9F 8E AF  ->  cp1252: ð Ÿ Ž ¯
    ("ðŸŽ¯", "\U0001f3af"),
    # 💰  U+1F4B0 = F0 9F 92 B0  ->  cp1252: ð Ÿ ' °
    ("ðŸ’°", "\U0001f4b0"),
    # 📊  U+1F4CA = F0 9F 93 8A  ->  cp1252: ð Ÿ " Š
    ("ðŸ“Š", "\U0001f4ca"),
    # 📈  U+1F4C8 = F0 9F 93 88  ->  cp1252: ð Ÿ " ˆ
    ("ðŸ“ˆ", "\U0001f4c8"),
    # 🧾  U+1F9FE = F0 9F A7 BE  ->  cp1252: ð Ÿ § ¾
    ("ðŸ§¾", "\U0001f9fe"),
    # 🚀  U+1F680 = F0 9F 9A 80  ->  cp1252: ð Ÿ š €
    ("ðŸš€", "\U0001f680"),
    # 💡  U+1F4A1 = F0 9F 92 A1  ->  cp1252: ð Ÿ ' ¡
    ("ðŸ’¡", "\U0001f4a1"),
    # •   U+2022 = E2 80 A2  ->  cp1252: â € ¢
    ("â€¢", "•"),
    # →   U+2192 = E2 86 92  ->  cp1252: â † '
    ("â†’", "→"),
    # '   U+2019 = E2 80 99  ->  cp1252: â € ™
    ("â€™", "’"),
    # —   U+2014 = E2 80 94  ->  cp1252: â € "
    ("â€”", "—"),
    # –   U+2013 = E2 80 93  ->  cp1252: â € "
    ("â€“", "–"),
    # "   U+201C = E2 80 9C  ->  cp1252: â € œ
    ("â€œ", "“"),
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
