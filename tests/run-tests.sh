#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RESULTS_DIR="$SCRIPT_DIR/results"

# Create results directory if it doesn't exist
mkdir -p "$RESULTS_DIR"

echo -e "${CYAN}=================================="
echo "🔒 CyberSmrt Load Test Runner"
echo -e "==================================${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed!${NC}"
    echo "Install k6 from: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo -e "${GREEN}✅ k6 is installed${NC}"
echo ""

# Select test type
echo -e "${CYAN}Select Test Type:${NC}"
echo "1) Normal Load (default settings)"
echo "2) Burst Traffic (spike test)"
echo "3) DDoS Simulation (stress test)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        TEST_NAME="normal-load"
        TEST_FILE="$SCRIPT_DIR/load-test.js"
        echo -e "${GREEN}Running Normal Load Test...${NC}"
        ;;
    2)
        TEST_NAME="burst-traffic"
        TEST_FILE="$SCRIPT_DIR/load-test.js"
        echo -e "${YELLOW}Running Burst Traffic Test...${NC}"
        # Modify test file to use burst options
        sed -i.bak 's/export let options = normalLoadOptions;/export let options = burstTrafficOptions;/' "$TEST_FILE"
        ;;
    3)
        TEST_NAME="ddos-simulation"
        TEST_FILE="$SCRIPT_DIR/load-test.js"
        echo -e "${RED}Running DDoS Simulation Test...${NC}"
        # Modify test file to use DDoS options
        sed -i.bak 's/export let options = normalLoadOptions;/export let options = ddosSimulationOptions;/' "$TEST_FILE"
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

# Check if test file exists
if [ ! -f "$TEST_FILE" ]; then
    echo -e "${RED}❌ Test file not found: $TEST_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}==================================${NC}"
echo -e "${YELLOW}Starting Test: $TEST_NAME${NC}"
echo -e "${CYAN}==================================${NC}"
echo ""

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Output files
JSON_OUTPUT="$RESULTS_DIR/${TEST_NAME}_${TIMESTAMP}.json"
SUMMARY_OUTPUT="$RESULTS_DIR/${TEST_NAME}_${TIMESTAMP}_summary.json"

echo -e "${YELLOW}Results will be saved to:${NC}"
echo -e "  - $JSON_OUTPUT"
echo -e "  - $SUMMARY_OUTPUT"
echo ""

# Run k6 test with JSON output
k6 run "$TEST_FILE" --out "json=$JSON_OUTPUT" --summary-export="$SUMMARY_OUTPUT"

# Restore original test file if modified
if [ "$choice" == "2" ] || [ "$choice" == "3" ]; then
    echo ""
    echo -e "${YELLOW}Restoring original test configuration...${NC}"
    sed -i.bak 's/export let options = \(burstTrafficOptions\|ddosSimulationOptions\);/export let options = normalLoadOptions;/' "$TEST_FILE"
    rm -f "${TEST_FILE}.bak"
fi

echo ""
echo -e "${CYAN}=================================="
echo -e "${YELLOW}Parsing Results...${NC}"
echo -e "${CYAN}==================================${NC}"

