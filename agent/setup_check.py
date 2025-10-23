#!/usr/bin/env python3
"""
Quick Setup Script - Helps you get started with the Code Agent
"""

import os
import sys
from pathlib import Path


def check_python_version():
    if sys.version_info < (3, 9):
        print("❌ Python 3.9 or higher is required")
        print(f"   You have Python {sys.version_info.major}.{sys.version_info.minor}")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")


def check_dependencies():
    print("\n📦 Checking dependencies...")
    
    required = [
        'anthropic', 'chromadb', 'pyyaml', 'esprima', 
        'beautifulsoup4', 'lxml', 'tiktoken', 'numpy', 'tqdm'
    ]
    
    missing = []
    for package in required:
        try:
            __import__(package.replace('-', '_'))
            print(f"   ✅ {package}")
        except ImportError:
            print(f"   ❌ {package} - missing")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("\nInstall with:")
        print("   pip install -r requirements.txt --break-system-packages")
        return False
    
    print("\n✅ All dependencies installed")
    return True


def check_config():
    print("\n⚙️  Checking configuration...")
    
    if not Path("config.yml").exists():
        print("❌ config.yml not found")
        print("\nCreate config.yml with your Anthropic API key:")
        print("""
anthropic_api_key: "sk-ant-api03-..."
repo_path: ".."
ignore_patterns:
  - "node_modules"
  - "dist"
  - "build"
file_extensions:
  - ".js"
  - ".jsx"
  - ".html"
        """)
        return False
    
    print("✅ config.yml found")
    
    # Check if API key is set
    import yaml
    with open("config.yml", 'r') as f:
        config = yaml.safe_load(f)
    
    if config.get('anthropic_api_key', '').startswith('sk-ant-'):
        print("✅ API key configured")
        return True
    else:
        print("⚠️  API key needs to be set in config.yml")
        return False


def check_repo_path():
    print("\n📁 Checking repository path...")
    
    import yaml
    with open("config.yml", 'r') as f:
        config = yaml.safe_load(f)
    
    repo_path = Path(config.get('repo_path', '..')).resolve()
    
    if repo_path.exists():
        print(f"✅ Repository found: {repo_path}")
        
        # Count code files
        extensions = config.get('file_extensions', ['.js', '.jsx', '.html'])
        count = 0
        for ext in extensions:
            count += len(list(repo_path.rglob(f"*{ext}")))
        
        print(f"   Found ~{count} code files")
        return True
    else:
        print(f"❌ Repository not found: {repo_path}")
        return False


def main():
    print("🤖 Code Agent - Quick Setup Check\n")
    print("=" * 50)
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Configuration", check_config),
        ("Repository", check_repo_path),
    ]
    
    all_passed = True
    for name, check_func in checks:
        try:
            result = check_func()
            if result is False:
                all_passed = False
        except Exception as e:
            print(f"❌ {name} check failed: {e}")
            all_passed = False
    
    print("\n" + "=" * 50)
    
    if all_passed:
        print("\n🎉 All checks passed! Ready to use the Code Agent.")
        print("\nNext steps:")
        print("1. Index your codebase:  python indexer.py")
        print("2. Start querying:       python cli.py")
        print("\nSee EXAMPLES.md for example queries!")
    else:
        print("\n⚠️  Some checks failed. Please fix the issues above.")
        print("\nSee SETUP.md for detailed setup instructions.")
    
    print()


if __name__ == "__main__":
    main()
