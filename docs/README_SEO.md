# CyberSmrt SEO Documentation

## Overview
This document provides ongoing SEO maintenance guidance for the CyberSmrt website. Our SEO strategy focuses on attracting:
- Grant-making foundations and corporate sponsors
- K-12 educators and charter schools
- Cybersecurity tool users
- Volunteers and board member candidates
- Individual donors

## Recent SEO Enhancements (October 2025)

### Homepage Improvements
✅ Added comprehensive Schema.org JSON-LD structured data:
- **NGO Schema**: Establishes CyberSmrt as a recognized nonprofit organization
- **WebSite Schema**: Enables sitelinks search box in Google results
- **Organization details**: Founder credentials, veteran-owned status, 501(c)(3) status

✅ Enhanced meta tags:
- Updated title to emphasize "Nonprofit" and "Free Cybersecurity Education"
- Expanded description to include veteran-owned, 501(c)(3), and underserved communities focus
- Added comprehensive robots meta directives
- Added Twitter site/creator tags
- Added OpenGraph image dimensions

✅ Created comprehensive SEO documentation:
- Full audit in `/docs/SEO_AUDIT_AND_IMPLEMENTATION.md`
- Reusable schema JavaScript library in `/assets/js/seo-schemas.js`
- Python enhancement script in `/scripts/seo-enhancer.py`

## Key SEO Assets

### 1. Structured Data (Schema.org)
All pages should include:
- **Organization Schema** (NGO type) - identifies CyberSmrt
- **Breadcrumb Schema** - improves navigation in search results
- **Page-specific Schema** - Course, SoftwareApplication, BlogPosting, etc.

### 2. Target Keywords

**Primary Keywords:**
- cybersecurity education nonprofit
- free cybersecurity training
- K-12 security curriculum
- veteran owned nonprofit

**Tool-Specific:**
- QR code security scanner
- phishing email detector
- password strength checker

**Nonprofit-Specific:**
- 501c3 cybersecurity education
- tax deductible cyber donation
- underserved communities technology

### 3. Current SEO Performance Baseline

**To establish baseline metrics:**
1. Set up Google Search Console (if not done)
2. Set up Google Analytics 4
3. Document current rankings for target keywords
4. Track organic traffic monthly
5. Monitor Core Web Vitals

## Ongoing Maintenance Tasks

### Daily
- Monitor Google Search Console for critical errors
- Check website uptime/performance

### Weekly
- Review new blog post SEO before publishing
- Check for broken links on new pages
- Verify schema validation on updated pages

### Monthly
- [ ] Update sitemap.xml if new content added
- [ ] Review Google Search Console Performance report
- [ ] Check Core Web Vitals in Search Console
- [ ] Audit top 10 pages for SEO improvements
- [ ] Review and update meta descriptions based on CTR data
- [ ] Check for 404 errors and fix/redirect

### Quarterly
- [ ] Full SEO audit using checklist in SEO_AUDIT_AND_IMPLEMENTATION.md
- [ ] Competitor keyword analysis
- [ ] Backlink profile review
- [ ] Content gap analysis (what content is missing?)
- [ ] Update blog post internal links
- [ ] Refresh evergreen content

### Annually
- [ ] Comprehensive technical SEO audit
- [ ] Schema markup updates for new Google features
- [ ] Complete content refresh for all major pages
- [ ] Image optimization review (WebP conversion, compression)
- [ ] Site structure review

## Adding SEO to New Pages

When creating a new page, always include:

### 1. Meta Tags Template
```html
<title>[Page Title] | CyberSmrt - Free Cybersecurity Education</title>
<meta name="description" content="[Unique 150-160 char description]">
<meta name="keywords" content="[relevant, keywords, here]">
<meta name="author" content="CyberSmrt">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<link rel="canonical" href="[page-url]">

<!-- OpenGraph -->
<meta property="og:type" content="website">
<meta property="og:url" content="[page-url]">
<meta property="og:title" content="[Page Title] | CyberSmrt">
<meta property="og:description" content="[description]">
<meta property="og:image" content="[1200x630-image-url]">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="CyberSmrt">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="[Page Title] | CyberSmrt">
<meta name="twitter:description" content="[description]">
<meta name="twitter:image" content="[image-url]">
<meta name="twitter:site" content="@cybersmrt">
```

### 2. Required Schemas
```html
<!-- Organization Schema (on all pages) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NGO",
  "name": "CyberSmrt",
  ...
}
</script>

<!-- Breadcrumb Schema (all pages except homepage) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [...]
}
</script>
```

