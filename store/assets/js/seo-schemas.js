/**
 * CyberSmrt SEO Schema.org JSON-LD Generator
 * Centralized schema management for consistent structured data
 */

const CyberSmrt SEOSchemas = {
  // Base organization schema - used on all pages
  organization: {
    "@context": "https://schema.org",
    "@type": "NGO",
    "name": "CyberSmrt",
    "alternateName": "CyberSmrt Inc.",
    "legalName": "CyberSmrt Inc.",
    "url": "https://cybersmrt.org",
    "logo": {
      "@type": "ImageObject",
      "url": "https://cybersmrt.org/assets/logos/cybersmrt-logo-only.png",
      "width": 500,
      "height": 500
    },
    "image": "https://cybersmrt.org/assets/logos/cybersmrt-logo-only.png",
    "description": "Service-Disabled Veteran-Owned 501(c)(3) nonprofit providing free cybersecurity education, tools, and training to underserved communities, K-12 students, and educators nationwide.",
    "slogan": "Free Cybersecurity Education & Tools for Everyone",
    "foundingDate": "2023",
    "founder": {
      "@type": "Person",
      "name": "Tony",
      "jobTitle": "Founder & CEO",
      "description": "Service-disabled veteran with 21+ years military service and 15+ years cybersecurity experience, CISSP, CISM, TS/SCI clearance"
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
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "contactType": "General Inquiries",
        "email": "tony@cybersmrt.org",
        "availableLanguage": "English"
      }
    ],
    "sameAs": [
      "https://github.com/CyberSmrtOrg"
    ],
    "nonprofitStatus": "Nonprofit501c3",
    "knowsAbout": [
      "Cybersecurity Education",
      "K-12 Education",
      "Information Security",
      "Digital Safety",
      "Security Awareness Training",
      "Phishing Detection",
      "QR Code Security",
      "Cyber Threat Intelligence",
      "STEM Education",
      "Computer Science Education",
      "Password Security",
      "Social Engineering Defense"
    ],
    "seeks": [
      {
        "@type": "Demand",
        "name": "Volunteers"
      },
      {
        "@type": "Demand",
        "name": "Board Members"
      },
      {
        "@type": "Demand",
        "name": "Donations"
      },
      {
        "@type": "Demand",
        "name": "School Partnerships"
      },
      {
        "@type": "Demand",
        "name": "Corporate Sponsors"
      }
    ]
  },

  // Generate breadcrumb schema
  breadcrumb: function(items) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    };
  },

  // Course/Education Program schema
  course: function(courseData) {
    return {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": courseData.name,
      "description": courseData.description,
      "provider": {
        "@type": "NGO",
        "name": "CyberSmrt",
        "url": "https://cybersmrt.org"
      },
      "educationalLevel": courseData.level || "K-12",
      "teaches": courseData.teaches || "Cybersecurity fundamentals",
      "audience": {
        "@type": "EducationalAudience",
        "educationalRole": courseData.audience || "student"
      },
      "isAccessibleForFree": true,
      "availableLanguage": "English",
      "inLanguage": "en-US",
      "coursePrerequisites": courseData.prerequisites || "None",
      "timeRequired": courseData.timeRequired,
      "educationalCredentialAwarded": courseData.credential
    };
  },

  // Software Application schema for tools
  softwareApp: function(appData) {
    return {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": appData.name,
      "description": appData.description,
      "applicationCategory": "SecurityApplication",
      "operatingSystem": "Any",
      "browserRequirements": "Requires JavaScript. Modern browser recommended.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "provider": {
        "@type": "NGO",
        "name": "CyberSmrt",
        "url": "https://cybersmrt.org"
      },
      "featureList": appData.features || [],
      "screenshot": appData.screenshot,
      "aggregateRating": appData.rating ? {
        "@type": "AggregateRating",
        "ratingValue": appData.rating.value,
        "reviewCount": appData.rating.count
      } : undefined
    };
  },

  // Blog post schema
  blogPost: function(postData) {
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": postData.title,
      "author": {
        "@type": "Organization",
        "name": "CyberSmrt"
      },
      "publisher": {
        "@type": "Organization",
        "name": "CyberSmrt",
        "logo": {
          "@type": "ImageObject",
          "url": "https://cybersmrt.org/assets/logos/cybersmrt-logo-only.png"
        }
      },
      "datePublished": postData.datePublished,
      "dateModified": postData.dateModified || postData.datePublished,
      "image": postData.image,
      "articleBody": postData.content,
      "description": postData.description,
      "keywords": postData.keywords,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": postData.url
      }
    };
  },

  // Event schema
  event: function(eventData) {
    return {
      "@context": "https://schema.org",
      "@type": "EducationEvent",
      "name": eventData.name,
      "description": eventData.description,
      "organizer": {
        "@type": "NGO",
        "name": "CyberSmrt",
        "url": "https://cybersmrt.org"
      },
      "eventAttendanceMode": eventData.mode || "https://schema.org/MixedEventAttendanceMode",
      "location": eventData.location ? {
        "@type": eventData.location.type || "VirtualLocation",
        "url": eventData.location.url,
        "name": eventData.location.name
      } : undefined,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "startDate": eventData.startDate,
      "endDate": eventData.endDate,
      "eventStatus": "https://schema.org/EventScheduled"
    };
  },

  // FAQ schema
  faq: function(faqItems) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    };
  },

  // Helper function to inject schema into page
  inject: function(schema) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  },

  // Initialize page with multiple schemas
  init: function(schemas) {
    schemas.forEach(schema => this.inject(schema));
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CyberSmrtSEOSchemas;
}