# Parse the summary JSON file
if [ -f "$SUMMARY_OUTPUT" ]; then
    # Check if jq is available
    if command -v jq &> /dev/null; then
        # Extract metrics using jq (matching actual k6 JSON structure)
        AVG_RESPONSE=$(jq -r '.metrics.http_req_duration.avg' "$SUMMARY_OUTPUT" 2>/dev/null | awk '{printf "%.2f", $1}')
        P95_RESPONSE=$(jq -r '.metrics.http_req_duration["p(95)"]' "$SUMMARY_OUTPUT" 2>/dev/null | awk '{printf "%.2f", $1}')
        RATE_LIMITS=$(jq -r '.metrics.rate_limit_hits.count // 0' "$SUMMARY_OUTPUT" 2>/dev/null)
        SSRF_BLOCKS=$(jq -r '.metrics.ssrf_blocks.count // 0' "$SUMMARY_OUTPUT" 2>/dev/null)
    else
        # Fallback: manual parsing (less reliable)
        echo -e "${YELLOW}⚠️  jq not found. Install jq for better parsing: https://jqlang.github.io/jq/${NC}"
        AVG_RESPONSE=$(grep -o '"avg":[0-9.]*' "$SUMMARY_OUTPUT" | head -1 | cut -d':' -f2)
        P95_RESPONSE=$(grep -o '"p(95)":[0-9.]*' "$SUMMARY_OUTPUT" | head -1 | cut -d':' -f2)
        RATE_LIMITS=0
        SSRF_BLOCKS=0
    fi

    # Get current date
    DATE=$(date +"%Y-%m-%d")

    # Prompt for notes
    echo ""
    read -p "Add notes for this test run (or press Enter to skip): " NOTES
    if [ -z "$NOTES" ]; then
        NOTES="$TEST_NAME"
    fi

    # Format values with proper column widths for alignment
    # Column widths: Date(10) | Avg Response(12) | p95 Response(12) | Rate Limits(11) | SSRF Blocks(11) | Notes
    NEW_ROW=$(printf "| %-10s | %-12s | %-12s | %-11s | %-11s | %-11s |" \
        "$DATE" \
        "${AVG_RESPONSE}ms" \
        "${P95_RESPONSE}ms" \
        "$RATE_LIMITS" \
        "$SSRF_BLOCKS" \
        "$NOTES")

    # Path to HISTORY.md
    HISTORY_FILE="$SCRIPT_DIR/HISTORY.md"

    # Create HISTORY.md if it doesn't exist
    if [ ! -f "$HISTORY_FILE" ]; then
        echo -e "${YELLOW}Creating HISTORY.md...${NC}"
        cat > "$HISTORY_FILE" << 'EOF'
# Load Test History

## Test Results Over Time

Track performance trends and identify degradation early.

### How to Read This Table
- **Avg Response**: Mean response time across all requests
- **p95 Response**: 95th percentile - 95% of requests were faster than this
- **Rate Limits**: Number of requests blocked by rate limiting (expected in tests)
- **SSRF Blocks**: Number of malicious requests prevented (expected in tests)
- **Notes**: Test type or observations

### Alert Thresholds
🔴 **Action Required:**
- Avg Response > 100ms
- p95 Response > 500ms
- Unexpected drop in security blocks (indicates test failure)

🟡 **Monitor:**
- Avg Response > 75ms
- p95 Response > 400ms

---

## Results

| Date       | Avg Response | p95 Response | Rate Limits | SSRF Blocks | Notes       |
|------------|--------------|--------------|-------------|-------------|-------------|
EOF
    fi

    # Append the new row
    echo "$NEW_ROW" >> "$HISTORY_FILE"

    echo ""
    echo -e "${GREEN}✅ Results logged to HISTORY.md${NC}"
    echo -e "   Avg Response: ${AVG_RESPONSE}ms"
    echo -e "   p95 Response: ${P95_RESPONSE}ms"
    echo -e "   Rate Limits: $RATE_LIMITS"
    echo -e "   SSRF Blocks: $SSRF_BLOCKS"
else
    echo -e "${YELLOW}⚠️  Summary file not found: $SUMMARY_OUTPUT${NC}"
fi

echo ""
echo -e "${CYAN}=================================="
echo -e "${GREEN}Test Complete!${NC}"
echo -e "${CYAN}==================================${NC}"
echo -e "${YELLOW}Results saved to: $RESULTS_DIR${NC}"
echo ""

# Open results folder
read -p "Open results folder? (y/n): " OPEN_FOLDER
if [ "$OPEN_FOLDER" == "y" ]; then
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows (Git Bash) - Convert to Windows path format
        WIN_PATH=$(echo "$RESULTS_DIR" | sed 's|^/c/|C:/|' | sed 's|/|\\|g')
        explorer.exe "$WIN_PATH"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$RESULTS_DIR"
    else
        # Linux
        xdg-open "$RESULTS_DIR" 2>/dev/null || echo "Please open: $RESULTS_DIR"
    fi
fi