import sys
sys.stdout.reconfigure(encoding='utf-8')

files_to_check = {
    r'static\js\pos_page.js': ['Transaction ID', 'Product not found'],
    r'static\js\settings.js': ['current password'],
    r'static\js\login.js': ['Admin credentials'],
    r'static\js\sales_analytics.js': ['Failed to load', 'No sales data'],
    r'static\js\reports_dashboard.js': ['Error exporting'],
}

for filepath, keywords in files_to_check.items():
    print(f"\n=== {filepath} ===")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            for kw in keywords:
                if kw in line:
                    # Find the non-ASCII chars
                    non_ascii = [(j, hex(ord(c)), c) for j, c in enumerate(line) if ord(c) > 0x7e and ord(c) < 0x300 or ord(c) > 0x300]
                    print(f"  Line {i}: non-ascii = {non_ascii[:15]}")
                    break
    except Exception as e:
        print(f"  Error: {e}")
