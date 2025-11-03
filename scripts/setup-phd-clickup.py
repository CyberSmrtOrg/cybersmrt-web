"""
ClickUp Ph.D. Research Space Setup Script
Creates the Partnership Development system for CyberSmrt's $1M fundraising campaign
and doctoral research documentation.
"""

import requests
import json
import time
import sys
import os

# Fix Windows console encoding for emoji support
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ClickUp API Configuration
API_KEY = os.getenv('CLICKUP_PERSONAL_TOKEN', 'pk_138096830_H7Z1UH3LE4E9QR8E598ZJQGPJZJYSC0D')
TEAM_ID = '90131177455'
BASE_URL = 'https://api.clickup.com/api/v2'

headers = {
    'Authorization': API_KEY,
    'Content-Type': 'application/json'
}

def create_space(name, description):
    """Create a new Space in ClickUp"""
    url = f'{BASE_URL}/team/{TEAM_ID}/space'
    data = {
        'name': name,
        'multiple_assignees': True,
        'features': {
            'due_dates': {'enabled': True, 'start_date': True, 'remap_due_dates': False, 'remap_closed_due_date': False},
            'time_tracking': {'enabled': True},
            'tags': {'enabled': True},
            'time_estimates': {'enabled': True},
            'checklists': {'enabled': True},
            'custom_fields': {'enabled': True},
            'remap_dependencies': {'enabled': False},
            'dependency_warning': {'enabled': True},
            'portfolios': {'enabled': True}
        }
    }

    response = requests.post(url, headers=headers, json=data)
    if response.status_code in [200, 201]:
        space = response.json()
        print(f"✅ Created Space: {name} (ID: {space['id']})")
        return space
    else:
        print(f"❌ Failed to create Space: {response.status_code} - {response.text}")
        return None

def create_folder(space_id, name):
    """Create a Folder within a Space"""
    url = f'{BASE_URL}/space/{space_id}/folder'
    data = {'name': name}

    response = requests.post(url, headers=headers, json=data)
    if response.status_code in [200, 201]:
        folder = response.json()
        print(f"✅ Created Folder: {name} (ID: {folder['id']})")
        return folder
    else:
        print(f"❌ Failed to create Folder: {response.status_code} - {response.text}")
        return None

def create_list(folder_id, name, statuses):
    """Create a List within a Folder"""
    url = f'{BASE_URL}/folder/{folder_id}/list'
    data = {
        'name': name,
        'content': '',
    }

    response = requests.post(url, headers=headers, json=data)
    if response.status_code in [200, 201]:
        list_obj = response.json()
        print(f"✅ Created List: {name} (ID: {list_obj['id']})")
        print(f"   ℹ️  Statuses to configure: {', '.join(statuses)}")

        return list_obj
    else:
        print(f"❌ Failed to create List: {response.status_code} - {response.text}")
        return None

def update_list_statuses(list_id, statuses):
    """Update the statuses for a list"""
    url = f'{BASE_URL}/list/{list_id}'

    # First, get current statuses to preserve their IDs if they exist
    get_response = requests.get(url, headers=headers)
    if get_response.status_code != 200:
        print(f"⚠️  Could not fetch current statuses for list {list_id}")
        return

    current_list = get_response.json()

    # Build new status array
    status_array = []
    for idx, status_name in enumerate(statuses):
        status_type = 'done' if '✅' in status_name or 'Secured' in status_name or 'Complete' in status_name or 'Synthesized' in status_name else \
                     'closed' if '❌' in status_name or 'Declined' in status_name or 'Ghosted' in status_name or 'Retired' in status_name else \
                     'custom'

        status_array.append({
            'status': status_name,
            'type': status_type,
            'orderindex': idx,
            'color': get_status_color(status_name)
        })

    # Update via PUT request (ClickUp requires specific format)
    # Note: ClickUp's status update is complex, so we'll use a simpler approach
    print(f"   ℹ️  Statuses for this list should be configured manually: {', '.join(statuses)}")

