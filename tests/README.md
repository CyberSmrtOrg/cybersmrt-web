Load Testing
Automated load testing for the CyberSmrt QR Proxy service.

🚀 Quick Start
Prerequisites
Install k6:
bash
   # Windows (Chocolatey)
   choco install k6

   # macOS (Homebrew)
   brew install k6

   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
Install jq (for result parsing):
bash
   # Windows (Git Bash)
   curl -L -o /usr/bin/jq.exe https://github.com/jqlang/jq/releases/latest/download/jq-win64.exe
   chmod +x /usr/bin/jq.exe

   # macOS
   brew install jq

   # Linux
   sudo apt-get install jq
Running Tests
bash
cd tests
chmod +x run-tests.sh  # First time only
./run-tests.sh
Select from:

Normal Load - Baseline performance test
Burst Traffic - Spike test (1000 req/min)
DDoS Simulation - Stress test (extreme load)
📊 Test Scenarios
Normal Load (Default)
Duration: 2 minutes
Max VUs: 10
Target: Validate baseline performance
Burst Traffic
Rapid spike from 1 → 50 VUs
Tests rate limiting under sudden load
Validates user experience during traffic spikes
DDoS Simulation
100 concurrent users
Sustained high load
Tests system stability under attack
📈 What Gets Tested
✅ Performance:

Response times (avg, p95)
Request success rate
System stability under load
✅ Security:

Rate limiting effectiveness
SSRF protection
Malicious request blocking
✅ Thresholds:

p95 response time < 500ms
Success rate > 95%
All security checks passing
📝 Results
Automated Logging
Results are automatically appended to HISTORY.md:

markdown
| Date       | Avg Response | p95 Response | Rate Limits | SSRF Blocks | Notes       |
|------------|--------------|--------------|-------------|-------------|-------------|
| 2025-10-19 | 71.40ms      | 351.80ms     | 382         | 55          | Baseline    |
Files Created
tests/results/
├── normal-load_2025-10-19_14-30-00.json         # Detailed metrics
└── normal-load_2025-10-19_14-30-00_summary.json # Summary stats
🎯 Alert Thresholds
🔴 Action Required:

Avg Response > 100ms
p95 Response > 500ms
Success rate < 95%
Unexpected drop in security blocks
🟡 Monitor:

Avg Response > 75ms
p95 Response > 400ms
🔄 Testing Schedule
Recommended:

✅ Weekly: Normal load test (every Friday)
✅ Pre-deployment: All scenarios before major releases
✅ Post-incident: Validate fixes after issues
🛠️ Manual k6 Commands
Run k6 directly without the script:

bash
# Normal load
k6 run load-test.js

# With custom output
k6 run load-test.js --out json=results/test.json --summary-export=results/summary.json

# Quick smoke test
k6 run load-test.js --duration 30s --vus 5
📚 Understanding Metrics
http_req_duration: Time from request start to response completion
p95: 95% of requests were faster than this value
rate_limit_hits: Requests blocked by rate limiting (expected in tests)
ssrf_blocks: Malicious requests prevented (expected in tests)
success_rate: Percentage of legitimate requests that succeeded
🐛 Troubleshooting
"k6 is not installed"
Install k6 using the commands in Prerequisites section above.

"jq not found" warning
Tests will still run but rate limit/SSRF metrics will show 0. Install jq for accurate parsing.

Results folder won't open
The script converts paths for Windows. If it fails, manually open:

bash
explorer.exe C:\\Users\\YOUR_USERNAME\\Git\\cybersmrt-web\\tests\\results
Permission denied
bash
chmod +x run-tests.sh
🔗 Resources
k6 Documentation
Load Testing Best Practices
jq Manual
📞 Support
Questions? Issues? Contact the team in #cybersmrt-dev or open a GitHub issue.

