#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Add SEO Improvement task with subtasks to ClickUp
"""

import os
import sys
import requests
import time

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ClickUp Configuration
API_KEY = os.getenv("CLICKUP_PERSONAL_TOKEN", "pk_138096830_H7Z1UH3LE4E9QR8E598ZJQGPJZJYSC0D")
BASE_URL = "https://api.clickup.com/api/v2"
TEAM_ID = "90131177455"

# Find the cybersmrt-web Project list in Technology & Infrastructure space
SPACE_NAME = "TECHNOLOGY & INFRASTRUCTURE"
LIST_NAME = "cybersmrt-web Project"

headers = {
    "Authorization": API_KEY,
    "Content-Type": "application/json"
}

def api_request(method, endpoint, data=None):
    """Make API request with rate limiting"""
    url = f"{BASE_URL}/{endpoint}"
    time.sleep(0.5)  # Rate limiting

    if method == "GET":
        response = requests.get(url, headers=headers)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data)
    elif method == "PUT":
        response = requests.put(url, headers=headers, json=data)

    if response.status_code in [200, 201]:
        return True, response.json()
    else:
        return False, response.text

def find_list_id():
    """Find the cybersmrt-web Project list ID"""
    print("🔍 Finding Technology & Infrastructure space...")

    # Get all spaces
    success, spaces_data = api_request("GET", f"team/{TEAM_ID}/space")
    if not success:
        print(f"❌ Failed to get spaces: {spaces_data}")
        return None

    # Find Technology space
    tech_space = None
    for space in spaces_data.get("spaces", []):
        if "TECHNOLOGY" in space["name"].upper():
            tech_space = space
            print(f"✅ Found space: {space['name']} (ID: {space['id']})")
            break

    if not tech_space:
        print("❌ Technology & Infrastructure space not found")
        return None

    # Get lists in the space
    success, lists_data = api_request("GET", f"space/{tech_space['id']}/list")
    if not success:
        print(f"❌ Failed to get lists: {lists_data}")
        return None

    # Find cybersmrt-web Project list
    for lst in lists_data.get("lists", []):
        if "cybersmrt-web" in lst["name"].lower():
            print(f"✅ Found list: {lst['name']} (ID: {lst['id']})")
            return lst["id"]

    print("❌ cybersmrt-web Project list not found")
    return None

def create_seo_task(list_id):
    """Create SEO Improvement parent task with subtasks"""

    # Main task data
    main_task_data = {
        "name": "SEO Improvement - Comprehensive Implementation",
        "description": """Complete implementation of SEO enhancements for CyberSmrt website.

**Goal:** Improve discoverability for grant-making foundations, K-12 educators, and donors.

**Documentation:**
- Full Audit: docs/SEO_AUDIT_AND_IMPLEMENTATION.md
- Maintenance Guide: docs/README_SEO.md
- Schema Library: assets/js/seo-schemas.js

**Target Impact:**
- 3-month: 50% organic traffic increase
- 6-month: Top 3 for 10 target keywords
- 12-month: #1 for "free cybersecurity education nonprofit"