def get_status_color(status_name):
    """Return appropriate color for status"""
    status_colors = {
        'Identified': '#6fddff',
        'Outreach Planned': '#7ce8fe',
        'Initial Contact': '#a4fcfe',
        'Engaged': '#ffcc00',
        'Proposal Submitted': '#ff9900',
        'Under Review': '#ff6600',
        'Partnership Secured': '#6bc950',
        'Declined': '#f9375e',
        'Ghosted': '#d3d3d3',
        'On Hold': '#c3bef0',
        'Needs Analysis': '#a4fcfe',
        'In Progress': '#ffcc00',
        'Complete': '#6bc950',
        'Synthesized': '#02bcd4',
        'Active Version': '#6bc950',
        'Previous Version': '#d3d3d3',
        'Experiment': '#ffcc00',
        'Retired': '#f9375e'
    }
    return status_colors.get(status_name, '#d3d3d3')

def create_custom_field(list_id, field_config):
    """Create a custom field for a list"""
    url = f'{BASE_URL}/list/{list_id}/field'

    response = requests.post(url, headers=headers, json=field_config)
    if response.status_code in [200, 201]:
        field = response.json()
        print(f"   ✅ Created field: {field_config['name']}")
        return field
    else:
        print(f"   ⚠️  Field '{field_config['name']}' may already exist or failed: {response.status_code}")
        return None

def setup_pipeline_fields(list_id):
    """Create all custom fields for Partnership Pipeline list"""
    print(f"\n📋 Setting up custom fields for Partnership Pipeline...")

    fields = [
        # Organization Details
        {'name': 'Organization Name', 'type': 'text'},
        {'name': 'Organization Type', 'type': 'drop_down', 'type_config': {'options': [
            {'name': 'Corporate', 'color': '#ff6900'},
            {'name': 'Foundation', 'color': '#00c7e6'},
            {'name': 'Government', 'color': '#6fddff'},
            {'name': 'Academic', 'color': '#a4fcfe'},
            {'name': 'Other Nonprofit', 'color': '#c3bef0'}
        ]}},
        {'name': 'Industry/Sector', 'type': 'text'},
        {'name': 'Organization Size', 'type': 'drop_down', 'type_config': {'options': [
            {'name': '< 50', 'color': '#d3d3d3'},
            {'name': '50-500', 'color': '#a4fcfe'},
            {'name': '500-5K', 'color': '#00c7e6'},
            {'name': '5K-50K', 'color': '#ff6900'},
            {'name': '50K+', 'color': '#f9375e'}
        ]}},
        {'name': 'Website', 'type': 'url'},
        {'name': 'Primary Contact', 'type': 'text'},
        {'name': 'Contact Title', 'type': 'text'},
        {'name': 'Contact Email', 'type': 'email'},
        {'name': 'Contact LinkedIn', 'type': 'url'},

        # Partnership Details
        {'name': 'Partnership Type', 'type': 'drop_down', 'type_config': {'options': [
            {'name': 'Financial Sponsor', 'color': '#6bc950'},
            {'name': 'In-Kind Donation', 'color': '#00c7e6'},
            {'name': 'Technical Partnership', 'color': '#ff6900'},
            {'name': 'Advisory', 'color': '#c3bef0'},
            {'name': 'Marketing/Promotion', 'color': '#ffcc00'},
            {'name': 'Curriculum Partner', 'color': '#a4fcfe'}
        ]}},
        {'name': 'Ask Amount', 'type': 'currency'},
        {'name': 'Ask Description', 'type': 'text'},
        {'name': 'Potential Value', 'type': 'drop_down', 'type_config': {'options': [
            {'name': '$1K-10K', 'color': '#d3d3d3'},
            {'name': '$10K-50K', 'color': '#a4fcfe'},
            {'name': '$50K-100K', 'color': '#00c7e6'},
            {'name': '$100K-250K', 'color': '#ffcc00'},
            {'name': '$250K-500K', 'color': '#ff6900'},
            {'name': '$500K+', 'color': '#f9375e'}
        ]}},
        {'name': 'Strategic Fit Score', 'type': 'drop_down', 'type_config': {'options': [
            {'name': '1-Low', 'color': '#d3d3d3'},
            {'name': '2-Medium', 'color': '#a4fcfe'},
            {'name': '3-High', 'color': '#ffcc00'},
            {'name': '4-Critical', 'color': '#f9375e'}
        ]}},
        {'name': 'Decision Timeline', 'type': 'date'},

        # Engagement Tracking
        {'name': 'How We Found Them', 'type': 'drop_down', 'type_config': {'options': [
            {'name': 'Direct Research', 'color': '#00c7e6'},
            {'name': 'Referral', 'color': '#6bc950'},
            {'name': 'Existing Network', 'color': '#c3bef0'},
            {'name': 'Conference/Event', 'color': '#ffcc00'},
            {'name': 'Cold Outreach', 'color': '#ff6900'},
            {'name': 'They Found Us', 'color': '#a4fcfe'}
        ]}},
        {'name': 'Referral Source', 'type': 'text'},
        {'name': 'First Contact Date', 'type': 'date'},
        {'name': 'Last Activity Date', 'type': 'date'},
        {'name': 'Next Planned Action', 'type': 'text'},
        {'name': 'Next Action Due Date', 'type': 'date'},
        {'name': 'Total Touchpoints', 'type': 'number'},
        {'name': 'Meeting Count', 'type': 'number'},

        # Research/Analysis
        {'name': 'Why We Chose Them', 'type': 'text'},
        {'name': 'Their Stated Mission/Values', 'type': 'text'},
        {'name': 'Alignment Notes', 'type': 'text'},
        {'name': 'Decision Maker Profile', 'type': 'text'},
        {'name': 'Anticipated Objections', 'type': 'text'},
        {'name': 'Our Value Proposition to Them', 'type': 'text'},

        # Outcome Tracking
        {'name': 'Final Outcome', 'type': 'drop_down', 'type_config': {'options': [
            {'name': 'Accepted', 'color': '#6bc950'},
            {'name': 'Declined - Stated Reason', 'color': '#f9375e'},
            {'name': 'Declined - Suspected Reason', 'color': '#ff6900'},
            {'name': 'Ghosted', 'color': '#d3d3d3'},
            {'name': 'Withdrawn by Us', 'color': '#c3bef0'}
        ]}},
        {'name': 'Outcome Date', 'type': 'date'},
        {'name': 'Lessons Learned', 'type': 'text'}
    ]

    for field in fields:
        time.sleep(0.3)  # Rate limiting
        create_custom_field(list_id, field)

