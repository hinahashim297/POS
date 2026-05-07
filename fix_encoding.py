import os, re

js_dir = r"c:\Users\kamil computer\Desktop\hina pos final\static"

# Mojibake replacements (garbled UTF-8 decoded as Latin-1 → correct Unicode)
fixes = [
    ("ðŸ’", "\U0001F6D2"),  # 🛒 shopping cart
    ("â…", "✅"),             # ✅ check mark
    ("âŒ", "❌"),                   # ❌ red X
    ("â—", "❌"),             # ❌ alt
    ("ðŸ”¦", "\U0001F4E6"),  # 📦 package
    ("ðŸ”·", "\U0001F4F7"),  # 📷 camera
    ("ðŸž¯", "\U0001F3AF"),  # 🎯 target
    ("ðŸ’°", "\U0001F4B0"),  # 💰 money bag
    ("ðŸ”Š", "\U0001F4CA"),  # 📊 chart
    ("ðŸ”ˆ", "\U0001F4C8"),  # 📈 chart up
    ("ðŸ§¾", "\U0001F9FE"),  # 🧾 receipt
    ("â€¢", "•"),            # • bullet
    ("â†’", "→"),            # → arrow
    ("ðŸ”…", "\U0001F4C5"),  # 📅 calendar
    ("ðŸš€", "\U0001F680"),  # 🚀 rocket
    ("ðŸ’¡", "\U0001F4A1"),  # 💡 bulb
    ("â€™", "’"),            # ' right quote
    ("â€”", "—"),            # — em dash
    ("â€“", "–"),            # – en dash
    ("â€œ", "“"),            # " open quote
    ("â€", "”"),            # " close quote
]

total_fixed = 0

for root, dirs, files in os.walk(js_dir):
    # Skip venv
    dirs[:] = [d for d in dirs if d != 'venv']
    for fname in files:
        if not fname.endswith('.js'):
            continue
        path = os.path.join(root, fname)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            original = content
            for broken, correct in fixes:
                content = content.replace(broken, correct)
            if content != original:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fixed: {fname}")
                total_fixed += 1
        except Exception as e:
            print(f"Error in {fname}: {e}")

print(f"\nTotal JS files fixed: {total_fixed}")

# Also fix HTML templates
templates_dir = r"c:\Users\kamil computer\Desktop\hina pos final\templates"
html_fixed = 0
for fname in os.listdir(templates_dir):
    if not fname.endswith('.html'):
        continue
    path = os.path.join(templates_dir, fname)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content
        for broken, correct in fixes:
            content = content.replace(broken, correct)
        if content != original:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed HTML: {fname}")
            html_fixed += 1
    except Exception as e:
        print(f"Error in {fname}: {e}")

print(f"Total HTML files fixed: {html_fixed}")
