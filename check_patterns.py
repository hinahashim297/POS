import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('fix_encoding3.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("First 10 lines of FIXES:")
in_fixes = False
count = 0
for line in lines:
    if 'FIXES = [' in line:
        in_fixes = True
    if in_fixes:
        print(repr(line.rstrip()))
        count += 1
        if count > 12:
            break
