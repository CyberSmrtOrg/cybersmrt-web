#!/usr/bin/env python3
"""
Add Google Analytics to all HTML pages
This script adds the analytics scripts to all HTML pages that don't have them yet.
"""

import os
import re
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# The analytics snippet to add
ANALYTICS_SNIPPET = '''
  <!-- Google Analytics -->
  <script src="/assets/js/analytics-config.js"></script>
  <script src="/assets/js/analytics.js" defer></script>
'''

def should_skip_file(filepath):
    """Check if we should skip this file"""
    skip_patterns = [
        '_template',
        '_scaffold',
        'admin',
        'test-',
        'callback.html',  # Auth callback, skip
    ]

    filename = os.path.basename(filepath)
    for pattern in skip_patterns:
        if pattern in filename:
            return True
    return False

def has_analytics(content):
    """Check if the file already has analytics"""
    return 'analytics-config.js' in content or 'analytics.js' in content

def add_analytics_to_file(filepath):
    """Add analytics to a single HTML file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Skip if already has analytics
        if has_analytics(content):
            print(f'⏭  Skipped (already has analytics): {filepath}')
            return False

        # Find </head> tag
        head_match = re.search(r'([ \t]*)</head>', content, re.IGNORECASE)
        if not head_match:
            print(f'⚠  Skipped (no </head> tag found): {filepath}')
            return False

        # Add analytics just before </head>
        indent = head_match.group(1)  # Preserve indentation
        new_content = content.replace(
            head_match.group(0),
            f'{ANALYTICS_SNIPPET}{indent}</head>'
        )

        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f'✓ Added analytics to: {filepath}')
        return True

    except Exception as e:
        print(f'✗ Error processing {filepath}: {e}')
        return False

def main():
    """Main function"""
    root_dir = Path(__file__).parent.parent
    html_files = []

    # Find all HTML files
    html_files.extend(root_dir.glob('*.html'))
    html_files.extend(root_dir.glob('pages/**/*.html'))

    print(f'Found {len(html_files)} HTML files')
    print('=' * 60)

    added_count = 0
    skipped_count = 0

    for filepath in sorted(html_files):
        filepath_str = str(filepath)

        # Skip certain files
        if should_skip_file(filepath_str):
            print(f'⏭  Skipped (excluded): {filepath_str}')
            skipped_count += 1
            continue

        if add_analytics_to_file(filepath_str):
            added_count += 1
        else:
            skipped_count += 1

    print('=' * 60)
    print(f'✓ Complete! Added analytics to {added_count} files')
    print(f'⏭  Skipped {skipped_count} files')

if __name__ == '__main__':
    main()