### 3. Content Guidelines
- **Minimum 300 words** (400-600 for tool pages, 800+ for cornerstone content)
- **One H1** per page (page title)
- **Logical heading hierarchy** (H1 → H2 → H3, no skipping)
- **Short paragraphs** (2-3 sentences)
- **Bullet points** for scannability
- **3-5 internal links** to related content
- **1-2 external links** to authoritative sources (.edu, .gov)
- **Clear CTA** on every page
- **Alt text** on all images (descriptive, not generic)

### 4. Image Requirements
```html
<img src="/path/to/image.jpg"
     alt="Descriptive alt text explaining what the image shows"
     width="1200"
     height="675"
     loading="lazy">
```

## Validation & Testing

### Before Deploying SEO Changes
Test every modified page with:

1. **Google Rich Results Test**
   ```
   https://search.google.com/test/rich-results
   ```
   - Paste page URL
   - Verify all schemas validate
   - Check for warnings/errors

2. **Schema.org Validator**
   ```
   https://validator.schema.org/
   ```
   - Copy/paste JSON-LD code
   - Fix any validation errors

3. **PageSpeed Insights**
   ```
   https://pagespeed.web.dev/
   ```
   - Target: 90+ on mobile and desktop
   - Check Core Web Vitals (LCP, FID, CLS)

4. **Mobile-Friendly Test**
   ```
   https://search.google.com/test/mobile-friendly
   ```
   - Must pass for all pages

### Chrome DevTools Checks
- Open DevTools → Lighthouse tab
- Run audit (Desktop + Mobile)
- Review SEO section (should be 100)
- Check Accessibility (aim for 95+)
- Review Performance recommendations

## Google Search Console Setup

### Initial Setup
1. Go to https://search.google.com/search-console
2. Add property: `cybersmrt.org`
3. Verify ownership (DNS TXT record or HTML tag)
4. Submit sitemap: `https://cybersmrt.org/sitemap.xml`

### Key Reports to Monitor
- **Performance**: Track clicks, impressions, CTR, position
- **Coverage**: Ensure all pages are indexed
- **Core Web Vitals**: Monitor LCP, FID, CLS
- **Mobile Usability**: Fix any mobile issues
- **Manual Actions**: Check for penalties (should be none)
- **Security Issues**: Monitor for hacks/malware

### Setting Up Alerts
Configure email alerts for:
- New security issues
- New manual actions
- Significant drop in impressions
- Increase in server errors
- Mobile usability issues

## Keyword Tracking

### Primary Keywords to Track Monthly
1. cybersecurity education nonprofit
2. free cybersecurity training
3. K-12 cybersecurity curriculum
4. veteran owned cybersecurity nonprofit
5. QR code security scanner
6. phishing email detector
7. free security tools
8. 501c3 security education
9. underserved communities cybersecurity
10. charter school security curriculum

### Tools for Tracking
- Google Search Console (free, built-in)
- Ubersuggest (free tier available)
- Manual Google searches (use incognito mode)

## Content Strategy

### Blog Post SEO Checklist
When publishing new blog posts:
- [ ] Include target keyword in title, URL, H1, first paragraph
- [ ] Write 1500-2500 words (comprehensive content)
- [ ] Use H2/H3 subheadings with keywords
- [ ] Add 3-5 internal links to programs/tools/other posts
- [ ] Include 1-2 external links to authoritative sources
- [ ] Add BlogPosting JSON-LD schema
- [ ] Optimize featured image (WebP, alt text, 1200x675px)
- [ ] Write compelling meta description (150-160 chars)
- [ ] Add social sharing buttons
- [ ] Include clear CTA (donate, volunteer, use tool)

### Recommended Blog Topics (High SEO Value)
1. "How to Teach Cybersecurity to K-12 Students: Complete Guide"
2. "10 Phishing Red Flags Every Student Should Know"
3. "QR Code Scams: How to Spot Malicious QR Codes"
4. "Why Cybersecurity Education Equity Matters"
5. "From Military Service to Cybersecurity Education"
6. "Creating Unbreakable Passwords: Student Guide"
7. "The ROI of Cybersecurity Education in Schools"
8. "How to Implement Cybersecurity Curriculum (Educators)"
9. "Social Engineering Attacks Explained for Beginners"
10. "Measuring Impact: Our Cybersecurity Education Metrics"

## Backlink Strategy

### High-Priority Backlink Targets
1. **Government (.gov)**
   - CISA.gov resources page
   - ED.gov educational resources
   - VA.gov veteran services directory