def setup_outcomes_fields(list_id):
    """Create all custom fields for Partnership Outcomes Analysis list"""
    print(f"\n📊 Setting up custom fields for Outcomes Analysis...")

    fields = [
        # Basic Info
        {'name': 'Organization Name', 'type': 'text'},
        {'name': 'Partnership Type', 'type': 'drop_down', 'type_config': {'options': [
            {'name': 'Financial Sponsor', 'color': '#6bc950'},
            {'name': 'In-Kind Donation', 'color': '#00c7e6'},
            {'name': 'Technical Partnership', 'color': '#ff6900'},
            {'name': 'Advisory', 'color': '#c3bef0'},
            {'name': 'Marketing/Promotion', 'color': '#ffcc00'},
            {'name': 'Curriculum Partner', 'color': '#a4fcfe'}
        ]}},
        {'name': 'Outcome', 'type': 'drop_down', 'type_config': {'options': [
            {'name': 'Secured', 'color': '#6bc950'},
            {'name': 'Declined', 'color': '#f9375e'},
            {'name': 'Ghosted', 'color': '#d3d3d3'}
        ]}},
        {'name': 'Outcome Date', 'type': 'date'},
        {'name': 'Financial Value', 'type': 'currency'},

        # For SECURED partnerships
        {'name': 'Why They Said Yes - Stated', 'type': 'text'},
        {'name': 'Why They Said Yes - Our Analysis', 'type': 'text'},
        {'name': 'What Sealed the Deal', 'type': 'text'},
        {'name': 'Relationship Quality', 'type': 'drop_down', 'type_config': {'options': [
            {'name': 'Transactional', 'color': '#d3d3d3'},
            {'name': 'Professional', 'color': '#a4fcfe'},
            {'name': 'Collaborative', 'color': '#00c7e6'},
            {'name': 'Strategic Alliance', 'color': '#6bc950'}
        ]}},
        {'name': 'Their Expectations', 'type': 'text'},
        {'name': 'Ongoing Management Notes', 'type': 'text'},

        # For DECLINED partnerships
        {'name': 'Official Reason Given', 'type': 'text'},
        {'name': 'Suspected Real Reason', 'type': 'text'},
        {'name': 'Red Flags We Missed', 'type': 'text'},
        {'name': 'What We Could Have Done Differently', 'type': 'text'},
        {'name': 'Timing Issues', 'type': 'checkbox'},
        {'name': 'Budget/Priority Mismatch', 'type': 'checkbox'},
        {'name': 'Mission Misalignment', 'type': 'checkbox'},
        {'name': 'Risk Aversion', 'type': 'checkbox'},
        {'name': 'Already Committed Elsewhere', 'type': 'checkbox'},
        {'name': 'Don\'t See Our Value', 'type': 'checkbox'},
        {'name': 'Internal Politics/Bureaucracy', 'type': 'checkbox'},

        # For GHOSTED
        {'name': 'Last Contact Date', 'type': 'date'},
        {'name': 'Follow-up Attempts', 'type': 'number'},
        {'name': 'What We Think Happened', 'type': 'text'},
        {'name': 'Ghosting Pattern Analysis', 'type': 'text'},

        # Research Insights
        {'name': 'Key Learnings', 'type': 'text'},
        {'name': 'Application to Future Partnerships', 'type': 'text'},
        {'name': 'Quotes Worth Capturing', 'type': 'text'}
    ]

    for field in fields:
        time.sleep(0.3)
        create_custom_field(list_id, field)

