import sys
sys.stdout.reconfigure(encoding='utf-8')

# Read pos_page.js and find the problem line
with open(r'static\js\pos_page.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if 'Please enter Transaction' in line:
        print(f"Line {i} repr: {repr(line)}")
        print(f"Line {i} chars: {[hex(ord(c)) for c in line]}")
        print()
    if 'Product not found' in line:
        print(f"Line {i} repr: {repr(line)}")
        print()

# Also check settings.js
print("--- settings.js ---")
with open(r'static\js\settings.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines, 1):
    if 'current password' in line:
        print(f"Line {i} repr: {repr(line[:80])}")
        print(f"Chars around problem: {[hex(ord(c)) for c in line[:30]]}")
        break

# Check login.js
print("--- login.js ---")
with open(r'static\js\login.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines, 1):
    if 'Admin credentials' in line:
        print(f"Line {i} repr: {repr(line[:80])}")
        break