2. **Education (.edu)**
   - University cybersecurity programs
   - School district resource pages
   - Education technology directories

3. **Nonprofit Directories**
   - GuideStar/Candid profile
   - VolunteerMatch listing
   - Foundation Center
   - Network for Good

4. **Industry Resources**
   - SANS.org awareness resources
   - (ISC)² education initiatives
   - National Cyber Security Alliance

### Outreach Email Template
```
Subject: Free Cybersecurity Curriculum for K-12 Schools

Hi [Name],

I'm reaching out from CyberSmrt, a Service-Disabled Veteran-Owned
501(c)(3) nonprofit providing free cybersecurity education to
underserved communities.

I noticed your resource page on [topic] and thought our free
[curriculum/tool] might be valuable for your audience.

We offer:
- Standards-aligned K-12 cybersecurity curriculum
- Free security tools (QR scanner, phishing detector)
- Veteran-led training and mentorship

Would you consider adding us to your resources page?

Best regards,
[Name]
CyberSmrt
https://cybersmrt.org
```

## Performance Optimization

### Current Status
- ✅ Cloudflare CDN enabled
- ✅ Font preconnect implemented
- ✅ Images lazy loading (partial)
- ⚠️ Need WebP conversion for all images
- ⚠️ Need CSS/JS minification

### Next Performance Steps
1. Convert all images to WebP with JPEG fallback
2. Implement critical CSS inline
3. Minify and combine CSS files
4. Minify JavaScript
5. Enable Brotli compression on Cloudflare
6. Implement resource hints (preload, prefetch)

### Target Metrics
- **PageSpeed Score**: 90+ (mobile and desktop)
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **TTI**: < 3.5s

## Local SEO (Seattle)

### Current Implementation
✅ Seattle, WA in Organization schema address

### Additional Opportunities
- [ ] Create Google Business Profile (if physical location)
- [ ] Get listed in Seattle nonprofit directories
- [ ] Target local keywords: "Seattle cybersecurity nonprofit"
- [ ] Partner with local schools/organizations for backlinks
- [ ] Participate in Seattle tech/nonprofit events

## FAQ & Common Issues

### Q: How often should sitemap.xml be updated?
A: Automatically update whenever new content is published. Manually review monthly to ensure all public pages are included.

### Q: What if a page shows "Not indexed" in Search Console?
A: Check:
1. Is it in robots.txt disallow list?
2. Does it have noindex meta tag?
3. Is it linked from other pages?
4. Does it have enough content (300+ words)?
5. Request indexing via Search Console

### Q: How do I check if schemas are working?
A: Use Google Rich Results Test - paste URL and verify schemas appear without errors.

### Q: What's the best way to track keyword rankings?
A: Use Google Search Console Performance report. Filter by specific queries to see position over time.

### Q: How do I optimize for "cybersecurity education nonprofit"?
A:
1. Include exact phrase in homepage title, H1, first paragraph
2. Use variations throughout content naturally
3. Get backlinks with this anchor text
4. Create dedicated content targeting this phrase
5. Ensure meta description includes it

## Emergency SEO Checklist

If traffic suddenly drops:
- [ ] Check Google Search Console for manual actions
- [ ] Verify site is online and accessible
- [ ] Check for robots.txt errors blocking pages
- [ ] Review recent code changes that might have broken SEO
- [ ] Check if sitemap is still accessible
- [ ] Verify schemas still validate
- [ ] Check for server errors (5xx)
- [ ] Review Google algorithm update history

## Resources

### Official Documentation
- Google Search Central: https://developers.google.com/search
- Schema.org: https://schema.org/
- Web.dev (Performance): https://web.dev/

### Tools
- Google Search Console: https://search.google.com/search-console
- Google Analytics: https://analytics.google.com/
- PageSpeed Insights: https://pagespeed.web.dev/
- Rich Results Test: https://search.google.com/test/rich-results
- Schema Validator: https://validator.schema.org/

### Internal Documents
- Full SEO Audit: `/docs/SEO_AUDIT_AND_IMPLEMENTATION.md`
- Schema Library: `/assets/js/seo-schemas.js`
- Enhancement Script: `/scripts/seo-enhancer.py`

## Contact

For SEO-related questions or urgent issues, review this documentation first. For persistent issues, consult the full audit document at `/docs/SEO_AUDIT_AND_IMPLEMENTATION.md`.

---

**Last Updated:** October 27, 2025
**Next Review:** January 2026