def setup_pitch_fields(list_id):
    """Create all custom fields for Pitch Evolution Log list"""
    print(f"\n🎯 Setting up custom fields for Pitch Evolution...")

    fields = [
        # Version Info
        {'name': 'Version Number', 'type': 'text'},
        {'name': 'Version Name', 'type': 'text'},
        {'name': 'Date Created', 'type': 'date'},
        {'name': 'Date Retired', 'type': 'date'},
        {'name': 'Target Audience', 'type': 'drop_down', 'type_config': {'options': [
            {'name': 'Corporate', 'color': '#ff6900'},
            {'name': 'Foundation', 'color': '#00c7e6'},
            {'name': 'Government', 'color': '#6fddff'},
            {'name': 'Tech Companies', 'color': '#c3bef0'},
            {'name': 'Financial Services', 'color': '#ffcc00'},
            {'name': 'Other', 'color': '#d3d3d3'}
        ]}},

        # Pitch Components
        {'name': 'Core Message', 'type': 'text'},
        {'name': 'Problem Statement', 'type': 'text'},
        {'name': 'Solution Description', 'type': 'text'},
        {'name': 'Value Proposition', 'type': 'text'},
        {'name': 'Call to Action', 'type': 'text'},
        {'name': 'Supporting Data Points', 'type': 'text'},

        # Performance Tracking
        {'name': 'Times Used', 'type': 'number'},
        {'name': 'Meetings Secured', 'type': 'number'},
        {'name': 'Partnerships Secured', 'type': 'number'},
        {'name': 'Average Time to Decision (Days)', 'type': 'number'},

        # Evolution Notes
        {'name': 'What Changed from Previous', 'type': 'text'},
        {'name': 'Why We Changed It', 'type': 'text'},
        {'name': 'Hypothesis', 'type': 'text'},
        {'name': 'Testing Results', 'type': 'text'},
        {'name': 'Email Template', 'type': 'text'},
        {'name': 'Elevator Pitch (30 sec)', 'type': 'text'},
        {'name': '2-Minute Pitch', 'type': 'text'},
        {'name': '10-Minute Outline', 'type': 'text'}
    ]

    for field in fields:
        time.sleep(0.3)
        create_custom_field(list_id, field)

