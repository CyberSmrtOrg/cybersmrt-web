#!/usr/bin/env python3
import os
import re
from pathlib import Path

# Turnstile scripts to add
TURNSTILE_SCRIPTS = '''  <!-- Cloudflare Turnstile API -->
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

  <!-- Turnstile Gate Loader -->

'''

def should_skip_file(filepath):
    """Files to skip"""
    skip_patterns = [
        'node_modules',
        '.git',
        'partials/footer.html',
        'partials/header.html',
        'partials/turnstile-gate.html',
    ]
    return any(pattern in str(filepath) for pattern in skip_patterns)

def add_turnstile_to_file(filepath):
    """Add Turnstile scripts to a single HTML file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if already added
        if 'turnstile-gate-loader.js' in content:
            print(f"⏭️  Skipping {filepath} (already has Turnstile)")
            return False

        # Check if file has <head> tag
        if '<head>' not in content:
            print(f"⏭️  Skipping {filepath} (no <head> tag)")
            return False

        # Add scripts after <head> tag
        new_content = content.replace('<head>', f'<head>\n{TURNSTILE_SCRIPTS}', 1)

        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"✅ Added Turnstile to: {filepath}")
        return True

    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False

def main():
    """Find and process all HTML files"""
    root_dir = Path('.')
    html_files = root_dir.rglob('*.html')

    updated_count = 0
    skipped_count = 0

    for filepath in html_files:
        if should_skip_file(filepath):
            skipped_count += 1
            continue

        if add_turnstile_to_file(filepath):
            updated_count += 1
        else:
            skipped_count += 1

    print(f"\n{'='*50}")
    print(f"✅ Updated: {updated_count} files")
    print(f"⏭️  Skipped: {skipped_count} files")
    print(f"{'='*50}")

if __name__ == '__main__':
    main()