/**
 * Contact Form Configuration
 * Maps contact form reasons to Resend audiences, Google Groups, and response times
 */

// Mapping of contact form reasons to Resend audience configuration
export const AUDIENCE_MAPPING = {
  general: {
    label: 'General Question',
    // audienceId: 'YOUR_GENERAL_AUDIENCE_ID', // Uncomment and add when you have a paid plan
    notifyEmail: 'general@cybersmrt.org',
    fromEmail: 'CyberSmrt <general@cybersmrt.org>',
    responseTime: '24-48 hours'
  },
  curriculum: {
    label: 'K-12 Curriculum Inquiry',
    // audienceId: 'YOUR_K12_AUDIENCE_ID',
    notifyEmail: 'curriculum@cybersmrt.org',
    fromEmail: 'CyberSmrt Education <curriculum@cybersmrt.org>',
    responseTime: '2-3 business days'
  },
  partnership: {
    label: 'School/Organization Partnership',
    // audienceId: 'YOUR_PARTNERSHIP_AUDIENCE_ID',
    notifyEmail: 'partnerships@cybersmrt.org',
    fromEmail: 'CyberSmrt Partnerships <partnerships@cybersmrt.org>',
    responseTime: '3-5 business days'
  },
  donation: {
    label: 'Donation / Sponsorship',
    // audienceId: 'YOUR_DONATION_AUDIENCE_ID',
    notifyEmail: 'donations@cybersmrt.org',
    fromEmail: 'CyberSmrt Development <donations@cybersmrt.org>',
    responseTime: '2-3 business days'
  },
  volunteer: {
    label: 'Volunteer Opportunity',
    // audienceId: 'YOUR_VOLUNTEER_AUDIENCE_ID',
    notifyEmail: 'volunteers@cybersmrt.org',
    fromEmail: 'CyberSmrt Volunteer Team <volunteers@cybersmrt.org>',
    responseTime: '3-5 business days'
  },
  board: {
    label: 'Board Member Interest',
    // audienceId: 'YOUR_BOARD_AUDIENCE_ID',
    notifyEmail: 'board@cybersmrt.org',
    fromEmail: 'CyberSmrt Board <board@cybersmrt.org>',
    responseTime: '5-7 business days'
  },
  tools: {
    label: 'Tool Support (QR Scanner, Phishing Detector)',
    // audienceId: 'YOUR_TOOLS_AUDIENCE_ID',
    notifyEmail: 'tech-support@cybersmrt.org',
    fromEmail: 'CyberSmrt Support <tech-support@cybersmrt.org>',
    responseTime: '48-72 hours'
  },
  grant: {
    label: 'Grant / Foundation Inquiry',
    // audienceId: 'YOUR_GRANT_AUDIENCE_ID',
    notifyEmail: 'grants@cybersmrt.org',
    fromEmail: 'CyberSmrt Grants <grants@cybersmrt.org>',
    responseTime: '3-5 business days'
  },
  media: {
    label: 'Media / Press Inquiry',
    // audienceId: 'YOUR_MEDIA_AUDIENCE_ID',
    notifyEmail: 'press@cybersmrt.org',
    fromEmail: 'CyberSmrt Media Relations <press@cybersmrt.org>',
    responseTime: '24-48 hours'
  },
  technical: {
    label: 'Technical Issue',
    // audienceId: 'YOUR_TECHNICAL_AUDIENCE_ID',
    notifyEmail: 'tech-support@cybersmrt.org',
    fromEmail: 'CyberSmrt Technical Team <tech-support@cybersmrt.org>',
    responseTime: '48-72 hours'
  },
  other: {
    label: 'Other',
    // audienceId: 'YOUR_OTHER_AUDIENCE_ID',
    notifyEmail: 'info@cybersmrt.org',
    fromEmail: 'CyberSmrt <info@cybersmrt.org>',
    responseTime: '24-48 hours'
  }
};

/**
 * Get audience configuration for a contact reason
 * @param {string} reason - The contact form reason
 * @returns {object} Audience configuration
 */
export function getAudienceConfig(reason) {
  return AUDIENCE_MAPPING[reason] || AUDIENCE_MAPPING.other;
}

/**
 * Check if audience features are enabled
 * @returns {boolean} True if at least one audience ID is configured
 */
export function audiencesEnabled() {
  return Object.values(AUDIENCE_MAPPING).some(config => config.audienceId);
}
