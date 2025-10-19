#!/bin/bash
# QR Proxy Worker Test Suite
# Tests all endpoints and functionality

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${BASE_URL:-https://cybersmrt.org}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_test() {
    echo -e "${BLUE}🧪 TEST: $1${NC}"
    ((TESTS_RUN++))
}

pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN: $1${NC}"
}

# Test 1: Health Check
test_health_check() {
    log_test "Health Check Endpoint"

    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tools/qr_proxy/health")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$status" = "ok" ]; then
            pass "Health check returned OK status"
        else
            fail "Health check returned status: $status"
        fi
    else
        fail "Health check returned HTTP $http_code"
    fi
}

# Test 2: Safe URL Analysis
test_safe_url() {
    log_test "Safe URL Analysis (example.com)"

    encoded_url=$(printf %s "https://example.com" | jq -sRr @uri)
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tools/qr_proxy?url=$encoded_url&analysis_only=true")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        blocked=$(echo "$body" | grep -o '"blocked":[^,]*' | cut -d':' -f2)
        if [ "$blocked" = "false" ]; then
            pass "Safe URL correctly identified as not blocked"
        else
            fail "Safe URL incorrectly blocked"
        fi
    else
        fail "Analysis returned HTTP $http_code"
    fi
}

# Test 3: Suspicious URL Detection
test_suspicious_url() {
    log_test "Suspicious URL Detection (phishing keywords)"

    # URL with phishing keywords
    encoded_url=$(printf %s "https://verify-account-login-urgent.tk" | jq -sRr @uri)
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tools/qr_proxy?url=$encoded_url&analysis_only=true")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "403" ]; then
        threat_score=$(echo "$body" | grep -o '"threatScore":[0-9]*' | cut -d':' -f2)
        if [ -n "$threat_score" ] && [ "$threat_score" -gt 20 ]; then
            pass "Suspicious URL detected with threat score: $threat_score"
        else
            warn "Threat score lower than expected: $threat_score"
        fi
    else
        fail "Analysis returned unexpected HTTP $http_code"
    fi
}

# Test 4: Invalid URL Handling
test_invalid_url() {
    log_test "Invalid URL Handling"

    encoded_url=$(printf %s "not-a-valid-url" | jq -sRr @uri)
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tools/qr_proxy?url=$encoded_url&analysis_only=true")
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "400" ]; then
        pass "Invalid URL correctly rejected with HTTP 400"
    else
        fail "Invalid URL returned HTTP $http_code (expected 400)"
    fi
}

# Test 5: Missing URL Parameter
test_missing_url() {
    log_test "Missing URL Parameter"

    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tools/qr_proxy?analysis_only=true")
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "400" ]; then
        pass "Missing URL correctly rejected with HTTP 400"
    else
        fail "Missing URL returned HTTP $http_code (expected 400)"
    fi
}

# Test 6: Private IP Blocking
test_private_ip() {
    log_test "Private IP Address Blocking"

    encoded_url=$(printf %s "http://192.168.1.1" | jq -sRr @uri)
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tools/qr_proxy?url=$encoded_url&analysis_only=true")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "403" ]; then
        pass "Private IP correctly blocked"
    else
        blocked=$(echo "$body" | grep -o '"blocked":[^,]*' | cut -d':' -f2)
        if [ "$blocked" = "true" ]; then
            pass "Private IP blocked in response"
        else
            fail "Private IP not blocked (HTTP $http_code)"
        fi
    fi
}

# Test 7: Localhost Blocking
test_localhost() {
    log_test "Localhost Blocking"

    encoded_url=$(printf %s "http://localhost:8080" | jq -sRr @uri)
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/tools/qr_proxy?url=$encoded_url&analysis_only=true")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "403" ]; then
        pass "Localhost correctly blocked"
    else
        blocked=$(echo "$body" | grep -o '"blocked":[^,]*' | cut -d':' -f2)
        if [ "$blocked" = "true" ]; then
            pass "Localhost blocked in response"
        else
            fail "Localhost not blocked (HTTP $http_code)"
        fi
    fi
}

# Test 8: CORS Headers
test_cors_headers() {
    log_test "CORS Headers"

    response=$(curl -s -I "$BASE_URL/tools/qr_proxy/health")

    if echo "$response" | grep -qi "Access-Control-Allow-Origin"; then
        pass "CORS headers present"
    else
        fail "CORS headers missing"
    fi
}

# Test 9: Admin Endpoint (if token provided)
test_admin_endpoint() {
    if [ -z "$ADMIN_TOKEN" ]; then
        warn "Skipping admin tests - ADMIN_TOKEN not set"
        return
    fi

    log_test "Admin Block Endpoint"

    response=$(curl -s -w "\n%{http_code}" \
        -X POST "$BASE_URL/tools/qr_proxy/block" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"domain":"test-malicious.com","reason":"Test block"}')

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        pass "Admin block endpoint accessible"
    else
        fail "Admin endpoint returned HTTP $http_code"
    fi
}

# Test 10: Admin Auth Failure
test_admin_auth_failure() {
    log_test "Admin Endpoint Authentication"

    response=$(curl -s -w "\n%{http_code}" \
        -X POST "$BASE_URL/tools/qr_proxy/block" \
        -H "Authorization: Bearer invalid-token" \
        -H "Content-Type: application/json" \
        -d '{"domain":"test.com","reason":"Test"}')

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "401" ]; then
        pass "Unauthorized access correctly rejected"
    else
        fail "Expected HTTP 401, got $http_code"
    fi
}

# Test 11: URL Shortener Detection
test_url_shortener() {
    log_test "URL Shortener Detection"

    encoded_url=$(printf %s "https://bit.ly/test123" | jq -sRr @uri)
    response=$(curl -s "$BASE_URL/tools/qr_proxy?url=$encoded_url&analysis_only=true")

    if echo "$response" | grep -q "URL shortener"; then
        pass "URL shortener detected in analysis"
    else
        warn "URL shortener not flagged in checks"
    fi
}

# Test 12: Suspicious TLD Detection
test_suspicious_tld() {
    log_test "Suspicious TLD Detection"

    encoded_url=$(printf %s "https://example.tk" | jq -sRr @uri)
    response=$(curl -s "$BASE_URL/tools/qr_proxy?url=$encoded_url&analysis_only=true")

    if echo "$response" | grep -q "suspicious"; then
        pass "Suspicious TLD detected"
    else
        warn "Suspicious TLD (.tk) not flagged"
    fi
}

# Main test runner
main() {
    echo "================================"
    echo "QR Proxy Worker Test Suite"
    echo "================================"
    echo "Base URL: $BASE_URL"
    echo "Admin Token: ${ADMIN_TOKEN:+[SET]}${ADMIN_TOKEN:-[NOT SET]}"
    echo ""

    # Check dependencies
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}Error: curl not found${NC}"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq not found - some tests may fail${NC}"
    fi

    # Run tests
    test_health_check
    test_safe_url
    test_suspicious_url
    test_invalid_url
    test_missing_url
    test_private_ip
    test_localhost
    test_cors_headers
    test_admin_endpoint
    test_admin_auth_failure
    test_url_shortener
    test_suspicious_tld

    # Summary
    echo ""
    echo "================================"
    echo "Test Summary"
    echo "================================"
    echo -e "Tests Run:    ${BLUE}$TESTS_RUN${NC}"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

# Run tests
main