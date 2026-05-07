import sys
sys.stdout.reconfigure(encoding='utf-8')

checks = [
    (r'templates\forgot_password.html', 'Back to Login'),
    (r'templates\pos.html', 'Walk-in'),
    (r'templates\receipt.html', 'POS SYSTEM'),
    (r'templates\settings.html', 'Light Mode'),
    (r'templates\settings.html', 'Dark Mode'),
]

for filepath, keyword in checks:
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        if keyword in line:
            non_ascii = [(j, hex(ord(c)), c if ord(c) < 0x10000 else '?')
                         for j, c in enumerate(line) if ord(c) > 0x7e]
            print(f"{filepath}:{i} non-ascii = {non_ascii[:10]}")
            break
