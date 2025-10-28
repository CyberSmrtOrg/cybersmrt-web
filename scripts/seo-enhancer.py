#!/usr/bin/env python3
"""
CyberSmrt SEO Enhancement Script
Automatically adds Schema.org JSON-LD, optimized meta tags, and SEO improvements to all HTML pages
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup
import html as html_lib

# Configuration
BASE_URL = "https://cybersmrt.org"
SITE_NAME = "CyberSmrt"
DEFAULT_IMAGE = f"{BASE_URL}/assets/logos/cybersmrt-logo-only.png"
DEFAULT_TWITTER = "@cybersmrt"

# Organization Schema (base for all pages)
ORG_SCHEMA = {
    "@context": "https://schema.org",
    "@type": "NGO",
    "name": "CyberSmrt",
    "alternateName": "CyberSmrt Inc.",
    "legalName": "CyberSmrt Inc.",
    "url": BASE_URL,
    "logo": {
        "@type": "ImageObject",
        "url": DEFAULT_IMAGE,
        "width": 500,
        "height": 500
    },
    "image": DEFAULT_IMAGE,
    "description": "Service-Disabled Veteran-Owned 501(c)(3) nonprofit providing free cybersecurity education, tools, and training to underserved communities, K-12 students, and educators nationwide.",
    "slogan": "Free Cybersecurity Education & Tools for Everyone",
    "foundingDate": "2023",
    "founder": {
        "@type": "Person",
        "name": "Tony",
        "jobTitle": "Founder & CEO",
        "description": "Service-disabled veteran with 21+ years military service, 15+ years cybersecurity experience, CISSP, CISM, TS/SCI clearance"
    },
    "address": {
        "@type": "PostalAddress",
        "addressLocality": "Seattle",
        "addressRegion": "WA",
        "addressCountry": "US"
    },
    "areaServed": {
        "@type": "Country",
        "name": "United States"
    },
    "contactPoint": [{
        "@type": "ContactPoint",
        "contactType": "General Inquiries",
        "email": "tony@cybersmrt.org",
        "availableLanguage": "English"
    }],
    "sameAs": ["https://github.com/CyberSmrtOrg"],
    "nonprofitStatus": "Nonprofit501c3",
    "knowsAbout": [
        "Cybersecurity Education", "K-12 Education", "Information Security",
        "Digital Safety", "Security Awareness Training", "Phishing Detection",
        "QR Code Security", "Cyber Threat Intelligence", "STEM Education"
    ],
    "seeks": [
        {"@type": "Demand", "name": "Volunteers"},
        {"@type": "Demand", "name": "Board Members"},
        {"@type": "Demand", "name": "Donations"},
        {"@type": "Demand", "name": "School Partnerships"}
    ]
}

# Page-specific configurations
PAGE_CONFIG = {
    "index.html": {
        "title": "Free Cybersecurity Education for Everyone | CyberSmrt Nonprofit",
        "description": "Service-Disabled Veteran-Owned 501(c)(3) nonprofit offering free cybersecurity education, QR scanner, phishing detector, and K-12 curriculum for underserved communities.",
        "keywords": "cybersecurity education nonprofit, free cyber training, K-12 security curriculum, veteran owned nonprofit, phishing detector, QR scanner",
        "schema_type": "WebSite",
        "add_searchaction": True
    },
    "pages/about/index.html": {
        "title": "Service-Disabled Veteran-Owned Cybersecurity Nonprofit | About CyberSmrt",
        "description": "Learn about CyberSmrt's mission to close the cybersecurity equity gap. Founded by a service-disabled veteran with 21+ years military and 15+ years cybersecurity experience.",
        "keywords": "veteran owned nonprofit, cybersecurity nonprofit, 501c3, Tony, Seattle nonprofit, underserved communities",
        "schema_type": "AboutPage"
    },
    "pages/programs/k12-curriculum.html": {
        "title": "Free K-12 Cybersecurity Curriculum for Schools | CyberSmrt",
        "description": "Standards-aligned, free cybersecurity curriculum for K-12 students. Phishing awareness, password security, digital safety. Perfect for educators and charter schools.",
        "keywords": "K-12 cybersecurity curriculum, school security training, phishing education, digital citizenship, STEM education, free curriculum",
        "schema_type": "Course"
    },
    "pages/tools/qr-tester.html": {
        "title": "Free QR Code Security Scanner - Detect Malicious QR Codes | CyberSmrt",
        "description": "Scan QR codes for free to detect malicious links, phishing scams, and security threats. Upload images or use your camera. Protect yourself with CyberSmrt's QR security scanner.",
        "keywords": "QR code scanner, QR security, malicious QR code, QR code checker, scan QR code online, phishing QR",
        "schema_type": "SoftwareApplication"
    },
    "pages/tools/phishing-detector.html": {
        "title": "Free Phishing Email Detector - Identify Scams & Threats | CyberSmrt",
        "description": "Analyze emails for phishing indicators with our free AI-powered tool. Detect social engineering, malicious links, and email scams instantly.",
        "keywords": "phishing detector, email scanner, phishing checker, email security, scam detector, social engineering",
        "schema_type": "SoftwareApplication"
    },
    "pages/tools/password-checker.html": {
        "title": "Free Password Strength Checker - Test Your Password Security | CyberSmrt",
        "description": "Check your password strength instantly with our free, privacy-focused tool. Get real-time feedback and tips to create unbreakable passwords.",
        "keywords": "password checker, password strength, secure password, password security, password validator",
        "schema_type": "SoftwareApplication"
    },
    "pages/get-involved/donate.html": {
        "title": "Support Cybersecurity Education for Underserved Communities | Donate to CyberSmrt",
        "description": "Your donation helps provide free cybersecurity education to underserved communities, K-12 students, and schools. 501(c)(3) tax-deductible contributions.",
        "keywords": "donate cybersecurity education, nonprofit donation, tax deductible, support cyber literacy, 501c3 donation",
        "schema_type": "DonateAction"
    },
    "pages/get-involved/volunteer.html": {
        "title": "Volunteer with CyberSmrt - Share Your Cybersecurity Expertise",
        "description": "Join our mission to democratize cybersecurity education. Volunteer opportunities for cybersecurity professionals, educators, and board members.",
        "keywords": "cybersecurity volunteer, nonprofit volunteer, board member opportunity, mentor students, tech volunteer",
        "schema_type": "VolunteerAction"
    }
}


def generate_breadcrumb_schema(url_path):
    """Generate breadcrumb JSON-LD schema based on URL path"""
    parts = [p for p in url_path.split('/') if p and p != 'index.html']
    breadcrumbs = [{
        "position": 1,
        "name": "Home",
        "item": BASE_URL
    }]

    current_url = BASE_URL
    for i, part in enumerate(parts, start=2):
        current_url += f"/{part}"
        name = part.replace('-', ' ').title()
        breadcrumbs.append({
            "position": i,
            "name": name,
            "item": current_url
        })

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", **item} for item in breadcrumbs
        ]
    }


def generate_meta_tags(config, url):
    """Generate complete meta tags for a page"""
    title = config.get("title", "CyberSmrt")
    description = config.get("description", "")
    keywords = config.get("keywords", "")

    og_image = config.get("image", DEFAULT_IMAGE)

    meta_html = f'''
    <!-- Primary Meta Tags -->
    <title>{html_lib.escape(title)}</title>
    <meta name="title" content="{html_lib.escape(title)}">
    <meta name="description" content="{html_lib.escape(description)}">
    <meta name="keywords" content="{html_lib.escape(keywords)}">
    <meta name="author" content="CyberSmrt">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <link rel="canonical" href="{url}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{url}">
    <meta property="og:title" content="{html_lib.escape(title)}">
    <meta property="og:description" content="{html_lib.escape(description)}">
    <meta property="og:image" content="{og_image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="{SITE_NAME}">
    <meta property="og:locale" content="en_US">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="{url}">
    <meta name="twitter:title" content="{html_lib.escape(title)}">
    <meta name="twitter:description" content="{html_lib.escape(description)}">
    <meta name="twitter:image" content="{og_image}">
    <meta name="twitter:site" content="{DEFAULT_TWITTER}">
    <meta name="twitter:creator" content="{DEFAULT_TWITTER}">

    <!-- Additional SEO -->
    <meta name="theme-color" content="#667eea">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    '''

    return meta_html.strip()


def enhance_html_file(file_path, base_dir):
    """Enhance a single HTML file with SEO improvements"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        soup = BeautifulSoup(content, 'html.parser')

        # Skip if already has comprehensive SEO (check for JSON-LD with @type NGO)
        existing_schemas = soup.find_all('script', type='application/ld+json')
        has_org_schema = any('NGO' in script.string for script in existing_schemas if script.string)

        # Get relative path for config lookup
        rel_path = str(file_path.relative_to(base_dir)).replace('\\', '/')

        # Get page config or use defaults
        config = PAGE_CONFIG.get(rel_path, {
            "title": soup.title.string if soup.title else "CyberSmrt",
            "description": soup.find('meta', attrs={'name': 'description'})['content'] if soup.find('meta', attrs={'name': 'description'}) else "",
            "keywords": "cybersecurity, education, nonprofit",
            "schema_type": "WebPage"
        })

        # Generate page URL
        page_url = f"{BASE_URL}/{rel_path}".replace('index.html', '').rstrip('/')

        # Only add schemas if not already present
        if not has_org_schema:
            # Add organization schema
            org_script = soup.new_tag('script', type='application/ld+json')
            org_script.string = json.dumps(ORG_SCHEMA, indent=2)

            # Add breadcrumb schema
            breadcrumb_script = soup.new_tag('script', type='application/ld+json')
            breadcrumb_script.string = json.dumps(generate_breadcrumb_schema(rel_path), indent=2)

            # Insert schemas before closing </head>
            if soup.head:
                soup.head.append(org_script)
                soup.head.append(breadcrumb_script)

        # Update or add meta tags (only if not comprehensive)
        if not soup.find('meta', attrs={'property': 'og:image:width'}):
            # Remove old meta tags
            for meta in soup.find_all('meta', attrs={'name': ['title', 'description', 'keywords']}):
                meta.decompose()
            for meta in soup.find_all('meta', attrs={'property': lambda x: x and x.startswith('og:')}):
                meta.decompose()
            for meta in soup.find_all('meta', attrs={'name': lambda x: x and x.startswith('twitter:')}):
                meta.decompose()

            # Add new comprehensive meta tags
            meta_html = generate_meta_tags(config, page_url)
            meta_soup = BeautifulSoup(meta_html, 'html.parser')

            if soup.head:
                # Insert after charset and viewport
                viewport = soup.find('meta', attrs={'name': 'viewport'})
                if viewport:
                    for tag in reversed(list(meta_soup.children)):
                        if tag.name:
                            viewport.insert_after(tag)

        # Write enhanced content back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(str(soup.prettify()))

        return True, rel_path

    except Exception as e:
        return False, f"{file_path}: {str(e)}"


