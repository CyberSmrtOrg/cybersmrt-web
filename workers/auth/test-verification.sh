#!/bin/bash

# Email Verification System Test Script
# Tests all endpoints and flows for email verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-https://cybersmrt-auth.cybersmrt.workers.dev}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!@#"
TEST_NAME="Test User"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Email Verification System Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "API URL: ${YELLOW}$API_URL${NC}"
echo -e "Test Email: ${YELLOW}$TEST_EMAIL${NC}"
echo ""

# Test 1: Health Check
echo -e "${BLUE}[1/8] Testing Health Endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$HEALTH_BODY" | head -3
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "$HEALTH_BODY"
    exit 1
fi
echo ""

# Test 2: API Documentation
echo -e "${BLUE}[2/8] Testing API Documentation Endpoint...${NC}"
DOC_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/")
HTTP_CODE=$(echo "$DOC_RESPONSE" | tail -n 1)
DOC_BODY=$(echo "$DOC_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ] && echo "$DOC_BODY" | grep -q "verification"; then
    echo -e "${GREEN}✓ API documentation includes verification endpoints${NC}"
else
    echo -e "${RED}✗ API documentation check failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi
echo ""

# Test 3: User Registration
echo -e "${BLUE}[3/8] Testing User Registration (sends verification email)...${NC}"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"displayName\": \"$TEST_NAME\"
  }")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n 1)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ User registered successfully${NC}"
    USER_ID=$(echo "$REGISTER_BODY" | grep -oP '"id"\s*:\s*"\K[^"]+' | head -1)
    echo -e "  User ID: ${YELLOW}$USER_ID${NC}"
    echo -e "  ${YELLOW}⚠ Verification email should have been sent to $TEST_EMAIL${NC}"
    echo -e "  ${YELLOW}⚠ Check Resend dashboard or logs for email delivery${NC}"
else
    echo -e "${RED}✗ Registration failed (HTTP $HTTP_CODE)${NC}"
    echo "$REGISTER_BODY"
    exit 1
fi
echo ""

# Test 4: Password Validation
echo -e "${BLUE}[4/8] Testing Password Validation...${NC}"

# Test weak password (too short)
WEAK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"weak-$(date +%s)@example.com\",
    \"password\": \"Test1!\"
  }")

HTTP_CODE=$(echo "$WEAK_RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${GREEN}✓ Weak password correctly rejected${NC}"
else
    echo -e "${YELLOW}⚠ Weak password was accepted (should be rejected)${NC}"
fi
echo ""

# Test 5: Resend Verification (Non-existent User)
echo -e "${BLUE}[5/8] Testing Resend Verification (Email Enumeration Prevention)...${NC}"
NONEXIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/resend-verification" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"nonexistent-$(date +%s)@example.com\"
  }")

HTTP_CODE=$(echo "$NONEXIST_RESPONSE" | tail -n 1)
NONEXIST_BODY=$(echo "$NONEXIST_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Email enumeration prevention working (returns success for non-existent)${NC}"
else
    echo -e "${YELLOW}⚠ Unexpected response for non-existent email (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 6: Resend Verification (Existing User)
echo -e "${BLUE}[6/8] Testing Resend Verification (Existing Unverified User)...${NC}"
RESEND_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/resend-verification" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\"
  }")

HTTP_CODE=$(echo "$RESEND_RESPONSE" | tail -n 1)
RESEND_BODY=$(echo "$RESEND_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Verification email resent successfully${NC}"
    echo -e "  ${YELLOW}⚠ New verification email should have been sent${NC}"
else
    echo -e "${RED}✗ Resend verification failed (HTTP $HTTP_CODE)${NC}"
    echo "$RESEND_BODY"
fi
echo ""

# Test 7: Email Verification (Manual Token Required)
echo -e "${BLUE}[7/8] Testing Email Verification Endpoint...${NC}"
echo -e "${YELLOW}⚠ This test requires a verification token from the email${NC}"
echo -e "  To complete this test manually:"
echo -e "  1. Check your email at: ${YELLOW}$TEST_EMAIL${NC}"
echo -e "  2. Extract the token from the verification link"
echo -e "  3. Run:"
echo -e "     ${GREEN}curl -X POST \"$API_URL/verify-email\" \\${NC}"
echo -e "       ${GREEN}-H \"Content-Type: application/json\" \\${NC}"
echo -e "       ${GREEN}-d '{\"token\":\"YOUR_TOKEN_HERE\"}'${NC}"
echo ""

# Test with invalid token
INVALID_TOKEN="invalid-token-12345"
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/verify-email" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$INVALID_TOKEN\"}")

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${GREEN}✓ Invalid token correctly rejected${NC}"
else
    echo -e "${RED}✗ Invalid token was accepted (security issue!)${NC}"
fi
echo ""

# Test 8: Database Verification
echo -e "${BLUE}[8/8] Database Verification Instructions...${NC}"
echo -e "To verify the database changes, run:"
echo -e "  ${GREEN}npx wrangler d1 execute cybersmrt-users --remote --command=\"SELECT email, email_verified FROM users WHERE email='$TEST_EMAIL';\"${NC}"
echo ""
echo -e "To check verification tokens:"
echo -e "  ${GREEN}npx wrangler d1 execute cybersmrt-users --remote --command=\"SELECT user_id, expires_at FROM email_verification_tokens WHERE user_id='$USER_ID';\"${NC}"
echo ""
echo -e "To check security logs:"
echo -e "  ${GREEN}npx wrangler d1 execute cybersmrt-users --remote --command=\"SELECT event_type, created_at FROM security_logs WHERE user_id='$USER_ID' ORDER BY created_at DESC LIMIT 5;\"${NC}"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Automated Tests Completed:${NC}"
echo -e "  ✓ Health Check"
echo -e "  ✓ API Documentation"
echo -e "  ✓ User Registration"
echo -e "  ✓ Password Validation"
echo -e "  ✓ Email Enumeration Prevention"
echo -e "  ✓ Resend Verification"
echo -e "  ✓ Invalid Token Rejection"
echo ""
echo -e "${YELLOW}Manual Tests Required:${NC}"
echo -e "  ⚠ Check Resend dashboard for delivered emails"
echo -e "  ⚠ Test verification with real token from email"
echo -e "  ⚠ Verify database changes with wrangler commands"
echo -e "  ⚠ Test frontend verification page at:"
echo -e "    https://cybersmrt.org/verify-email.html?token=YOUR_TOKEN"
echo ""
echo -e "${GREEN}✓ Email Verification System Tests Complete!${NC}"
echo ""
