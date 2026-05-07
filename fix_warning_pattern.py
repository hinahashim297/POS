import sys
sys.stdout.reconfigure(encoding="utf-8")
with open("fix_final.py", "r", encoding="utf-8") as f:
    content = f.read()
# Replace the warning sign pattern line (currently has 2-char emoji on both sides)
# Need: search = warning-sign + variation-selector + U+008F (3 chars)
#       replace = warning-sign + variation-selector (2 chars)
old_line = "    (\"⚠️\", \"⚠️\"),"
new_line = "    (\"⚠️\x8f\", \"⚠️\"),"
if old_line in content:
    content = content.replace(old_line, new_line)
    with open("fix_final.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated warning pattern")
else:
    # Try to find the line
    for i, line in enumerate(content.split("\n")):
        if "warning sign" in line.lower() or "u+008f" in line.lower():
            print(f"Line {i}: {repr(line)}")
