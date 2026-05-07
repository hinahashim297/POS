import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'templates\receipt.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines, 1):
    if i in (284, 302):
        cps = [(j, hex(ord(c)), repr(c)) for j, c in enumerate(line) if ord(c) > 0x7e]
        print(f"Line {i}: {cps[:8]}")
