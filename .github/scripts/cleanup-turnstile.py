#!/usr/bin/env python3
import os
import re
from pathlib import Path

def cleanup_html_file(filepath):
    """Remove turnstile-gate-loader.js script tag from HTML file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if file has the loader script
        if 'turnstile-gate-loader.js' not in content:
            return False

        # Remove the loader script lines (including comment and script tag)
        lines = content.split('\n')
        new_lines = []
        skip_next = False

        for i, line in enumerate(lines):
            # Skip comment line
            if 'Turnstile Gate Loader' in line:
                skip_next = True
                continue
            # Skip script line
            if skip_next and 'turnstile-gate-loader.js' in line:
                skip_next = False
                continue

            new_lines.append(line)

        new_content = '\n'.join(new_lines)

        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"✅ Cleaned: {filepath}")
        return True

    except Exception as e:
        print(f"❌ Error: {filepath} - {e}")
        return False

def main():
    root_dir = Path('.')
    html_files = list(root_dir.rglob('*.html'))

    # Skip these files
    skip_patterns = ['node_modules', '.git', 'partials/turnstile-gate.html']

    cleaned = 0
    for filepath in html_files:
        if any(pattern in str(filepath) for pattern in skip_patterns):
            continue

        if cleanup_html_file(filepath):
            cleaned += 1

    print(f"\n{'='*50}")
    print(f"✅ Cleaned {cleaned} files")
    print(f"{'='*50}")

if __name__ == '__main__':
    main()