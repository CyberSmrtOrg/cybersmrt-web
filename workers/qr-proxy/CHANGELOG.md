{
  "comment": "Sample blocked domains for CyberSmrt QR Proxy KV namespace",
  "instructions": "Upload these to your KV namespace using: wrangler kv key put --namespace-id=YOUR_ID 'domain.com' 'JSON_VALUE'",
  "domains": [
    {
      "domain": "known-phishing-site.com",
      "value": {
        "reason": "Known phishing campaign targeting banking credentials",
        "addedAt": "2025-01-15T10:00:00Z",
        "addedBy": "admin",
        "reportedBy": "user",
        "severity": "critical",
        "tags": ["phishing", "banking", "credentials"]
      }
    },
    {
      "domain": "fake-package-delivery.tk",
      "value": {
        "reason": "Fake package delivery scam",
        "addedAt": "2025-01-14T15:30:00Z",
        "addedBy": "automated",
        "reportedBy": "virustotal",
        "severity": "high",
        "tags": ["scam", "delivery", "payment"]
      }
    },
    {
      "domain": "urgent-account-verify.ml",
      "value": {
        "reason": "Account verification phishing",
        "addedAt": "2025-01-13T08:45:00Z",
        "addedBy": "admin",
        "reportedBy": "community",
        "severity": "high",
        "tags": ["phishing", "account", "urgent"]
      }
    },
    {
      "domain": "free-gift-claim.xyz",
      "value": {
        "reason": "Gift card scam collecting personal information",
        "addedAt": "2025-01-12T12:00:00Z",
        "addedBy": "admin",
        "reportedBy": "senior_outreach",
        "severity": "medium",
        "tags": ["scam", "gift-card", "pii"]
      }
    },
    {
      "domain": "irs-tax-refund-status.com",
      "value": {
        "reason": "IRS impersonation scam",
        "addedAt": "2025-01-10T09:15:00Z",
        "addedBy": "admin",
        "reportedBy": "ftc",
        "severity": "critical",
        "tags": ["impersonation", "government", "tax", "scam"]
      }
    },
    {
      "domain": "parking-payment-now.net",
      "value": {
        "reason": "Fake parking payment portal",
        "addedAt": "2025-01-08T14:20:00Z",
        "addedBy": "admin",
        "reportedBy": "municipality",
        "severity": "high",
        "tags": ["payment", "parking", "municipal"]
      }
    },
    {
      "domain": "covid19-vaccine-registration.org",
      "value": {
        "reason": "Vaccine registration scam collecting health data",
        "addedAt": "2025-01-05T11:30:00Z",
        "addedBy": "admin",
        "reportedBy": "health_dept",
        "severity": "critical",
        "tags": ["health", "vaccine", "pii", "hipaa"]
      }
    },
    {
      "domain": "192.168.1.1",
      "value": {
        "reason": "Private IP address - potential network intrusion",
        "addedAt": "2025-01-01T00:00:00Z",
        "addedBy": "system",
        "reportedBy": "heuristic",
        "severity": "high",
        "tags": ["ip-address", "private-network"]
      }
    },
    {
      "domain": "localhost",
      "value": {
        "reason": "Localhost access forbidden",
        "addedAt": "2025-01-01T00:00:00Z",
        "addedBy": "system",
        "reportedBy": "heuristic",
        "severity": "high",
        "tags": ["localhost", "internal"]
      }
    },
    {
      "domain": "127.0.0.1",
      "value": {
        "reason": "Loopback address forbidden",
        "addedAt": "2025-01-01T00:00:00Z",
        "addedBy": "system",
        "reportedBy": "heuristic",
        "severity": "high",
        "tags": ["localhost", "loopback"]
      }
    }
  ],
  "upload_commands": [
    "# Upload all domains to KV namespace",
    "wrangler kv key put --namespace-id=YOUR_ID 'known-phishing-site.com' '{\"reason\":\"Known phishing campaign targeting banking credentials\",\"addedAt\":\"2025-01-15T10:00:00Z\",\"addedBy\":\"admin\"}'",
    "",
    "# Or use bulk upload (create bulk.json first):",
    "wrangler kv bulk put --namespace-id=YOUR_ID bulk.json"
  ],
  "notes": [
    "Replace YOUR_ID with your actual KV namespace ID",
    "Update timestamps to current date when uploading",
    "Add new domains as they are discovered",
    "Regularly review and remove false positives",
    "Consider automation for VirusTotal integration"
  ]
}