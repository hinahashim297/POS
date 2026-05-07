import os

fixes = [
    # Checkmarks / X marks
    ("â", "✔"),   # â✔ → ✔ (heavy check mark U+2714)
    ("â", "✅"),   # âœ… → ✅
    ("â", "❌"),         # âŒ → ❌
    # Warning sign with variation selector (⚠️)
    ("â ï¸", "⚠️"),  # âš ï¸ → ⚠️
    # Box drawing characters (─) used in comments
    ("â€", "─"),   # â"€ → ─
    # Credit card emoji 💳 U+1F4B3 = F0 9F 92 B3
    ("ð³", "\U0001f4b3"),  # ðŸ'³ → 💳
    # Mobile phone 📱 U+1F4F1 = F0 9F 93 B1
    ("ð±", "\U0001f4f1"),  # ðŸ"± → 📱
    # Calendar 📅 U+1F4C5 = F0 9F 93 85
    ("ð", "\U0001f4c5"),  # ðŸ"… → 📅
    # Telescope 🔭 U+1F52D = F0 9F 94 AD
    ("ð­", "\U0001f52d"),  # ðŸ"­ → 🔭
    # Shopping cart 🛒 U+1F6D2 = F0 9F 9B 92
    ("ð", "\U0001f6d2"),
    # Package 📦 U+1F4E6
    ("ð¦", "\U0001f4e6"),
    # Camera 📷 U+1F4F7
    ("ð·", "\U0001f4f7"),
    # Target 🎯 U+1F3AF
    ("ð¯", "\U0001f3af"),
    # Money bag 💰 U+1F4B0
    ("ð°", "\U0001f4b0"),
    # Chart 📊 U+1F4CA
    ("ð", "\U0001f4ca"),
    # Chart up 📈 U+1F4C8
    ("ð", "\U0001f4c8"),
    # Receipt 🧾 U+1F9FE
    ("ð§¾", "\U0001f9fe"),
    # Rocket 🚀 U+1F680
    ("ð", "\U0001f680"),
    # Bulb 💡 U+1F4A1
    ("ð¡", "\U0001f4a1"),
    # Bullet point
    ("â¢", "•"),   # â€¢ → •
    # Arrows
    ("â", "→"),   # â†' → →
    # Quotes
    ("â", "’"),   # â€™ → '
    ("â", "—"),   # â€" → —
    ("â", "–"),   # â€" → –
    ("â", "“"),   # â€œ → "
    ("â", "”"),   # â€ → "
]

# Use raw byte-level replacement: read as latin-1, fix, re-encode as utf-8
def fix_file_bytes(path):
    with open(path, 'rb') as f:
        raw = f.read()
    # Decode as latin-1 (lossless — every byte maps to a code point)
    text = raw.decode('latin-1')
    original = text
    for broken, correct in fixes:
        text = text.replace(broken, correct)
    if text != original:
        with open(path, 'wb') as f:
            f.write(text.encode('utf-8'))
        return True
    return False

base = r"c:\Users\kamil computer\Desktop\hina pos final"
dirs = [
    os.path.join(base, 'static', 'js'),
    os.path.join(base, 'static', 'css'),
    os.path.join(base, 'templates'),
]

total = 0
for d in dirs:
    for root, subdirs, files in os.walk(d):
        subdirs[:] = [s for s in subdirs if s != 'venv']
        for fname in files:
            if not fname.endswith(('.js', '.css', '.html')):
                continue
            path = os.path.join(root, fname)
            try:
                if fix_file_bytes(path):
                    print(f"Fixed: {fname}")
                    total += 1
            except Exception as e:
                print(f"Error {fname}: {e}")

print(f"\nTotal files fixed: {total}")