def main():
    """Main execution function"""
    base_dir = Path(__file__).parent.parent
    print(f"🔍 Starting SEO enhancement for CyberSmrt website...")
    print(f"📁 Base directory: {base_dir}\n")

    # Find all HTML files (exclude admin, auth pages)
    exclude_patterns = ['admin', 'dashboard', 'login', 'register', 'callback', 'profile', 'settings', '2fa', 'test-']
    html_files = []

    for pattern in ['*.html', 'pages/**/*.html']:
        for file in base_dir.glob(pattern):
            if not any(excl in str(file) for excl in exclude_patterns):
                html_files.append(file)

    print(f"📄 Found {len(html_files)} HTML files to enhance\n")

    success_count = 0
    for file_path in html_files:
        success, result = enhance_html_file(file_path, base_dir)
        if success:
            print(f"✅ Enhanced: {result}")
            success_count += 1
        else:
            print(f"❌ Failed: {result}")

    print(f"\n🎉 Complete! Enhanced {success_count}/{len(html_files)} files")
    print(f"\n📊 Next steps:")
    print(f"  1. Test with Google Rich Results Test: https://search.google.com/test/rich-results")
    print(f"  2. Validate schemas: https://validator.schema.org/")
    print(f"  3. Check mobile-friendliness: https://search.google.com/test/mobile-friendly")
    print(f"  4. Run PageSpeed Insights: https://pagespeed.web.dev/")


if __name__ == "__main__":
    main()
