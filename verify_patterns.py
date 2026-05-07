import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('fix_final.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find lines with broken patterns and show their codepoints
for line in lines:
    if '("â' in line or '("ð' in line:
        # Extract the first string in the tuple
        start = line.find('("') + 2
        end = line.find('",', start)
        if end > start:
            pattern = line[start:end]
            cps = [hex(ord(c)) for c in pattern]
            print(f"Pattern: {repr(pattern)} -> codepoints: {cps}")