def find_space_by_name(name):
    """Find a space by name"""
    url = f'{BASE_URL}/team/{TEAM_ID}/space'
    response = requests.get(url, headers=headers, params={'archived': 'false'})

    if response.status_code == 200:
        spaces = response.json().get('spaces', [])
        for space in spaces:
            if space['name'] == name:
                print(f"ℹ️  Found existing Space: {name} (ID: {space['id']})")
                return space
    return None

def find_folder_by_name(space_id, name):
    """Find a folder by name in a space"""
    url = f'{BASE_URL}/space/{space_id}/folder'
    response = requests.get(url, headers=headers, params={'archived': 'false'})

    if response.status_code == 200:
        folders = response.json().get('folders', [])
        for folder in folders:
            if folder['name'] == name:
                print(f"ℹ️  Found existing Folder: {name} (ID: {folder['id']})")
                return folder
    return None

def main():
    print("🚀 Setting up Ph.D. Research ClickUp Space for CyberSmrt Partnership Development\n")

    # Step 1: Find or Create Space
    space_name = "Ph.D. Research - CyberSmrt Case Study"
    space = find_space_by_name(space_name)

    if not space:
        space = create_space(
            space_name,
            "Doctoral research on nonprofit cyber leadership - Partnership development for $1M fundraising campaign"
        )

    if not space:
        print("\n❌ Failed to get/create space. Exiting.")
        return

    time.sleep(1)

    # Step 2: Find or Create Folder
    folder_name = "Partnership Development"
    folder = find_folder_by_name(space['id'], folder_name)

    if not folder:
        folder = create_folder(space['id'], folder_name)

    if not folder:
        print("\n❌ Failed to get/create folder. Exiting.")
        return

    time.sleep(1)

    # Step 3: Create Lists
    print("\n📁 Creating lists...")

    pipeline_statuses = [
        'Identified',
        'Outreach Planned',
        'Initial Contact',
        'Engaged',
        'Proposal Submitted',
        'Under Review',
        '✅ Partnership Secured',
        '❌ Declined',
        '🤷 Ghosted',
        '⏸️ On Hold'
    ]

    pipeline_list = create_list(folder['id'], "Partnership Pipeline", pipeline_statuses)
    time.sleep(1)

    outcomes_statuses = [
        'Needs Analysis',
        'In Progress',
        'Complete',
        'Synthesized'
    ]

    outcomes_list = create_list(folder['id'], "Partnership Outcomes Analysis", outcomes_statuses)
    time.sleep(1)

    pitch_statuses = [
        'Active Version',
        'Previous Version',
        'Experiment',
        'Retired'
    ]

    pitch_list = create_list(folder['id'], "Pitch Evolution Log", pitch_statuses)
    time.sleep(1)

    # Step 4: Create Custom Fields
    if pipeline_list:
        setup_pipeline_fields(pipeline_list['id'])

    if outcomes_list:
        setup_outcomes_fields(outcomes_list['id'])

    if pitch_list:
        setup_pitch_fields(pitch_list['id'])

    # Final Summary
    print("\n" + "="*60)
    print("✅ Ph.D. Research Space Setup Complete!")
    print("="*60)
    print(f"\nSpace ID: {space['id']}")
    print(f"Folder ID: {folder['id']}")
    if pipeline_list:
        print(f"Partnership Pipeline List ID: {pipeline_list['id']}")
    if outcomes_list:
        print(f"Outcomes Analysis List ID: {outcomes_list['id']}")
    if pitch_list:
        print(f"Pitch Evolution List ID: {pitch_list['id']}")

    print("\n📝 Next Steps:")
    print("1. Review the lists in ClickUp and adjust statuses as needed")
    print("2. Create task templates for each list")
    print("3. Set up dashboard views (Active Pipeline, High-Value Prospects, etc.)")
    print("4. Configure automations for status changes")
    print("5. Start adding your current partnership prospects!")

    print("\n🎓 Research Tips:")
    print("- Capture verbatim quotes from key conversations")
    print("- Note emotional tone and gut feelings")
    print("- Document surprises and pattern violations")
    print("- Weekly reflection on leadership insights")

    print("\n🚀 Ready to track your $1M fundraising campaign!")

if __name__ == "__main__":
    main()
