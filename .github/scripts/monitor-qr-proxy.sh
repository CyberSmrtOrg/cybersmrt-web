#!/bin/bash
# QR Proxy Worker Monitoring Script
# Can be run as a cron job or in CI/CD for continuous monitoring

set -e

# Configuration
BASE_URL="${BASE_URL:-https://cybersmrt.org}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
EMAIL_TO="${EMAIL_TO:-}"
CHECK_INTERVAL="${CHECK_INTERVAL:-300}" # 5 minutes
LOG_FILE="${LOG_FILE:-/var/log/qr-proxy-monitor.log}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Timestamp
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Logging
log() {
    echo "[$(timestamp)] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(timestamp)] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(timestamp)] SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[$(timestamp)] WARN: $1${NC}" | tee -a "$LOG_FILE"
}

# Notification functions
send_slack_alert() {
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 QR Proxy Alert: $1\"}" \
            2>/dev/null || log_warn "Failed to send Slack notification"
    fi
}

send_email_alert() {
    if [ -n "$EMAIL_TO" ] && command -v mail &> /dev/null; then
        echo "$1" | mail -s "QR Proxy Alert" "$EMAIL_TO" \
            2>/dev/null || log_warn "Failed to send email notification"
    fi
}

notify_alert() {
    local message="$1"
    log_error "$message"
    send_slack_alert "$message"
    send_email_alert "$message"
}

# Health check
check_health() {
    local endpoint="$BASE_URL/tools/qr_proxy/health"

    log "Checking health endpoint: $endpoint"

    response=$(curl -s -w "\n%{http_code}\n%{time_total}" --max-time 10 "$endpoint" 2>&1)
    http_code=$(echo "$response" | sed -n '2p')
    response_time=$(echo "$response" | sed -n '3p')
    body=$(echo "$response" | sed -n '1p')

    if [ "$http_code" != "200" ]; then
        notify_alert "Health check failed with HTTP $http_code"
        return 1
    fi

    # Parse JSON response
    status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    edge=$(echo "$body" | grep -o '"edge":"[^"]*"' | cut -d'"' -f4)

    if [ "$status" != "ok" ]; then
        notify_alert "Health check returned unhealthy status: $status"
        return 1
    fi

    # Check response time
    response_ms=$(echo "$response_time * 1000" | bc)
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        log_warn "Slow response time: ${response_ms}ms (edge: $edge)"
    else
        log_success "Health check OK - ${response_ms}ms (edge: $edge)"
    fi

    return 0
}

# Test analysis endpoint
check_analysis() {
    local test_url="https://example.com"
    local endpoint="$BASE_URL/tools/qr_proxy"

    log "Testing analysis endpoint with: $test_url"

    encoded_url=$(printf %s "$test_url" | jq -sRr @uri)
    response=$(curl -s -w "\n%{http_code}" --max-time 15 \
        "$endpoint?url=$encoded_url&analysis_only=true" 2>&1)

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" != "200" ]; then
        notify_alert "Analysis endpoint failed with HTTP $http_code"
        return 1
    fi

    # Verify response structure
    if ! echo "$body" | grep -q '"security"'; then
        notify_alert "Analysis response missing security data"
        return 1
    fi

    log_success "Analysis endpoint OK"
    return 0
}

# Check VirusTotal integration
check_virustotal() {
    log "Checking VirusTotal integration"

    # Test with a known URL
    encoded_url=$(printf %s "https://google.com" | jq -sRr @uri)
    response=$(curl -s "$BASE_URL/tools/qr_proxy?url=$encoded_url&analysis_only=true")

    if echo "$response" | grep -q '"threatIntel"'; then
        vt_status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$vt_status" = "error" ]; then
            log_warn "VirusTotal integration may have issues"
        else
            log_success "VirusTotal integration working"
        fi
    else
        log_warn "VirusTotal data not present in response"
    fi
}

# Check CORS headers
check_cors() {
    log "Checking CORS headers"

    response=$(curl -s -I "$BASE_URL/tools/qr_proxy/health")

    if echo "$response" | grep -qi "Access-Control-Allow-Origin"; then
        log_success "CORS headers present"
    else
        log_warn "CORS headers missing"
    fi
}

# Monitor metrics
check_metrics() {
    log "Gathering metrics"

    # This would integrate with Cloudflare Analytics API
    # For now, we'll just log that we checked
    log "Metrics check completed (integrate with CF API for details)"
}

# Main monitoring loop
monitor_once() {
    log "=== Starting monitoring check ==="

    local checks_passed=0
    local checks_failed=0

    # Run all checks
    if check_health; then
        ((checks_passed++))
    else
        ((checks_failed++))
    fi

    if check_analysis; then
        ((checks_passed++))
    else
        ((checks_failed++))
    fi

    check_virustotal  # Soft check, doesn't fail
    check_cors        # Soft check, doesn't fail
    check_metrics     # Informational only

    # Summary
    log "=== Check Summary: $checks_passed passed, $checks_failed failed ==="

    if [ $checks_failed -gt 0 ]; then
        return 1
    fi

    return 0
}

# Continuous monitoring mode
monitor_continuous() {
    log "Starting continuous monitoring (interval: ${CHECK_INTERVAL}s)"

    while true; do
        monitor_once || log_error "Monitoring check failed"
        sleep "$CHECK_INTERVAL"
    done
}

# Generate status report
generate_report() {
    log "Generating status report"

    echo "QR Proxy Worker Status Report"
    echo "=============================="
    echo "Generated: $(timestamp)"
    echo "Base URL: $BASE_URL"
    echo ""

    # Run checks and capture output
    monitor_once 2>&1

    echo ""
    echo "Recent Logs (last 20 lines):"
    tail -n 20 "$LOG_FILE" 2>/dev/null || echo "No log file available"
}

# Usage
usage() {
    cat << EOF
QR Proxy Worker Monitoring Script

Usage: $0 [OPTIONS]

Options:
    -o, --once              Run checks once and exit
    -c, --continuous        Run continuous monitoring (default)
    -r, --report            Generate status report
    -h, --help              Show this help message

Environment Variables:
    BASE_URL                Base URL for the worker (default: https://cybersmrt.org)
    SLACK_WEBHOOK           Slack webhook URL for alerts
    EMAIL_TO                Email address for alerts
    CHECK_INTERVAL          Interval between checks in seconds (default: 300)
    LOG_FILE                Path to log file (default: /var/log/qr-proxy-monitor.log)

Examples:
    # Run once
    $0 --once

    # Continuous monitoring with Slack alerts
    SLACK_WEBHOOK=https://hooks.slack.com/... $0 --continuous

    # Generate report
    $0 --report

    # Run as cron job (every 5 minutes)
    */5 * * * * $0 --once >> /var/log/qr-proxy-cron.log 2>&1
EOF
}

# Parse arguments
case "${1:-}" in
    -o|--once)
        monitor_once
        exit $?
        ;;
    -c|--continuous)
        monitor_continuous
        ;;
    -r|--report)
        generate_report
        ;;
    -h|--help)
        usage
        exit 0
        ;;
    *)
        # Default to continuous
        monitor_continuous
        ;;
esac