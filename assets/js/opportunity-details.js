// Volunteer Opportunity Details Modal System

// Prevent duplicate execution
if (typeof window.OPPORTUNITY_DETAILS_LOADED === 'undefined') {
window.OPPORTUNITY_DETAILS_LOADED = true;

(function() {
  'use strict';

  // Detailed opportunity information
  const opportunityData = {
    'student-mentor': {
      icon: '🎓',
      title: 'Student Mentor',
      commitment: '2-4 hours/month',
      fullDescription: `
        <p>As a Student Mentor, you'll play a vital role in guiding K-12 students through their cybersecurity education journey. You'll provide one-on-one or small group mentorship, offering career advice, answering technical questions, and sharing real-world insights from your professional experience.</p>

        <p>This role is perfect for cybersecurity professionals who are passionate about education and want to inspire the next generation of security experts. You'll help students build confidence, develop technical skills, and navigate their path into the cybersecurity field.</p>

        <h4>Key Responsibilities:</h4>
        <ul>
          <li>Conduct monthly mentorship sessions (virtual or in-person)</li>
          <li>Answer student questions about cybersecurity concepts and career paths</li>
          <li>Review student portfolios, resumes, and projects</li>
          <li>Provide guidance on certification paths (Security+, CISSP, CEH, etc.)</li>
          <li>Share your professional experiences and lessons learned</li>
          <li>Help students prepare for interviews and job applications</li>
        </ul>

        <h4>Preferred Qualifications:</h4>
        <ul>
          <li><strong>Experience:</strong> 2+ years in cybersecurity or related IT field</li>
          <li><strong>Certifications:</strong> At least one industry certification (Security+, CISSP, CEH, CySA+, GSEC, etc.)</li>
          <li><strong>Communication:</strong> Ability to explain technical concepts clearly to students</li>
          <li><strong>Patience:</strong> Experience working with young people or teaching preferred</li>
          <li><strong>Availability:</strong> Flexible schedule for virtual or in-person sessions</li>
          <li><strong>Background Check:</strong> Required for student-facing roles</li>
        </ul>

        <h4>What You'll Gain:</h4>
        <ul>
          <li>Leadership and mentorship experience for your professional portfolio</li>
          <li>Opportunity to give back and shape future cybersecurity professionals</li>
          <li>Access to CyberSmrt's mentorship training and resources</li>
          <li>Networking with other cybersecurity professionals</li>
          <li>Letter of recommendation for consistent service</li>
        </ul>
      `,
      requiresNDA: false,
      requiresBackgroundCheck: true
    },

    'curriculum-developer': {
      icon: '📚',
      title: 'Curriculum Developer',
      commitment: '5-10 hours/month',
      fullDescription: `
        <p>Curriculum Developers help design and refine CyberSmrt's K-12 cybersecurity education programs. You'll create hands-on activities, write learning modules, develop assessment rubrics, and ensure content stays current with industry trends and best practices.</p>

        <p>This role combines your technical expertise with instructional design skills. You'll work closely with educators, students, and other cybersecurity professionals to create engaging, accessible, and effective learning materials.</p>

        <h4>Key Responsibilities:</h4>
        <ul>
          <li>Design lesson plans and learning activities for grades 5-12</li>
          <li>Develop hands-on lab exercises and CTF challenges</li>
          <li>Create competency-based assessment rubrics</li>
          <li>Write technical content for various skill levels</li>
          <li>Review and update existing curriculum materials</li>
          <li>Align content with industry standards (NIST NICE Framework, etc.)</li>
          <li>Collaborate with educators to ensure pedagogical soundness</li>
        </ul>

        <h4>Preferred Qualifications:</h4>
        <ul>
          <li><strong>Experience:</strong> 3+ years in cybersecurity with hands-on technical skills</li>
          <li><strong>Certifications:</strong> Security+, CISSP, CEH, or equivalent industry credentials</li>
          <li><strong>Writing:</strong> Strong technical writing skills and attention to detail</li>
          <li><strong>Education Background:</strong> Teaching, training, or instructional design experience preferred</li>
          <li><strong>Tools:</strong> Familiarity with educational technology and lab environments (virtual labs, CTF platforms, etc.)</li>
          <li><strong>Collaboration:</strong> Comfortable working with educators and non-technical stakeholders</li>
        </ul>

        <h4>What You'll Gain:</h4>
        <ul>
          <li>Experience in instructional design and curriculum development</li>
          <li>Published content with CyberSmrt attribution</li>
          <li>Professional development in education and training</li>
          <li>Portfolio pieces demonstrating your technical and communication skills</li>
          <li>Contribution to closing the cybersecurity education gap</li>
        </ul>
      `,
      requiresNDA: false,
      requiresBackgroundCheck: false
    },

    'workshop-facilitator': {
      icon: '🎤',
      title: 'Workshop Facilitator',
      commitment: '3-6 hours/event',
      fullDescription: `
        <p>Workshop Facilitators lead interactive cybersecurity workshops for students, educators, community members, and nonprofit staff. You'll present technical topics in accessible ways, facilitate hands-on demonstrations, and help participants develop practical security skills.</p>

        <p>This role is ideal for cybersecurity professionals who enjoy public speaking and want to make cybersecurity education accessible to diverse audiences. Workshops can be virtual or in-person and cover topics from basic digital safety to advanced technical concepts.</p>

        <h4>Key Responsibilities:</h4>
        <ul>
          <li>Prepare and deliver engaging cybersecurity workshops (1-4 hours)</li>
          <li>Adapt technical content for different audiences and skill levels</li>
          <li>Facilitate hands-on demonstrations and activities</li>
          <li>Answer participant questions clearly and patiently</li>
          <li>Provide practical, actionable security advice</li>
          <li>Collect feedback and continuously improve presentation skills</li>
        </ul>

        <h4>Workshop Topics Include:</h4>
        <ul>
          <li>Password security and authentication best practices</li>
          <li>Phishing awareness and social engineering</li>
          <li>Cybersecurity career pathways and certifications</li>
          <li>Secure browsing and online privacy</li>
          <li>Introduction to ethical hacking and penetration testing</li>
          <li>Incident response and security operations</li>
        </ul>

        <h4>Preferred Qualifications:</h4>
        <ul>
          <li><strong>Experience:</strong> 2+ years in cybersecurity or IT security</li>
          <li><strong>Certifications:</strong> Security+, CISSP, CEH, or relevant credentials</li>
          <li><strong>Public Speaking:</strong> Comfortable presenting to groups of 10-50 people</li>
          <li><strong>Adaptability:</strong> Ability to adjust content for diverse audiences (students, seniors, nonprofit staff, etc.)</li>
          <li><strong>Technical Setup:</strong> Reliable internet connection and webcam for virtual workshops</li>
          <li><strong>Background Check:</strong> Required for student-facing workshops</li>
        </ul>

        <h4>What You'll Gain:</h4>
        <ul>
          <li>Public speaking and presentation experience</li>
          <li>Teaching and facilitation skills</li>
          <li>Direct community impact and meaningful engagement</li>
          <li>Professional development in education and outreach</li>
          <li>Networking opportunities with other professionals</li>
        </ul>
      `,
      requiresNDA: false,
      requiresBackgroundCheck: true
    },

    'mssp-operations': {
      icon: '🔐',
      title: 'MSSP Operations Support',
      commitment: '4-8 hours/month',
      fullDescription: `
        <p>MSSP Operations volunteers support CyberSmrt's managed security services for nonprofits and community organizations. You'll help with security assessments, vulnerability management, monitoring, incident response, and client education—all while gaining hands-on experience with enterprise security tools.</p>

        <p>This role is perfect for cybersecurity professionals looking to contribute their technical skills directly to protecting vulnerable organizations. You'll work with real security tools, analyze real threats, and make a tangible impact on community organizations' security posture.</p>

        <h4>Key Responsibilities:</h4>
        <ul>
          <li>Conduct vulnerability scans and review assessment results</li>
          <li>Analyze security alerts and triage potential incidents</li>
          <li>Write security documentation, runbooks, and client reports</li>
          <li>Assist with patch management and remediation tracking</li>
          <li>Educate clients on security best practices</li>
          <li>Support security tool deployment and configuration</li>
          <li>Participate in incident response when needed</li>
        </ul>

        <h4>Technical Areas:</h4>
        <ul>
          <li><strong>Vulnerability Management:</strong> Nessus, Qualys, OpenVAS</li>
          <li><strong>SIEM/Monitoring:</strong> Splunk, Wazuh, ELK Stack</li>
          <li><strong>Endpoint Security:</strong> EDR/XDR platforms</li>
          <li><strong>Network Security:</strong> Firewall rules, IDS/IPS</li>
          <li><strong>Cloud Security:</strong> AWS, Azure, Google Cloud</li>
          <li><strong>Documentation:</strong> Security policies, incident reports, runbooks</li>
        </ul>

        <h4>Preferred Qualifications:</h4>
        <ul>
          <li><strong>Experience:</strong> 2-5 years in security operations, SOC, or systems administration</li>
          <li><strong>Certifications:</strong> Security+, CySA+, GCIH, GCIA, or similar blue team credentials</li>
          <li><strong>Technical Skills:</strong> Vulnerability scanning, log analysis, incident response basics</li>
          <li><strong>Tools:</strong> Hands-on experience with security monitoring and assessment tools</li>
          <li><strong>Communication:</strong> Ability to write clear technical documentation and client-facing reports</li>
          <li><strong>NDA:</strong> Required for access to client environments and data</li>
        </ul>

        <h4>What You'll Gain:</h4>
        <ul>
          <li>Hands-on experience with enterprise security tools (Splunk, Nessus, etc.)</li>
          <li>Real-world SOC and MSSP operational experience</li>
          <li>Portfolio pieces: security assessments, runbooks, and reports</li>
          <li>Client-facing experience and professional communication skills</li>
          <li>Contribution to protecting nonprofits and community organizations</li>
        </ul>
      `,
      requiresNDA: true,
      requiresBackgroundCheck: false
    },

    'technical-reviewer': {
      icon: '🔍',
      title: 'Technical Reviewer',
      commitment: '2-4 hours/month',
      fullDescription: `
        <p>Technical Reviewers ensure the accuracy and quality of CyberSmrt's educational materials, blog posts, and curriculum content. You'll review lesson plans, fact-check technical information, and provide expert feedback to maintain high standards across all content.</p>

        <p>This role is ideal for detail-oriented cybersecurity professionals who enjoy reading, reviewing, and improving technical content. You'll help ensure that students and community members receive accurate, up-to-date, and industry-aligned cybersecurity education.</p>

        <h4>Key Responsibilities:</h4>
        <ul>
          <li>Review curriculum lesson plans for technical accuracy</li>
          <li>Fact-check blog posts and educational materials</li>
          <li>Provide constructive feedback on technical content</li>
          <li>Suggest improvements, updates, and corrections</li>
          <li>Ensure alignment with industry standards and best practices</li>
          <li>Verify that content is appropriate for target audience skill level</li>
          <li>Review lab exercises and hands-on activities for accuracy</li>
        </ul>

        <h4>Content Types You'll Review:</h4>
        <ul>
          <li>K-12 cybersecurity curriculum lesson plans</li>
          <li>Blog posts on cybersecurity topics</li>
          <li>Educational guides and tutorials</li>
          <li>Hands-on lab exercises and CTF challenges</li>
          <li>Security assessment templates and checklists</li>
          <li>Technical documentation and runbooks</li>
        </ul>

        <h4>Preferred Qualifications:</h4>
        <ul>
          <li><strong>Experience:</strong> 3+ years in cybersecurity with broad technical knowledge</li>
          <li><strong>Certifications:</strong> CISSP, OSCP, GIAC certifications, or equivalent expertise</li>
          <li><strong>Attention to Detail:</strong> Strong eye for errors, inconsistencies, and outdated information</li>
          <li><strong>Writing Skills:</strong> Ability to provide clear, constructive feedback</li>
          <li><strong>Technical Breadth:</strong> Knowledge across multiple security domains (red team, blue team, GRC, cloud, etc.)</li>
          <li><strong>Standards:</strong> Familiarity with industry frameworks (NIST, OWASP, MITRE ATT&CK, etc.)</li>
        </ul>

        <h4>What You'll Gain:</h4>
        <ul>
          <li>Early access to CyberSmrt's educational content</li>
          <li>Professional development in technical writing and review</li>
          <li>Recognition as a CyberSmrt Technical Reviewer</li>
          <li>Contribution to high-quality cybersecurity education</li>
          <li>Networking with content creators and educators</li>
        </ul>
      `,
      requiresNDA: false,
      requiresBackgroundCheck: false
    },

    'board-advisor': {
      icon: '🌟',
      title: 'Board Member / Advisor',
      commitment: '3-5 hours/month',
      fullDescription: `
        <p>Board Members and Advisors provide strategic guidance, leverage professional networks, and help shape CyberSmrt's long-term direction and growth. You'll participate in board meetings, contribute to strategic planning, support fundraising efforts, and ensure organizational accountability.</p>

        <p>This role is ideal for senior cybersecurity leaders, executives, and experienced professionals who want to use their expertise, connections, and business acumen to advance CyberSmrt's mission at the organizational level.</p>

        <h4>Key Responsibilities:</h4>
        <ul>
          <li>Attend quarterly board meetings (virtual or in-person)</li>
          <li>Contribute to strategic planning and organizational direction</li>
          <li>Support fundraising efforts through donor cultivation and grant review</li>
          <li>Leverage your professional network for partnerships and opportunities</li>
          <li>Provide domain expertise in cybersecurity, education, or nonprofit management</li>
          <li>Ensure financial accountability and organizational governance</li>
          <li>Review and approve major organizational decisions</li>
          <li>Act as an ambassador for CyberSmrt in professional circles</li>
        </ul>

        <h4>Board Positions Available:</h4>
        <ul>
          <li><strong>Board of Directors:</strong> Formal governance role with fiduciary responsibilities</li>
          <li><strong>Advisory Board:</strong> Strategic guidance without formal governance obligations</li>
          <li><strong>Specialized Advisors:</strong> Subject matter expertise in technical, education, or business areas</li>
        </ul>

        <h4>Preferred Qualifications:</h4>
        <ul>
          <li><strong>Experience:</strong> 7-10+ years in cybersecurity, education, nonprofit management, or related fields</li>
          <li><strong>Leadership:</strong> Executive, senior management, or significant leadership experience</li>
          <li><strong>Certifications:</strong> Advanced credentials (CISSP, CISM, CISA) or graduate degrees preferred</li>
          <li><strong>Network:</strong> Strong professional connections in cybersecurity, education, philanthropy, or government</li>
          <li><strong>Governance:</strong> Prior board experience (preferred but not required)</li>
          <li><strong>Commitment:</strong> Multi-year commitment to CyberSmrt's mission and growth</li>
        </ul>

        <h4>What You'll Gain:</h4>
        <ul>
          <li>Board governance and nonprofit leadership experience</li>
          <li>Opportunity to shape a growing organization's strategic direction</li>
          <li>Networking with other cybersecurity and education leaders</li>
          <li>Meaningful impact on closing the cybersecurity equity gap</li>
          <li>Recognition and visibility in the cybersecurity community</li>
        </ul>

        <h4>Time Commitment:</h4>
        <ul>
          <li>Quarterly board meetings (2 hours each)</li>
          <li>Monthly check-ins or committee work (1-2 hours)</li>
          <li>Ad-hoc strategic guidance and networking</li>
          <li>Annual board retreat or strategic planning session</li>
        </ul>
      `,
      requiresNDA: true,
      requiresBackgroundCheck: false
    },

    'intern-shadow': {
      icon: '🚀',
      title: 'Intern/Shadow Program',
      commitment: '10-20 hours/month • NDA Required',
      fullDescription: `
        <p><strong style="color: #667eea;">NEW PROGRAM:</strong> Get hands-on cybersecurity experience by shadowing CyberSmrt's security experts on real client engagements. This intensive program provides practical, real-world training in penetration testing, vulnerability assessment, patch remediation, policy development, and more.</p>

        <p>Unlike traditional volunteering, this program is designed as a professional development opportunity for aspiring cybersecurity professionals. You'll work directly with experienced practitioners, observe client engagements, and gradually take on more responsibility as you build skills.</p>

        <h4>What You'll Learn:</h4>
        <ul>
          <li><strong>Penetration Testing:</strong> Shadow penetration tests, learn reconnaissance, exploitation, and reporting</li>
          <li><strong>Vulnerability Assessment:</strong> Conduct scans, analyze results, prioritize findings, and track remediation</li>
          <li><strong>Patch Management:</strong> Learn enterprise patch workflows, testing, deployment, and documentation</li>
          <li><strong>Policy Development:</strong> Co-author security policies, procedures, and compliance documentation</li>
          <li><strong>Client Communication:</strong> Observe client meetings, report presentations, and stakeholder management</li>
          <li><strong>Security Operations:</strong> Learn SIEM monitoring, incident response, and threat analysis</li>
          <li><strong>GRC Practices:</strong> Understand risk assessments, compliance frameworks, and audit processes</li>
        </ul>

        <h4>Program Structure:</h4>
        <ul>
          <li><strong>Phase 1 (Months 1-2):</strong> Shadow engagements, learn tools, build foundational knowledge</li>
          <li><strong>Phase 2 (Months 3-4):</strong> Assist with specific tasks under supervision (scanning, research, documentation)</li>
          <li><strong>Phase 3 (Months 5-6):</strong> Take on independent tasks with review (reporting, remediation tracking, policy drafts)</li>
          <li><strong>Mentorship:</strong> Weekly check-ins with assigned mentor, monthly progress reviews</li>
          <li><strong>Duration:</strong> 6-month commitment preferred (flexible based on availability)</li>
        </ul>

        <h4>Eligibility Requirements:</h4>
        <ul>
          <li><strong>Education:</strong> Currently pursuing or completed degree/certification in cybersecurity, IT, or related field</li>
          <li><strong>Certifications:</strong> Security+, CEH, or working toward them (preferred but not required)</li>
          <li><strong>Technical Skills:</strong> Basic networking, Linux/Windows, and security concepts</li>
          <li><strong>Time Commitment:</strong> 10-20 hours per month with consistent availability</li>
          <li><strong>Learning Mindset:</strong> Curious, self-motivated, and eager to learn from experienced professionals</li>
          <li><strong>Professionalism:</strong> Reliable, communicative, and able to handle confidential information</li>
        </ul>

        <h4 style="color: #ef4444;">⚠️ Legal Requirements:</h4>
        <div style="padding: 1.5rem; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 12px; margin: 1rem 0;">
          <ul style="margin: 0;">
            <li><strong>Non-Disclosure Agreement (NDA):</strong> All interns MUST sign a legally binding NDA covering client data, security findings, and proprietary information. Violation of NDA can result in legal action.</li>
            <li><strong>Background Check:</strong> May be required for roles involving direct client engagement or access to sensitive client systems. CyberSmrt covers the cost.</li>
            <li><strong>Confidentiality:</strong> You will have access to sensitive client information, vulnerability data, and security architectures. Absolute confidentiality is mandatory.</li>
            <li><strong>Professional Conduct:</strong> Any breach of confidentiality, ethical violations, or unprofessional behavior will result in immediate removal from the program.</li>
          </ul>
        </div>

        <h4>What You'll Gain:</h4>
        <ul>
          <li>Real-world cybersecurity experience on actual client engagements</li>
          <li>Mentorship from experienced security professionals</li>
          <li>Hands-on training with industry-standard tools (Nessus, Metasploit, Splunk, etc.)</li>
          <li>Portfolio pieces: sanitized reports, documentation, and project contributions</li>
          <li>Letter of recommendation upon successful completion</li>
          <li>Networking opportunities with cybersecurity professionals</li>
          <li>Potential pathway to paid consulting opportunities</li>
          <li>Resume-worthy experience in penetration testing, vulnerability management, and GRC</li>
        </ul>

        <h4>Application Process:</h4>
        <ol style="margin-left: 1.5rem; color: var(--text-secondary);">
          <li>Submit volunteer application with resume and areas of interest</li>
          <li>Initial video interview to discuss goals, availability, and program fit</li>
          <li>Technical skills assessment (basic security concepts and tools)</li>
          <li>NDA signature and background check (if required)</li>
          <li>Mentor assignment and program onboarding</li>
          <li>Begin Phase 1: Shadow and Learn</li>
        </ol>

        <p style="margin-top: 1.5rem; padding: 1rem; background: rgba(102, 126, 234, 0.1); border-left: 3px solid #667eea; border-radius: 8px;">
          <strong>Note:</strong> This is a competitive program with limited spots. We prioritize candidates who demonstrate strong commitment, professionalism, and alignment with CyberSmrt's mission to close the cybersecurity equity gap.
        </p>
      `,
      requiresNDA: true,
      requiresBackgroundCheck: true
    }
  };

  // Create opportunity detail modal
  function createOpportunityModal(opportunityKey) {
    const data = opportunityData[opportunityKey];
    if (!data) return null;

    const modal = document.createElement('div');
    modal.className = 'opportunity-modal';
    modal.id = `opportunity-modal-${opportunityKey}`;

    const ndaBadge = data.requiresNDA ? '<span class="badge nda-badge">NDA Required</span>' : '';
    const bgCheckBadge = data.requiresBackgroundCheck ? '<span class="badge bg-check-badge">Background Check Required</span>' : '';

    modal.innerHTML = `
      <div class="opportunity-modal-overlay"></div>
      <div class="opportunity-modal-content">
        <div class="opportunity-modal-header">
          <div class="opportunity-modal-title-row">
            <h3 class="opportunity-modal-title">
              <span class="opportunity-modal-icon">${data.icon}</span>
              ${data.title}
            </h3>
            <button class="opportunity-close-btn" aria-label="Close">&times;</button>
          </div>
          <div class="opportunity-modal-meta">
            <span class="commitment-badge">${data.commitment}</span>
            ${ndaBadge}
            ${bgCheckBadge}
          </div>
        </div>

        <div class="opportunity-modal-body">
          ${data.fullDescription}
        </div>

        <div class="opportunity-modal-footer">
          <button class="opportunity-apply-btn" onclick="window.VolunteerModal.show()">
            Apply for This Role →
          </button>
          <p style="text-align: center; color: var(--text-secondary); font-size: 0.9rem; margin-top: 1rem;">
            Questions? Email us at <a href="mailto:info@cybersmrt.org" style="color: #667eea; text-decoration: none;">info@cybersmrt.org</a>
          </p>
        </div>
      </div>
    `;

    return modal;
  }

  // Show opportunity modal
  function showOpportunityModal(opportunityKey) {
    let modal = document.getElementById(`opportunity-modal-${opportunityKey}`);

    // Create modal if it doesn't exist
    if (!modal) {
      modal = createOpportunityModal(opportunityKey);
      if (modal) {
        document.body.appendChild(modal);

        // Add close handlers
        const closeBtn = modal.querySelector('.opportunity-close-btn');
        const overlay = modal.querySelector('.opportunity-modal-overlay');

        closeBtn.addEventListener('click', () => hideOpportunityModal(opportunityKey));
        overlay.addEventListener('click', () => hideOpportunityModal(opportunityKey));

        // Prevent modal close when clicking content
        const content = modal.querySelector('.opportunity-modal-content');
        content.addEventListener('click', (e) => e.stopPropagation());
      }
    }

    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  // Hide opportunity modal
  function hideOpportunityModal(opportunityKey) {
    const modal = document.getElementById(`opportunity-modal-${opportunityKey}`);
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  // Initialize
  function init() {
    // Attach click handlers to all opportunity detail buttons
    document.querySelectorAll('.opportunity-detail-btn').forEach(button => {
      const opportunityKey = button.dataset.opportunity;
      button.addEventListener('click', () => showOpportunityModal(opportunityKey));
    });

    console.log('✅ Opportunity details modal initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export API
  window.OpportunityDetails = {
    show: showOpportunityModal,
    hide: hideOpportunityModal
  };
})();

} // End duplicate check