**Priority Order:** Week 1 (Critical) → Week 2 (High Impact) → Week 3 (Content) → Week 4 (Technical)
""",
        "status": "to do",
        "priority": 2,  # High priority
        "tags": ["seo", "marketing", "nonprofit", "visibility"]
    }

    print("\n📝 Creating main SEO Improvement task...")
    success, task_response = api_request("POST", f"list/{list_id}/task", main_task_data)

    if not success:
        print(f"❌ Failed to create main task: {task_response}")
        return False

    parent_task_id = task_response["id"]
    print(f"✅ Created main task: {task_response['name']} (ID: {parent_task_id})")

    # Subtasks for Week 1 - Critical
    week1_subtasks = [
        {
            "name": "Apply schema/meta enhancements to About page",
            "description": "Add AboutPage + Organization schema, update meta tags for /pages/about/index.html"
        },
        {
            "name": "Apply schema/meta enhancements to K-12 Curriculum page",
            "description": "Add Course schema, expand content from placeholder to 800+ words, update meta tags for /pages/programs/k12-curriculum.html"
        },
        {
            "name": "Apply schema/meta enhancements to Donate page",
            "description": "Add DonateAction schema, optimize donation messaging for /pages/get-involved/donate.html"
        },
        {
            "name": "Apply schema/meta enhancements to Volunteer page",
            "description": "Add VolunteerAction schema, highlight opportunities for /pages/get-involved/volunteer.html"
        }
    ]

    # Subtasks for Week 2 - High Impact
    week2_subtasks = [
        {
            "name": "Set up Google Search Console",
            "description": "Verify ownership, submit sitemap.xml, enable rich results monitoring. URL: https://search.google.com/search-console"
        },
        {
            "name": "Set up Google Analytics 4",
            "description": "Track organic traffic, monitor conversions (donations, tool usage), set up goals"
        },
        {
            "name": "Add breadcrumb schema to all pages",
            "description": "Implement breadcrumb JSON-LD on all pages except homepage using schema library"
        }
    ]

    # Subtasks for Week 3 - Content
    week3_subtasks = [
        {
            "name": "Expand K-12 curriculum page content to 800+ words",
            "description": "Transform from placeholder to comprehensive content with features, benefits, standards alignment"
        },
        {
            "name": "Add FAQ schema to About page",
            "description": "Create FAQ section answering: Is CyberSmrt free? Who founded it? What's our mission? Add FAQPage schema"
        },
        {
            "name": "Create 'For Educators' landing page",
            "description": "Dedicated page targeting K-12 educators with curriculum details, implementation guide, testimonials"
        },
        {
            "name": "Create 'For Donors' landing page",
            "description": "Dedicated page for foundations/sponsors highlighting 501(c)(3), impact metrics, donation options"
        }
    ]

    # Subtasks for Week 4 - Technical
    week4_subtasks = [
        {
            "name": "Convert key images to WebP format",
            "description": "Convert hero images, tool screenshots to WebP with JPEG fallback for better performance"
        },
        {
            "name": "Implement lazy loading on all images",
            "description": "Add loading='lazy' attribute to all img tags site-wide"
        },
        {
            "name": "Add width/height to all images",
            "description": "Prevent Cumulative Layout Shift (CLS) by adding explicit dimensions to all images"
        },
        {
            "name": "Audit and fix all image alt text",
            "description": "Ensure all images have descriptive alt text (not generic or empty)"
        }
    ]

    all_subtasks = (
        week1_subtasks + week2_subtasks + week3_subtasks + week4_subtasks
    )

    print(f"\n📋 Creating {len(all_subtasks)} subtasks...")
    created_count = 0

    for i, subtask_data in enumerate(all_subtasks, 1):
        subtask_payload = {
            "name": subtask_data["name"],
            "description": subtask_data["description"],
            "parent": parent_task_id,
            "status": "to do"
        }

        success, subtask_response = api_request("POST", f"list/{list_id}/task", subtask_payload)

        if success:
            print(f"  ✅ [{i}/{len(all_subtasks)}] {subtask_data['name']}")
            created_count += 1
        else:
            print(f"  ❌ [{i}/{len(all_subtasks)}] Failed: {subtask_data['name']}")

    print(f"\n🎉 Complete! Created 1 parent task + {created_count}/{len(all_subtasks)} subtasks")
    return True

def main():
    print("=" * 80)
    print("SEO IMPROVEMENT TASK CREATOR FOR CLICKUP")
    print("=" * 80)

    # Find the list
    list_id = find_list_id()
    if not list_id:
        print("\n❌ Could not find cybersmrt-web Project list")
        return

    # Create the task with subtasks
    success = create_seo_task(list_id)

    if success:
        print("\n✅ SEO Improvement task successfully added to ClickUp!")
        print("\n📊 Next steps:")
        print("  1. Open ClickUp and navigate to Technology & Infrastructure > cybersmrt-web Project")
        print("  2. Find 'SEO Improvement - Comprehensive Implementation' task")
        print("  3. Expand to see all subtasks organized by week")
        print("  4. Start with Week 1 (Critical) subtasks")
        print("\n📖 Documentation:")
        print("  - Full Audit: docs/SEO_AUDIT_AND_IMPLEMENTATION.md")
        print("  - Maintenance: docs/README_SEO.md")
    else:
        print("\n❌ Failed to create SEO Improvement task")

if __name__ == "__main__":
    main()
