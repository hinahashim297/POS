import sys
sys.stdout.reconfigure(encoding="utf-8")
with open("fix_html_emoji.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '("â' in line or '("ð' in line:
        start = line.find('("') + 2
        end = line.find('",', start)
        if end > start:
            pattern = line[start:end]
            cps = [hex(ord(c)) for c in pattern]
            print(f"Line {i}: {repr(pattern)} -> {cps}")
