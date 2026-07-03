import { api } from "./api";

function mockDashboard() {
  return {
    complianceHealthScore: 78,
    complianceScoreTrend: [
      { month: "Jan", score: 72 },
      { month: "Feb", score: 74 },
      { month: "Mar", score: 73 },
      { month: "Apr", score: 76 },
      { month: "May", score: 75 },
      { month: "Jun", score: 78 },
    ],
    stats: {
      openRisks: 23,
      criticalRisks: 4,
      activeAudits: 6,
      outstandingFindings: 14,
      policyCompliance: 87,
      obligationsDueSoon: 12,
      evidenceCoverage: 79,
    },
    riskDistribution: [
      { name: "Critical", value: 4, color: "#ef4444" },
      { name: "High", value: 8, color: "#f97316" },
      { name: "Medium", value: 11, color: "#eab308" },
      { name: "Low", value: 9, color: "#22c55e" },
    ],
    auditStatus: [
      { name: "Planning", value: 3, color: "#6b7280" },
      { name: "Active", value: 6, color: "#3b82f6" },
      { name: "Review", value: 4, color: "#eab308" },
      { name: "Closed", value: 7, color: "#22c55e" },
    ],
    incidentTrend: [
      { month: "Jan", reported: 5, resolved: 3 },
      { month: "Feb", reported: 4, resolved: 4 },
      { month: "Mar", reported: 7, resolved: 5 },
      { month: "Apr", reported: 3, resolved: 6 },
      { month: "May", reported: 6, resolved: 4 },
      { month: "Jun", reported: 4, resolved: 5 },
    ],
    recentObligations: [
      { id: 1, title: "GDPR Annual Report Filing", category: "regulatory", owner: "Legal Team", dueDate: "2026-07-15", riskLevel: "high", status: "active" },
      { id: 2, title: "SOC 2 Type II Audit", category: "regulatory", owner: "Compliance Team", dueDate: "2026-08-01", riskLevel: "critical", status: "active" },
      { id: 3, title: "ISO 27001 Surveillance", category: "industry", owner: "IT Security", dueDate: "2026-06-30", riskLevel: "high", status: "pending" },
      { id: 4, title: "Data Breach Notification", category: "legal", owner: "DPO", dueDate: "2026-06-20", riskLevel: "critical", status: "overdue" },
      { id: 5, title: "Vendor Risk Assessment", category: "contractual", owner: "Procurement", dueDate: "2026-07-10", riskLevel: "medium", status: "active" },
      { id: 6, title: "PCI DSS Quarterly Scan", category: "industry", owner: "IT Security", dueDate: "2026-07-01", riskLevel: "high", status: "pending" },
      { id: 7, title: "Annual AML Compliance Review", category: "regulatory", owner: "Compliance Officer", dueDate: "2026-08-15", riskLevel: "medium", status: "pending" },
      { id: 8, title: "HIPAA Privacy Assessment", category: "regulatory", owner: "Privacy Officer", dueDate: "2026-06-25", riskLevel: "high", status: "overdue" },
    ],
    topRisks: [
      { id: 1, title: "Data center single point of failure", probability: 4, impact: 5, score: 20, owner: "IT Director", status: "mitigating" },
      { id: 2, title: "GDPR non-compliance penalties", probability: 3, impact: 5, score: 15, owner: "DPO", status: "mitigating" },
      { id: 3, title: "Third-party vendor data breach", probability: 4, impact: 4, score: 16, owner: "Procurement", status: "identified" },
      { id: 4, title: "Insider threat - privileged access", probability: 3, impact: 4, score: 12, owner: "IT Security", status: "assessed" },
      { id: 5, title: "System availability SLA breach", probability: 3, impact: 3, score: 9, owner: "Operations", status: "mitigating" },
    ],
    activeAudits: [
      { id: 1, title: "Q2 2026 Internal Financial Audit", type: "internal", lead: "Sarah Chen", startDate: "2026-06-01", endDate: "2026-06-28", status: "active", progress: 65 },
      { id: 2, title: "SOC 2 Type II Readiness", type: "external", lead: "Deloitte", startDate: "2026-05-15", endDate: "2026-07-30", status: "active", progress: 40 },
      { id: 3, title: "ISO 27001 Internal Audit", type: "internal", lead: "Mike Johnson", startDate: "2026-06-10", endDate: "2026-07-05", status: "active", progress: 30 },
      { id: 4, title: "PCI DSS Compliance Review", type: "regulatory", lead: "QSA Assessor", startDate: "2026-06-15", endDate: "2026-08-01", status: "active", progress: 25 },
      { id: 5, title: "Vendor Security Assessment", type: "external", lead: "SecurityScorecard", startDate: "2026-06-05", endDate: "2026-07-15", status: "active", progress: 50 },
    ],
    recentIncidents: [
      { id: 1, title: "Unauthorized access attempt - production DB", severity: "critical", status: "investigating", reportedDate: "2026-06-14", assignee: "IT Security" },
      { id: 2, title: "Phishing campaign detected", severity: "high", status: "remediation", reportedDate: "2026-06-12", assignee: "Security Team" },
      { id: 3, title: "Sensitive data exposed in log files", severity: "high", status: "resolved", reportedDate: "2026-06-10", assignee: "DevOps" },
      { id: 4, title: "Policy violation - personal device usage", severity: "medium", status: "closed", reportedDate: "2026-06-08", assignee: "HR" },
      { id: 5, title: "Firewall misconfiguration", severity: "critical", status: "resolved", reportedDate: "2026-06-05", assignee: "Network Team" },
    ],
  };
}


function mockObligations() {
  return [
    { id: 1, title: "GDPR Annual Data Protection Report", category: "regulatory", owner: "Data Protection Officer", dueDate: "2026-07-15", riskLevel: "high", status: "active", description: "Submit annual data protection report to supervisory authority detailing processing activities, DPIAs, and data breaches." },
    { id: 2, title: "SOC 2 Type II Audit Completion", category: "regulatory", owner: "Compliance Director", dueDate: "2026-08-01", riskLevel: "critical", status: "active", description: "Complete SOC 2 Type II audit with external assessor covering security, availability, processing integrity, confidentiality, and privacy." },
    { id: 3, title: "ISO 27001 Surveillance Audit", category: "industry", owner: "IT Security Manager", dueDate: "2026-06-30", riskLevel: "high", status: "pending", description: "Annual ISO 27001 surveillance audit by certification body to maintain certification." },
    { id: 4, title: "Data Breach Notification to Authorities", category: "legal", owner: "Legal Counsel", dueDate: "2026-06-20", riskLevel: "critical", status: "overdue", description: "Report data breach to relevant data protection authorities within 72 hours of discovery." },
    { id: 5, title: "Vendor Risk Assessment Program", category: "contractual", owner: "Procurement Manager", dueDate: "2026-07-10", riskLevel: "medium", status: "active", description: "Conduct annual risk assessment for all critical third-party vendors and service providers." },
    { id: 6, title: "PCI DSS Quarterly ASV Scan", category: "industry", owner: "IT Security Engineer", dueDate: "2026-07-01", riskLevel: "high", status: "pending", description: "Run quarterly external vulnerability scan by Approved Scanning Vendor (ASV) for cardholder data environment." },
    { id: 7, title: "Anti-Money Laundering Compliance Review", category: "regulatory", owner: "AML Officer", dueDate: "2026-08-15", riskLevel: "medium", status: "pending", description: "Annual AML program effectiveness review including transaction monitoring, KYC, and suspicious activity reporting." },
    { id: 8, title: "HIPAA Privacy & Security Assessment", category: "regulatory", owner: "Privacy Officer", dueDate: "2026-06-25", riskLevel: "high", status: "overdue", description: "Conduct annual HIPAA risk assessment covering administrative, physical, and technical safeguards for PHI." },
    { id: 9, title: "SOX 404 Internal Control Testing", category: "regulatory", owner: "Internal Audit Director", dueDate: "2026-09-01", riskLevel: "critical", status: "active", description: "Test design and operating effectiveness of internal controls over financial reporting." },
    { id: 10, title: "BCP/DR Plan Testing", category: "industry", owner: "Business Continuity Manager", dueDate: "2026-07-30", riskLevel: "high", status: "pending", description: "Conduct semi-annual business continuity and disaster recovery plan tests including tabletop and full-scale exercises." },
    { id: 11, title: "Client SLA Compliance Report", category: "contractual", owner: "Account Management", dueDate: "2026-07-05", riskLevel: "medium", status: "active", description: "Generate monthly SLA compliance report for top 10 enterprise clients showing uptime, response times, and resolution metrics." },
    { id: 12, title: "Annual Privacy Impact Assessment", category: "regulatory", owner: "DPO", dueDate: "2026-08-30", riskLevel: "medium", status: "pending", description: "Conduct PIA for all new and significantly changed processing activities as required under GDPR Article 35." },
    { id: 13, title: "Cybersecurity Maturity Model Certification", category: "industry", owner: "CISO", dueDate: "2026-10-01", riskLevel: "high", status: "pending", description: "Achieve CMMC Level 2 certification for defense industrial base compliance." },
    { id: 14, title: "California Consumer Privacy Act Compliance", category: "legal", owner: "Privacy Counsel", dueDate: "2026-09-15", riskLevel: "high", status: "active", description: "Ensure ongoing CCPA compliance including consumer rights requests, disclosure notices, and opt-out mechanisms." },
    { id: 15, title: "NIST CSF Assessment", category: "industry", owner: "IT Risk Manager", dueDate: "2026-08-20", riskLevel: "medium", status: "pending", description: "Perform annual NIST Cybersecurity Framework assessment across identify, protect, detect, respond, and recover functions." },
    { id: 16, title: "SEC Cybersecurity Disclosure Rules", category: "regulatory", owner: "General Counsel", dueDate: "2026-07-20", riskLevel: "critical", status: "active", description: "Ensure compliance with SEC rules requiring cybersecurity incident disclosure and annual cybersecurity risk management reporting." },
    { id: 17, title: "Supplier Code of Conduct Acknowledgment", category: "contractual", owner: "Supply Chain Manager", dueDate: "2026-07-25", riskLevel: "low", status: "active", description: "Collect signed acknowledgments of updated Supplier Code of Conduct from all active suppliers." },
    { id: 18, title: "Basel III Operational Risk Reporting", category: "regulatory", owner: "Risk Officer", dueDate: "2026-08-10", riskLevel: "high", status: "pending", description: "Submit quarterly operational risk capital calculation and reporting per Basel III requirements." },
    { id: 19, title: "EU Digital Operational Resilience Act", category: "regulatory", owner: "CRO", dueDate: "2026-09-30", riskLevel: "critical", status: "pending", description: "Achieve DORA compliance including ICT risk management, incident reporting, digital operational resilience testing, and third-party risk." },
    { id: 20, title: "Data Retention Policy Compliance Audit", category: "internal", owner: "Records Manager", dueDate: "2026-07-15", riskLevel: "medium", status: "active", description: "Audit data retention and disposal practices across all departments per the Data Retention Policy." },
    { id: 21, title: "PCI DSS SAQ Submission", category: "industry", owner: "Compliance Analyst", dueDate: "2026-07-31", riskLevel: "high", status: "pending", description: "Complete and submit PCI DSS Self-Assessment Questionnaire for merchant compliance validation." },
    { id: 22, title: "FTC Safeguards Rule Compliance", category: "regulatory", owner: "Compliance Officer", dueDate: "2026-08-05", riskLevel: "high", status: "active", description: "Ensure compliance with FTC Safeguards Rule requiring information security program for financial institutions." },
    { id: 23, title: "GDPR Data Subject Access Request Process Review", category: "legal", owner: "DPO", dueDate: "2026-07-10", riskLevel: "medium", status: "active", description: "Review and update DSAR handling procedures to ensure compliance with GDPR Article 15 and 30-day response requirement." },
    { id: 24, title: "Internal Expense Policy Certification", category: "internal", owner: "Finance Director", dueDate: "2026-06-30", riskLevel: "low", status: "overdue", description: "All employees must certify understanding of updated Travel & Expense Policy." },
    { id: 25, title: "Environmental Compliance Report (EPA)", category: "regulatory", owner: "Facilities Manager", dueDate: "2026-09-01", riskLevel: "medium", status: "pending", description: "Submit annual environmental compliance report to EPA including emissions data, waste management, and remediation activities." },
    { id: 26, title: "GDPR Records of Processing Activities", category: "regulatory", owner: "DPO", dueDate: "2026-07-20", riskLevel: "medium", status: "active", description: "Maintain and update Article 30 records of processing activities for all business units." },
    { id: 27, title: "ISO 22301 Business Continuity Certification", category: "industry", owner: "BCM Director", dueDate: "2026-11-01", riskLevel: "high", status: "pending", description: "Achieve ISO 22301 certification for business continuity management system." },
    { id: 28, title: "Internal Audit Charter Review", category: "internal", owner: "Audit Committee Chair", dueDate: "2026-08-01", riskLevel: "low", status: "pending", description: "Annual review and board approval of Internal Audit Charter." },
    { id: 29, title: "GDPR Cross-Border Data Transfer Assessment", category: "regulatory", owner: "DPO", dueDate: "2026-09-15", riskLevel: "high", status: "pending", description: "Assess all cross-border data transfer mechanisms post Schrems II, update SCCs and DPF certifications." },
    { id: 30, title: "Payment Services Directive (PSD2) Compliance", category: "regulatory", owner: "Payments Compliance", dueDate: "2026-10-01", riskLevel: "high", status: "pending", description: "Ensure ongoing compliance with PSD2 including SCA, TPP access, and incident reporting requirements." },
    { id: 31, title: "Annual Ethics & Compliance Training", category: "internal", owner: "HR Director", dueDate: "2026-08-30", riskLevel: "medium", status: "pending", description: "Deliver annual ethics and compliance training to all employees covering code of conduct, anti-bribery, and conflicts of interest." },
    { id: 32, title: "IT Asset Management Policy Compliance", category: "internal", owner: "IT Operations", dueDate: "2026-07-10", riskLevel: "low", status: "active", description: "Ensure all IT assets are inventoried, classified, and managed per the IT Asset Management Policy." },
    { id: 33, title: "GDPR Data Protection Impact Assessment", category: "regulatory", owner: "DPO", dueDate: "2026-07-05", riskLevel: "high", status: "active", description: "Complete DPIA for new customer analytics platform processing personal data." },
    { id: 34, title: "SOC 2 Type I Bridge Letter", category: "regulatory", owner: "Compliance Director", dueDate: "2026-07-01", riskLevel: "high", status: "pending", description: "Prepare SOC 2 bridge letter covering period between Type II reports for client requirements." },
    { id: 35, title: "U.S. Executive Order Cybersecurity Requirements", category: "legal", owner: "CISO", dueDate: "2026-09-01", riskLevel: "high", status: "pending", description: "Implement cybersecurity requirements per Executive Order 14028 including zero trust architecture and software supply chain security." },
    { id: 36, title: "Contract Renewal - Data Processing Agreement", category: "contractual", owner: "Legal Counsel", dueDate: "2026-08-15", riskLevel: "medium", status: "active", description: "Renew data processing agreements with all sub-processors per updated GDPR requirements." },
    { id: 37, title: "NYSE Corporate Governance Listing Standards", category: "regulatory", owner: "Corporate Secretary", dueDate: "2026-09-30", riskLevel: "high", status: "pending", description: "Ensure compliance with NYSE listing standards including independent board, audit committee, and governance guidelines." },
    { id: 38, title: "Annual Conflict of Interest Disclosure", category: "internal", owner: "Legal", dueDate: "2026-08-01", riskLevel: "medium", status: "pending", description: "All officers and directors must submit annual conflict of interest disclosure statements." },
    { id: 39, title: "Cloud Security Alliance STAR Certification", category: "industry", owner: "Cloud Operations", dueDate: "2026-10-15", riskLevel: "medium", status: "pending", description: "Achieve CSA STAR Level 2 certification for cloud service provider security." },
    { id: 40, title: "Quarterly Access Review - Privileged Accounts", category: "internal", owner: "IT Security", dueDate: "2026-07-05", riskLevel: "high", status: "active", description: "Conduct quarterly review of all privileged access accounts including monitoring, justification, and revocation." },
    { id: 41, title: "GDPR Data Portability Request Processing", category: "legal", owner: "DPO", dueDate: "2026-07-25", riskLevel: "low", status: "active", description: "Process data portability requests within 30 days per GDPR Article 20, providing data in machine-readable format." },
    { id: 42, title: "SEC Whistleblower Program Compliance", category: "regulatory", owner: "General Counsel", dueDate: "2026-08-01", riskLevel: "medium", status: "pending", description: "Ensure whistleblower program compliance with SEC rules including confidentiality, anti-retaliation, and reporting channels." },
    { id: 43, title: "Annual Third-Party Due Diligence", category: "contractual", owner: "Risk Manager", dueDate: "2026-09-01", riskLevel: "high", status: "pending", description: "Complete annual enhanced due diligence for all critical and high-risk third parties." },
    { id: 44, title: "Patent Filing Deadline - Security Technology", category: "legal", owner: "IP Counsel", dueDate: "2026-07-15", riskLevel: "medium", status: "active", description: "File provisional patent application for novel zero-trust authentication technology." },
    { id: 45, title: "GDPR Cookie Consent Compliance", category: "regulatory", owner: "Digital Marketing", dueDate: "2026-07-01", riskLevel: "medium", status: "overdue", description: "Update cookie consent mechanism to meet ePrivacy Directive and GDPR requirements including granular consent and preference management." },
    { id: 46, title: "ISO 27701 Privacy Information Management", category: "industry", owner: "Privacy Officer", dueDate: "2026-12-01", riskLevel: "medium", status: "pending", description: "Achieve ISO 27701 certification to extend ISO 27001 with privacy information management requirements." },
    { id: 47, title: "FFIEC Cybersecurity Assessment", category: "regulatory", owner: "IT Risk", dueDate: "2026-09-15", riskLevel: "high", status: "pending", description: "Complete FFIEC Cybersecurity Assessment Tool for financial services regulatory compliance." },
    { id: 48, title: "Annual Risk Appetite Statement Review", category: "internal", owner: "Board Risk Committee", dueDate: "2026-08-30", riskLevel: "medium", status: "pending", description: "Board review and approval of annual risk appetite statement including quantitative and qualitative risk tolerance limits." },
    { id: 49, title: "GDPR Data Erasure Request Queue", category: "legal", owner: "DPO", dueDate: "2026-07-02", riskLevel: "medium", status: "active", description: "Clear backlog of pending right-to-erasure requests within the 30-day statutory timeframe." },
    { id: 50, title: "Service Organization Control Reporting", category: "regulatory", owner: "Compliance Manager", dueDate: "2026-08-15", riskLevel: "high", status: "pending", description: "Prepare SOC 2 Type II report for customer distribution covering all five trust services criteria." },
    { id: 51, title: "Automated Decision-Making Transparency", category: "legal", owner: "AI Ethics Officer", dueDate: "2026-09-01", riskLevel: "medium", status: "pending", description: "Document and disclose all automated decision-making systems per GDPR Article 22 and EU AI Act requirements." },
    { id: 52, title: "ISO 31000 Risk Management Implementation", category: "industry", owner: "CRO", dueDate: "2026-11-30", riskLevel: "medium", status: "pending", description: "Implement ISO 31000 risk management framework across enterprise risk management processes." },
    { id: 53, title: "Brazil LGPD Compliance Assessment", category: "regulatory", owner: "Privacy Counsel", dueDate: "2026-10-01", riskLevel: "high", status: "pending", description: "Assess compliance with Brazil Lei Geral de Proteção de Dados for operations involving Brazilian personal data." },
    { id: 54, title: "Quarterly Vulnerability Scan - External", category: "industry", owner: "Security Engineer", dueDate: "2026-07-10", riskLevel: "high", status: "active", description: "Run quarterly external vulnerability scan of all internet-facing assets and remediate critical severity findings." },
    { id: 55, title: "ISO 14001 Environmental Management", category: "industry", owner: "Sustainability Officer", dueDate: "2026-12-31", riskLevel: "low", status: "pending", description: "Achieve ISO 14001 certification for environmental management system across all facilities." },
    { id: 56, title: "Annual Information Classification Review", category: "internal", owner: "Information Security", dueDate: "2026-08-01", riskLevel: "medium", status: "pending", description: "Review and update information classification labels and handling procedures across the organization." },
    { id: 57, title: "GLBA Privacy Compliance", category: "regulatory", owner: "Privacy Officer", dueDate: "2026-09-01", riskLevel: "high", status: "pending", description: "Ensure Gramm-Leach-Bliley Act compliance including privacy notices, opt-out rights, and information safeguarding." },
    { id: 58, title: "EU AI Act Risk Classification", category: "regulatory", owner: "AI Governance Lead", dueDate: "2026-10-01", riskLevel: "critical", status: "pending", description: "Classify all AI systems per EU AI Act risk categories (unacceptable, high, limited, minimal) and prepare compliance roadmap." },
    { id: 59, title: "Social Engineering Testing Program", category: "internal", owner: "Security Awareness", dueDate: "2026-07-15", riskLevel: "medium", status: "active", description: "Conduct quarterly phishing simulation and social engineering testing across all departments." },
    { id: 60, title: "Cyber Insurance Policy Renewal", category: "contractual", owner: "Risk Manager", dueDate: "2026-08-01", riskLevel: "high", status: "active", description: "Renew cyber insurance policy with updated coverage limits based on current risk landscape." },
    { id: 61, title: "Japan APPI Compliance", category: "regulatory", owner: "Privacy Counsel", dueDate: "2026-11-01", riskLevel: "medium", status: "pending", description: "Ensure compliance with Japan's Act on Protection of Personal Information for operations involving Japanese residents' data." },
    { id: 62, title: "SWIFT CSP Assessment", category: "industry", owner: "Treasury Operations", dueDate: "2026-09-30", riskLevel: "high", status: "pending", description: "Complete SWIFT Customer Security Programme (CSP) annual attestation for payment operations." },
    { id: 63, title: "TISAX Certification", category: "industry", owner: "Automotive Compliance", dueDate: "2026-12-01", riskLevel: "medium", status: "pending", description: "Achieve TISAX certification for information security in the automotive industry supply chain." },
    { id: 64, title: "Quarterly Business Ethics Survey", category: "internal", owner: "Ethics Officer", dueDate: "2026-07-10", riskLevel: "low", status: "active", description: "Administer quarterly business ethics climate survey and analyze results for trends." },
    { id: 65, title: "Canada PIPEDA Compliance", category: "legal", owner: "Privacy Counsel", dueDate: "2026-10-01", riskLevel: "medium", status: "pending", description: "Ensure compliance with Canada's PIPEDA for commercial activities involving personal information." },
    { id: 66, title: "NIST Privacy Framework Implementation", category: "industry", owner: "Privacy Officer", dueDate: "2026-11-15", riskLevel: "medium", status: "pending", description: "Implement NIST Privacy Framework core functions: Identify-P, Govern-P, Control-P, Communicate-P, Protect-P." },
    { id: 67, title: "GDPR Processing Activity Authorization Review", category: "regulatory", owner: "DPO", dueDate: "2026-08-01", riskLevel: "medium", status: "pending", description: "Systematic review of all processing activities authorized under legitimate interest basis per GDPR Article 6(1)(f)." },
    { id: 68, title: "Climate-Related Financial Disclosures (TCFD)", category: "regulatory", owner: "Sustainability Officer", dueDate: "2026-09-30", riskLevel: "medium", status: "pending", description: "Prepare TCFD-aligned climate risk disclosure report for annual SEC filing." },
    { id: 69, title: "Annual Key Risk Indicator Review", category: "internal", owner: "Risk Analytics", dueDate: "2026-08-15", riskLevel: "medium", status: "pending", description: "Review and recalibrate enterprise key risk indicators and threshold levels." },
    { id: 70, title: "GDPR Data Breach Register Maintenance", category: "legal", owner: "DPO", dueDate: "2026-07-01", riskLevel: "low", status: "overdue", description: "Update internal data breach register with all incidents from past quarter per Article 33 requirements." },
    { id: 71, title: "ISO 27001 Internal Audit Program", category: "industry", owner: "Quality Manager", dueDate: "2026-08-01", riskLevel: "medium", status: "pending", description: "Plan and execute annual ISO 27001 internal audit program covering all clauses and control objectives." },
    { id: 72, title: "GDPR Representative Appointment (EU)", category: "legal", owner: "DPO", dueDate: "2026-07-15", riskLevel: "high", status: "active", description: "Designate GDPR Article 27 representative in EU member states where data subjects are located." },
    { id: 73, title: "Penetration Testing - External Infrastructure", category: "industry", owner: "Security Operations", dueDate: "2026-08-01", riskLevel: "high", status: "pending", description: "Schedule and scope external infrastructure penetration test covering all production environments." },
    { id: 74, title: "FCPA Anti-Bribery Compliance", category: "legal", owner: "Legal Counsel", dueDate: "2026-09-15", riskLevel: "high", status: "pending", description: "Ensure Foreign Corrupt Practices Act compliance program including anti-bribery controls, due diligence, and recordkeeping." },
    { id: 75, title: "GDPR Lead SAAS Processing Registry", category: "regulatory", owner: "DPO", dueDate: "2026-08-10", riskLevel: "medium", status: "pending", description: "Maintain and update register of processing activities identifying lead supervisory authority for cross-border processing." },
    { id: 76, title: "UK Pensions Regulator Compliance", category: "regulatory", owner: "Benefits Director", dueDate: "2026-09-01", riskLevel: "high", status: "pending", description: "Submit annual pension scheme return to The Pensions Regulator including scheme funding, governance, and member communications." },
    { id: 77, title: "IT General Controls (ITGC) Testing", category: "internal", owner: "IT Audit", dueDate: "2026-08-30", riskLevel: "high", status: "pending", description: "Test IT general controls covering access management, change management, computer operations, and program development." },
    { id: 78, title: "GDPR Data Minimization Assessment", category: "regulatory", owner: "DPO", dueDate: "2026-08-20", riskLevel: "medium", status: "pending", description: "Conduct data minimization review across all systems to ensure only necessary personal data is collected and retained." },
    { id: 79, title: "Florida SB 2624 Biometric Data Compliance", category: "legal", owner: "Privacy Counsel", dueDate: "2026-09-01", riskLevel: "high", status: "pending", description: "Ensure compliance with Florida's biometric data privacy law including notice, consent, and retention requirements." },
    { id: 80, title: "Quarterly Security Awareness Metrics", category: "internal", owner: "Security Awareness", dueDate: "2026-07-05", riskLevel: "low", status: "active", description: "Compile and report quarterly security awareness training completion and phishing simulation results." },
    { id: 81, title: "ISA 315 (Revised) Risk Assessment Standards", category: "industry", owner: "External Audit Lead", dueDate: "2026-09-30", riskLevel: "medium", status: "pending", description: "Implement ISA 315 revised risk assessment standards for financial statement audits including IT risk assessment." },
    { id: 82, title: "Payment Card Industry PIN Security", category: "industry", owner: "Payments Security", dueDate: "2026-10-01", riskLevel: "high", status: "pending", description: "Achieve PCI PIN Security compliance for payment terminal and PIN entry device management." },
    { id: 83, title: "Corporate Transparency Act Reporting", category: "legal", owner: "Corporate Secretary", dueDate: "2026-09-01", riskLevel: "high", status: "pending", description: "File beneficial ownership information reports with FinCEN per Corporate Transparency Act requirements." },
    { id: 84, title: "Quarterly SOX Certification", category: "regulatory", owner: "CFO", dueDate: "2026-07-15", riskLevel: "critical", status: "active", description: "CEO and CFO quarterly certification of internal controls over financial reporting per SOX 302." },
    { id: 85, title: "EU-U.S. Data Privacy Framework Compliance", category: "legal", owner: "DPO", dueDate: "2026-08-01", riskLevel: "high", status: "pending", description: "Self-certify and maintain compliance with EU-U.S. Data Privacy Framework for cross-border data transfers." },
    { id: 86, title: "ISO 45001 Occupational Health & Safety", category: "industry", owner: "H&S Manager", dueDate: "2026-12-01", riskLevel: "low", status: "pending", description: "Achieve ISO 45001 certification for occupational health and safety management system." },
    { id: 87, title: "Annual IT Strategy Board Presentation", category: "internal", owner: "CIO", dueDate: "2026-09-15", riskLevel: "low", status: "pending", description: "Present annual IT strategy, cybersecurity posture, and digital transformation roadmap to Board of Directors." },
    { id: 88, title: "GDPR Joint Controller Agreement Review", category: "contractual", owner: "Legal Counsel", dueDate: "2026-08-01", riskLevel: "medium", status: "pending", description: "Review and update joint controller agreements per GDPR Article 26 reflecting data sharing arrangements." },
    { id: 89, title: "MAS Technology Risk Management (Singapore)", category: "regulatory", owner: "Regional CISO", dueDate: "2026-10-01", riskLevel: "high", status: "pending", description: "Comply with MAS Technology Risk Management Notice on cyber hygiene, IT controls, and incident response." },
    { id: 90, title: "Biometric Information Privacy Act (BIPA)", category: "legal", owner: "Privacy Counsel", dueDate: "2026-09-01", riskLevel: "critical", status: "pending", description: "Ensure Illinois BIPA compliance including written policies, consent, retention schedules, and disclosure requirements." },
    { id: 91, title: "GDPR Data Protection Officer Appointment Review", category: "regulatory", owner: "Board", dueDate: "2026-08-01", riskLevel: "low", status: "pending", description: "Review DPO appointment, qualifications, and independence per GDPR Articles 37-39." },
    { id: 92, title: "SFDR Article 10 Disclosure", category: "regulatory", owner: "ESG Officer", dueDate: "2026-09-30", riskLevel: "medium", status: "pending", description: "Publish periodic disclosure for financial products per Sustainable Finance Disclosure Regulation Article 10." },
    { id: 93, title: "Customer Identity & Access Management Audit", category: "internal", owner: "IAM Architect", dueDate: "2026-08-15", riskLevel: "high", status: "pending", description: "Audit customer identity and access management controls including authentication, authorization, and lifecycle management." },
    { id: 94, title: "UK GDPR Adequacy Decision Compliance", category: "legal", owner: "DPO", dueDate: "2026-08-01", riskLevel: "medium", status: "pending", description: "Ensure UK GDPR compliance including international transfer mechanisms post-Brexit adequacy decision." },
    { id: 95, title: "Endpoint Detection & Response Coverage Review", category: "internal", owner: "SOC Manager", dueDate: "2026-07-10", riskLevel: "high", status: "active", description: "Review endpoint detection and response coverage across all managed and unmanaged devices." },
    { id: 96, title: "GDPR Pseudonymization Implementation", category: "regulatory", owner: "Data Engineering", dueDate: "2026-09-30", riskLevel: "medium", status: "pending", description: "Implement pseudonymization techniques for production data used in development and testing environments." },
    { id: 97, title: "Model Risk Management Framework", category: "industry", owner: "Model Risk Officer", dueDate: "2026-10-01", riskLevel: "high", status: "pending", description: "Implement SR 11-7 compliant model risk management framework covering model development, validation, and governance." },
    { id: 98, title: "NIST SP 800-171 Compliance", category: "industry", owner: "IT Security", dueDate: "2026-09-30", riskLevel: "high", status: "pending", description: "Achieve NIST SP 800-171 compliance for protecting controlled unclassified information in nonfederal systems." },
    { id: 99, title: "GDPR Automated Individual Decision-Making Register", category: "legal", owner: "DPO", dueDate: "2026-08-15", riskLevel: "low", status: "pending", description: "Establish register of automated individual decision-making and profiling activities per GDPR Article 22." },
    { id: 100, title: "SAAS-Client Master Service Agreement Compliance", category: "contractual", owner: "Legal Operations", dueDate: "2026-07-20", riskLevel: "medium", status: "active", description: "Verify compliance with all MSAs including SLAs, data protection terms, liability caps, and termination rights." },
  ];
}

function mockObligationsDashboard() {
  return {
    totalObligations: 100,
    activeObligations: 45,
    completedObligations: 210,
    overdueObligations: 8,
    complianceRate: 87,
    byCategory: [
      { name: "Regulatory", value: 48, color: "#8b5cf6" },
      { name: "Legal", value: 22, color: "#6366f1" },
      { name: "Contractual", value: 12, color: "#06b6d4" },
      { name: "Internal", value: 21, color: "#64748b" },
      { name: "Industry", value: 22, color: "#f59e0b" },
    ],
  };
}


function mockControls() {
  const controls = [
    { id: 1, code: "AC-1", title: "Access Control Policy and Procedures", category: "preventive", owner: "IT Security Director", frequency: "annually", status: "operating", effectiveness: "effective", description: "Formal access control policy and supporting procedures governing logical access to information systems and data." },
    { id: 2, code: "AC-2", title: "Account Management", category: "preventive", owner: "IAM Manager", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Manage information system accounts including identification, authentication, authorization, and lifecycle management." },
    { id: 3, code: "AC-3", title: "Access Enforcement", category: "preventive", owner: "IAM Manager", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Enforce approved authorizations for logical access to information systems and resources per access control policies." },
    { id: 4, code: "AC-4", title: "Information Flow Enforcement", category: "preventive", owner: "Network Security", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Enforce approved authorizations for controlling the flow of information between interconnected systems." },
    { id: 5, code: "AC-5", title: "Separation of Duties", category: "preventive", owner: "Internal Audit", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Enforce separation of duties through role-based access controls and conflicting responsibility matrices." },
    { id: 6, code: "AC-6", title: "Least Privilege", category: "preventive", owner: "IAM Manager", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Employ least privilege principle allowing only authorized access for user's legitimate functions." },
    { id: 7, code: "AC-7", title: "Unsuccessful Login Attempts", category: "detective", owner: "IT Security", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Enforce account lockout after a specified number of consecutive invalid login attempts." },
    { id: 8, code: "AC-8", title: "System Use Notification", category: "preventive", owner: "Legal Counsel", frequency: "annually", status: "operating", effectiveness: "effective", description: "Display system use notification message before granting access stating system usage monitoring and consent." },
    { id: 9, code: "AC-9", title: "Previous Logon Notification", category: "detective", owner: "IT Security", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Notify users of previous logon date/time and unsuccessful attempts to detect unauthorized access." },
    { id: 10, code: "AC-10", title: "Concurrent Session Control", category: "preventive", owner: "IAM Manager", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Limit concurrent sessions per account type based on risk classification and job requirements." },
    { id: 11, code: "AC-11", title: "Session Lock", category: "preventive", owner: "IT Operations", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Enforce session lock after 15 minutes of inactivity requiring re-authentication to unlock." },
    { id: 12, code: "AC-12", title: "Session Termination", category: "preventive", owner: "IT Operations", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Automatically terminate remote sessions and network connections after defined period of inactivity." },
    { id: 13, code: "AU-1", title: "Audit and Accountability Policy", category: "detective", owner: "Compliance Director", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish audit and accountability policy covering event logging, log retention, and audit trail review." },
    { id: 14, code: "AU-2", title: "Audit Events", category: "detective", owner: "SOC Manager", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Define auditable events including access attempts, privilege changes, system events, and data access." },
    { id: 15, code: "AU-3", title: "Content of Audit Records", category: "detective", owner: "SOC Manager", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Ensure audit records contain sufficient detail including event type, timestamp, user identity, and outcome." },
    { id: 16, code: "AU-4", title: "Audit Log Storage Capacity", category: "detective", owner: "IT Operations", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Allocate sufficient audit log storage capacity meeting retention requirements and projected logging volume." },
    { id: 17, code: "AU-5", title: "Response to Audit Processing Failures", category: "corrective", owner: "SOC Manager", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Alert security team within 15 minutes of audit logging failure and initiate remediation procedures." },
    { id: 18, code: "AU-6", title: "Audit Review, Analysis, and Reporting", category: "detective", owner: "SOC Manager", frequency: "weekly", status: "operating", effectiveness: "effective", description: "Review and analyze audit records weekly for indicators of compromise, policy violations, and anomalies." },
    { id: 19, code: "AU-7", title: "Audit Reduction and Report Generation", category: "detective", owner: "SOC Analyst", frequency: "weekly", status: "operating", effectiveness: "effective", description: "Support on-demand audit record reduction and report generation for security investigations and compliance." },
    { id: 20, code: "AU-8", title: "Time Stamps", category: "detective", owner: "IT Operations", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Synchronize system clocks using authoritative time source to UTC for accurate audit trail correlation." },
    { id: 21, code: "AU-9", title: "Protection of Audit Information", category: "preventive", owner: "IT Security", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Protect audit information and logging tools from unauthorized access, modification, and deletion." },
    { id: 22, code: "AU-10", title: "Non-repudiation", category: "detective", owner: "IT Security", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Protect audit information against alteration and provide non-repudiation of electronic transactions." },
    { id: 23, code: "AU-11", title: "Audit Log Retention", category: "detective", owner: "Records Manager", frequency: "annually", status: "operating", effectiveness: "effective", description: "Retain audit logs for minimum 12 months online and 36 months offline per regulatory requirements." },
    { id: 24, code: "CM-1", title: "Configuration Management Policy", category: "preventive", owner: "IT Operations Director", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish configuration management policy covering baseline configurations, change control, and monitoring." },
    { id: 25, code: "CM-2", title: "Baseline Configuration", category: "preventive", owner: "IT Engineering", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Maintain baseline configurations for all information systems including hardware, software, and firmware." },
    { id: 26, code: "CM-3", title: "Configuration Change Control", category: "preventive", owner: "Change Management", frequency: "daily", status: "operating", effectiveness: "effective", description: "Control changes to information systems through formal change management including approval, testing, and documentation." },
    { id: 27, code: "CM-4", title: "Security Impact Analysis", category: "detective", owner: "Security Architect", frequency: "per_change", status: "operating", effectiveness: "effective", description: "Analyze security impact of changes before implementation identifying potential control weaknesses." },
    { id: 28, code: "CM-5", title: "Access Restrictions for Change", category: "preventive", owner: "IAM Manager", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Define and enforce access restrictions for configuration changes through role-based approval workflows." },
    { id: 29, code: "CM-6", title: "Configuration Settings", category: "preventive", owner: "IT Engineering", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Establish and enforce security configuration settings for all information systems using industry benchmarks." },
    { id: 30, code: "CM-7", title: "Least Functionality", category: "preventive", owner: "IT Engineering", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Configure systems to provide only essential capabilities, disabling unnecessary ports, protocols, and services." },
    { id: 31, code: "CM-8", title: "System Component Inventory", category: "detective", owner: "IT Asset Manager", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Maintain accurate inventory of all system components including hardware, software, and network devices." },
    { id: 32, code: "CM-9", title: "Configuration Management Plan", category: "directive", owner: "IT Operations Director", frequency: "annually", status: "operating", effectiveness: "effective", description: "Develop and maintain configuration management plan covering roles, processes, tools, and compliance monitoring." },
    { id: 33, code: "CM-10", title: "Software Usage Restrictions", category: "preventive", owner: "IT Procurement", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Enforce software usage restrictions through application whitelisting and software asset management." },
    { id: 34, code: "CM-11", title: "User-Installed Software", category: "preventive", owner: "IT Operations", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Prohibit user-installed software on managed systems through endpoint security policies and technical controls." },
    { id: 35, code: "IR-1", title: "Incident Response Policy", category: "directive", owner: "CISO", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish incident response policy covering preparation, detection, analysis, containment, eradication, and recovery." },
    { id: 36, code: "IR-2", title: "Incident Response Training", category: "corrective", owner: "Security Awareness", frequency: "annually", status: "operating", effectiveness: "effective", description: "Provide incident response training to all personnel with incident response roles and responsibilities." },
    { id: 37, code: "IR-3", title: "Incident Response Testing", category: "corrective", owner: "SOC Manager", frequency: "annually", status: "operating", effectiveness: "effective", description: "Test incident response capability through tabletop exercises, simulations, and full-scale drills." },
    { id: 38, code: "IR-4", title: "Incident Handling", category: "corrective", owner: "SOC Manager", frequency: "ongoing", status: "operating", effectiveness: "effective", description: "Implement incident handling procedures for detection, analysis, containment, eradication, and recovery." },
    { id: 39, code: "IR-5", title: "Incident Monitoring", category: "detective", owner: "SOC Analyst", frequency: "continuous", status: "operating", effectiveness: "effective", description: "Continuously monitor for security incidents using SIEM, EDR, and threat intelligence feeds." },
    { id: 40, code: "IR-6", title: "Incident Reporting", category: "corrective", owner: "SOC Manager", frequency: "per_incident", status: "operating", effectiveness: "effective", description: "Establish incident reporting channels requiring personnel to report security incidents within 1 hour." },
    { id: 41, code: "IR-7", title: "Incident Response Assistance", category: "corrective", owner: "CISO", frequency: "ongoing", status: "operating", effectiveness: "effective", description: "Provide incident response resources including forensic analysis, malware analysis, and legal support." },
    { id: 42, code: "IR-8", title: "Incident Response Plan", category: "directive", owner: "CISO", frequency: "annually", status: "operating", effectiveness: "effective", description: "Maintain comprehensive incident response plan with defined roles, procedures, and communication templates." },
    { id: 43, code: "IR-9", title: "Information Spillage Response", category: "corrective", owner: "DPO", frequency: "per_incident", status: "operating", effectiveness: "effective", description: "Respond to information spillage incidents including containment, assessment, remediation, and notification." },
    { id: 44, code: "MP-1", title: "Media Protection Policy", category: "directive", owner: "IT Security", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish media protection policy covering media access, transport, sanitization, and disposal." },
    { id: 45, code: "MP-2", title: "Media Access", category: "preventive", owner: "IAM Manager", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Restrict access to digital and physical media containing sensitive information to authorized personnel." },
    { id: 46, code: "MP-3", title: "Media Marking", category: "preventive", owner: "Information Security", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Mark media containing sensitive information with appropriate classification labels and handling instructions." },
    { id: 47, code: "MP-4", title: "Media Storage", category: "preventive", owner: "Facilities", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Store physical media containing sensitive information in secure, access-controlled facilities." },
    { id: 48, code: "MP-5", title: "Media Transport", category: "preventive", owner: "Logistics", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Protect digital media during transport using encryption, tamper-evident packaging, and chain of custody." },
    { id: 49, code: "MP-6", title: "Media Sanitization", category: "corrective", owner: "IT Operations", frequency: "per_disposal", status: "operating", effectiveness: "effective", description: "Sanitize digital media before disposal or reuse using NIST SP 800-88 approved methods." },
    { id: 50, code: "MP-7", title: "Media Use", category: "preventive", owner: "IT Security", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Restrict use of portable storage devices on organizational systems using DLP and device control." },
    { id: 51, code: "PS-1", title: "Personnel Security Policy", category: "directive", owner: "HR Director", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish personnel security policy covering background checks, access agreements, and termination procedures." },
    { id: 52, code: "PS-2", title: "Position Risk Designation", category: "preventive", owner: "HR Director", frequency: "per_role", status: "operating", effectiveness: "effective", description: "Designate risk levels for positions and screen individuals accordingly before and during employment." },
    { id: 53, code: "PS-3", title: "Personnel Screening", category: "preventive", owner: "HR Operations", frequency: "per_hire", status: "operating", effectiveness: "effective", description: "Conduct background screening including criminal, credit, and reference checks commensurate with position risk." },
    { id: 54, code: "PS-4", title: "Personnel Termination", category: "corrective", owner: "HR Operations", frequency: "per_termination", status: "operating", effectiveness: "effective", description: "Execute termination procedures including access revocation, asset return, and exit interview within 24 hours." },
    { id: 55, code: "PS-5", title: "Personnel Transfer", category: "preventive", owner: "HR Operations", frequency: "per_transfer", status: "operating", effectiveness: "effective", description: "Review logical and physical access authorizations upon personnel reassignment or transfer." },
    { id: 56, code: "PS-6", title: "Access Agreements", category: "preventive", owner: "HR Operations", frequency: "per_hire", status: "operating", effectiveness: "effective", description: "Require access agreements and NDAs signed before granting access to sensitive information systems." },
    { id: 57, code: "PS-7", title: "Third-Party Personnel Security", category: "preventive", owner: "Procurement", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Require third-party organizations to provide appropriate personnel security controls for their personnel." },
    { id: 58, code: "PS-8", title: "Personnel Sanctions", category: "corrective", owner: "HR Director", frequency: "per_violation", status: "operating", effectiveness: "effective", description: "Enforce formal sanctions for personnel failing to comply with security policies and procedures." },
    { id: 59, code: "RA-1", title: "Risk Assessment Policy", category: "directive", owner: "CRO", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish risk assessment policy covering risk methodology, frequency, scope, and reporting." },
    { id: 60, code: "RA-2", title: "Security Categorization", category: "preventive", owner: "Information Security", frequency: "per_system", status: "operating", effectiveness: "effective", description: "Categorize information systems per FIPS 199 standards for confidentiality, integrity, and availability impact." },
    { id: 61, code: "RA-3", title: "Risk Assessment", category: "detective", owner: "Risk Team", frequency: "annually", status: "operating", effectiveness: "effective", description: "Conduct comprehensive risk assessments at least annually using NIST SP 800-30 methodology." },
    { id: 62, code: "RA-4", title: "Risk Assessment Update", category: "detective", owner: "Risk Team", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Update risk assessments when significant changes occur including new threats, system changes, or business processes." },
    { id: 63, code: "RA-5", title: "Vulnerability Scanning", category: "detective", owner: "Security Engineering", frequency: "weekly", status: "operating", effectiveness: "effective", description: "Scan for vulnerabilities across infrastructure, applications, and containers using authenticated and unauthenticated scans." },
    { id: 64, code: "RA-6", title: "Technical Surveillance Countermeasures", category: "detective", owner: "Physical Security", frequency: "annually", status: "operating", effectiveness: "effective", description: "Employ technical surveillance countermeasures to detect unauthorized surveillance in sensitive areas." },
    { id: 65, code: "SA-1", title: "System and Services Acquisition Policy", category: "directive", owner: "Procurement Director", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish system and services acquisition policy covering security requirements, vendor assessment, and contracts." },
    { id: 66, code: "SA-2", title: "Allocation of Resources", category: "preventive", owner: "Finance", frequency: "annually", status: "operating", effectiveness: "effective", description: "Allocate resources for security controls in system development lifecycle and acquisition processes." },
    { id: 67, code: "SA-3", title: "System Development Lifecycle", category: "preventive", owner: "Engineering Director", frequency: "per_project", status: "operating", effectiveness: "effective", description: "Integrate security into SDLC including secure coding standards, code review, and security testing gates." },
    { id: 68, code: "SA-4", title: "Acquisition Process", category: "preventive", owner: "Procurement", frequency: "per_acquisition", status: "operating", effectiveness: "effective", description: "Include security requirements in acquisitions including SLAs, security assessments, and contractual provisions." },
    { id: 69, code: "SA-5", title: "Information System Documentation", category: "directive", owner: "Technical Writing", frequency: "per_system", status: "operating", effectiveness: "effective", description: "Maintain system documentation including architecture, configuration, security controls, and user guides." },
    { id: 70, code: "SA-6", title: "Software Usage Restrictions", category: "preventive", owner: "IT Procurement", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Track and enforce software licensing compliance through software asset management program." },
    { id: 71, code: "SA-7", title: "User-Installed Software", category: "preventive", owner: "IT Operations", frequency: "weekly", status: "operating", effectiveness: "effective", description: "Prevent installation of non-approved software through endpoint management and privilege controls." },
    { id: 72, code: "SA-8", title: "Security Engineering Principles", category: "preventive", owner: "Security Architect", frequency: "per_project", status: "operating", effectiveness: "effective", description: "Apply security engineering principles including defense in depth, least privilege, and secure defaults." },
    { id: 73, code: "SA-9", title: "External Information System Services", category: "preventive", owner: "Procurement", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Assess external service providers for security capabilities and compliance before engagement." },
    { id: 74, code: "SA-10", title: "Developer Configuration Management", category: "preventive", owner: "Engineering", frequency: "per_release", status: "operating", effectiveness: "effective", description: "Require developers to implement configuration management for system development and integration." },
    { id: 75, code: "SC-1", title: "System and Communications Protection Policy", category: "directive", owner: "CISO", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish system and communications protection policy covering boundary defense, cryptography, and network security." },
    { id: 76, code: "SC-2", title: "Application Partitioning", category: "preventive", owner: "Architecture", frequency: "per_system", status: "operating", effectiveness: "effective", description: "Partition applications into components in separate security domains or tiers." },
    { id: 77, code: "SC-3", title: "Security Function Isolation", category: "preventive", owner: "Architecture", frequency: "per_system", status: "operating", effectiveness: "effective", description: "Isolate security functions from non-security functions through hardware separation or virtualization." },
    { id: 78, code: "SC-4", title: "Information in Shared Resources", category: "preventive", owner: "IT Engineering", frequency: "per_system", status: "operating", effectiveness: "effective", description: "Prevent unauthorized information transfer through shared system resources via proper isolation." },
    { id: 79, code: "SC-5", title: "Denial of Service Protection", category: "preventive", owner: "Network Security", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Employ DDoS protection for internet-facing services including rate limiting and traffic filtering." },
    { id: 80, code: "SC-6", title: "Resource Availability", category: "preventive", owner: "Infrastructure", frequency: "weekly", status: "operating", effectiveness: "effective", description: "Monitor resource availability and allocate resources to ensure minimum service levels." },
    { id: 81, code: "SC-7", title: "Boundary Protection", category: "preventive", owner: "Network Security", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Monitor and control communications at external and internal boundaries using firewalls and IDS/IPS." },
    { id: 82, code: "SC-8", title: "Transmission Confidentiality and Integrity", category: "preventive", owner: "Network Security", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Protect transmitted information using TLS 1.3 encryption for all data in transit." },
    { id: 83, code: "SC-9", title: "Transmission Confidentiality", category: "preventive", owner: "Network Security", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Encrypt wireless communications using WPA3-Enterprise with 802.1X authentication." },
    { id: 84, code: "SC-10", title: "Network Disconnect", category: "preventive", owner: "IT Operations", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Automatically terminate network connections after 30 minutes of inactivity for remote access sessions." },
    { id: 85, code: "SC-11", title: "Trusted Path", category: "preventive", owner: "IT Security", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Establish trusted communications path between user and security functions during authentication." },
    { id: 86, code: "SC-12", title: "Cryptographic Key Management", category: "preventive", owner: "Security Engineering", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Manage cryptographic keys using HSM and key management service with defined rotation and escrow processes." },
    { id: 87, code: "SC-13", title: "Cryptographic Protection", category: "preventive", owner: "Security Engineering", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Implement FIPS 140-3 validated cryptography for all encryption requirements." },
    { id: 88, code: "SC-14", title: "Public Access Protections", category: "preventive", owner: "Web Security", frequency: "weekly", status: "operating", effectiveness: "effective", description: "Protect publicly accessible systems using WAF, bot management, and application layer filtering." },
    { id: 89, code: "SC-15", title: "Collaborative Computing Devices", category: "preventive", owner: "IT Operations", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Disable collaborative computing devices and features when not in use per policy." },
    { id: 90, code: "SC-16", title: "Transmission of Security Attributes", category: "preventive", owner: "Security Architect", frequency: "per_system", status: "operating", effectiveness: "effective", description: "Associate security attributes with information during transmission between systems." },
    { id: 91, code: "SC-17", title: "Public Key Infrastructure Certificates", category: "preventive", owner: "PKI Manager", frequency: "weekly", status: "operating", effectiveness: "effective", description: "Issue and manage public key certificates using automated certificate lifecycle management." },
    { id: 92, code: "SC-18", title: "Mobile Code", category: "preventive", owner: "IT Security", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Control mobile code execution through allowlisting and sandboxing for JavaScript, ActiveX, and Flash." },
    { id: 93, code: "SC-19", title: "Voice Over Internet Protocol", category: "preventive", owner: "Telecom", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Secure VoIP communications using SRTP encryption and session border controllers." },
    { id: 94, code: "SC-20", title: "Secure Name/Address Resolution Service", category: "preventive", owner: "Network Engineering", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Implement DNSSEC for authoritative DNS zones to prevent DNS spoofing and cache poisoning." },
    { id: 95, code: "SC-21", title: "Secure Name/Address Resolution Service (Recursive)", category: "preventive", owner: "Network Engineering", frequency: "monthly", status: "operating", effectiveness: "effective", description: "Secure recursive DNS resolution using DNS-over-HTTPS or DNS-over-TLS for internal resolvers." },
    { id: 96, code: "SC-22", title: "Architecture and Provisioning for Name/Address Resolution Service", category: "directive", owner: "Network Architect", frequency: "annually", status: "operating", effectiveness: "effective", description: "Maintain distributed DNS server architecture for redundancy and performance." },
    { id: 97, code: "SI-1", title: "System and Information Integrity Policy", category: "directive", owner: "CISO", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish system and information integrity policy covering flaw remediation, malware protection, and monitoring." },
    { id: 98, code: "SI-2", title: "Flaw Remediation", category: "corrective", owner: "Patch Management", frequency: "weekly", status: "operating", effectiveness: "effective", description: "Identify, report, and remediate system flaws including applying security patches within SLA timelines." },
    { id: 99, code: "SI-3", title: "Malicious Code Protection", category: "preventive", owner: "Security Engineering", frequency: "daily", status: "operating", effectiveness: "effective", description: "Deploy and update anti-malware protection on all endpoints and email gateways with automated signature updates." },
    { id: 100, code: "SI-4", title: "Information System Monitoring", category: "detective", owner: "SOC Manager", frequency: "continuous", status: "operating", effectiveness: "effective", description: "Monitor the information system for security events and anomalies using SIEM with 24/7 coverage." },
    { id: 101, code: "SI-5", title: "Security Alerts, Advisories, and Directives", category: "detective", owner: "Threat Intel", frequency: "daily", status: "operating", effectiveness: "effective", description: "Receive and disseminate security alerts from CISA, ISACs, and vendor security advisories." },
    { id: 102, code: "SI-6", title: "Security and Privacy Function Verification", category: "detective", owner: "Quality Assurance", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Verify correct operation of security functions including authentication, access control, and audit logging." },
    { id: 103, code: "SI-7", title: "Software, Firmware, and Information Integrity", category: "detective", owner: "DevOps", frequency: "per_deployment", status: "operating", effectiveness: "effective", description: "Verify integrity of software and information using cryptographic hashes during deployment and runtime." },
    { id: 104, code: "SI-8", title: "Spam Protection", category: "preventive", owner: "Email Security", frequency: "daily", status: "operating", effectiveness: "effective", description: "Filter spam and phishing emails using DMARC, DKIM, SPF, and advanced threat protection." },
    { id: 105, code: "SI-9", title: "Information Input Restrictions", category: "preventive", owner: "Application Security", frequency: "per_release", status: "operating", effectiveness: "effective", description: "Validate and sanitize all information system inputs to prevent injection attacks and data corruption." },
    { id: 106, code: "SI-10", title: "Information Input Validation", category: "preventive", owner: "AppSec Team", frequency: "per_release", status: "operating", effectiveness: "effective", description: "Perform input validation on all data inputs across web, API, and batch processing interfaces." },
    { id: 107, code: "SI-11", title: "Error Handling", category: "preventive", owner: "Development", frequency: "per_release", status: "operating", effectiveness: "effective", description: "Generate minimal error messages without revealing system details in production environments." },
    { id: 108, code: "SI-12", title: "Information Handling and Retention", category: "directive", owner: "Records Manager", frequency: "quarterly", status: "operating", effectiveness: "effective", description: "Handle and retain information per data classification policy and legal retention requirements." },
    { id: 109, code: "SI-13", title: "Predictable Failure Prevention", category: "preventive", owner: "Site Reliability", frequency: "weekly", status: "operating", effectiveness: "effective", description: "Monitor system metrics to predict and prevent failures before they impact operations." },
    { id: 110, code: "SI-14", title: "Non-Persistence", category: "preventive", owner: "IT Operations", frequency: "per_session", status: "operating", effectiveness: "effective", description: "Implement non-persistent virtual desktop sessions for high-risk user activities." },
    { id: 111, code: "SI-15", title: "Information Output Filtering", category: "preventive", owner: "AppSec Team", frequency: "per_release", status: "operating", effectiveness: "effective", description: "Filter output to prevent sensitive data leakage through API responses and error messages." },
    { id: 112, code: "SI-16", title: "Memory Protection", category: "preventive", owner: "Platform Engineering", frequency: "per_release", status: "operating", effectiveness: "effective", description: "Implement memory protection controls including ASLR, DEP, and stack canaries." },
    { id: 113, code: "PL-1", title: "Planning Policy", category: "directive", owner: "CISO", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish planning policy covering security planning, risk management, and system security plans." },
    { id: 114, code: "PL-2", title: "System Security Plan", category: "directive", owner: "Information Security", frequency: "annually", status: "operating", effectiveness: "effective", description: "Develop and maintain system security plans for all major information systems." },
    { id: 115, code: "PL-3", title: "System Security Plan Update", category: "corrective", owner: "Information Security", frequency: "per_change", status: "operating", effectiveness: "effective", description: "Update system security plans when significant changes occur to the system or its environment." },
    { id: 116, code: "PL-4", title: "Rules of Behavior", category: "directive", owner: "HR Director", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish and enforce rules of behavior for information system usage by all personnel." },
    { id: 117, code: "CA-1", title: "Security Assessment and Authorization Policy", category: "directive", owner: "Compliance Director", frequency: "annually", status: "operating", effectiveness: "effective", description: "Establish security assessment and authorization policy covering assessment methodology, frequency, and reporting." },
    { id: 118, code: "CA-2", title: "Security Assessments", category: "detective", owner: "Compliance Team", frequency: "annually", status: "operating", effectiveness: "effective", description: "Conduct comprehensive security assessments annually and upon significant system changes." },
    { id: 119, code: "CA-3", title: "System Interconnections", category: "preventive", owner: "Network Security", frequency: "per_connection", status: "operating", effectiveness: "effective", description: "Authorize and document all system interconnections with security controls for each interface." },
    { id: 120, code: "CA-4", title: "Continuous Monitoring Strategy", category: "detective", owner: "Security Operations", frequency: "continuous", status: "operating", effectiveness: "effective", description: "Implement continuous monitoring strategy for security controls, vulnerabilities, and compliance status." },
  ];
  return controls.map(c => ({
    ...c,
    name: c.title,
    framework: c.category,
    controlId: c.code,
    lastTested: new Date(Date.now() - c.id * 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    testingFrequency: c.frequency,
    evidenceCount: (c.id * 7) % 50 + 5,
  }));
}

function mockControlsSummary() {
  const controls = getControls();
  return {
    total: controls.length,
    byStatus: {
      operating: controls.filter(c => c.status === "operating").length,
      implemented: controls.filter(c => c.status === "implemented").length,
      not_operating: controls.filter(c => c.status === "not_operating").length,
      remediating: controls.filter(c => c.status === "remediating").length,
      not_applicable: controls.filter(c => c.status === "not_applicable").length,
    },
    byEffectiveness: {
      effective: controls.filter(c => c.effectiveness === "effective").length,
      partially_effective: controls.filter(c => c.effectiveness === "partially_effective").length,
      not_effective: controls.filter(c => c.effectiveness === "not_effective").length,
      not_tested: controls.filter(c => c.effectiveness === "not_tested").length,
    },
    byCategory: {
      preventive: controls.filter(c => c.category === "preventive").length,
      detective: controls.filter(c => c.category === "detective").length,
      corrective: controls.filter(c => c.category === "corrective").length,
      directive: controls.filter(c => c.category === "directive").length,
      compensating: controls.filter(c => c.category === "compensating").length,
    },
  };
}


function mockRisks() {
  const risks = [
    { id: 1, title: "Data center single point of failure", probability: 4, impact: 5, score: 20, owner: "IT Director", status: "mitigating", category: "operational", description: "Primary data center lacks full redundancy. A catastrophic failure could lead to extended downtime and data loss." },
    { id: 2, title: "GDPR non-compliance penalties", probability: 3, impact: 5, score: 15, owner: "DPO", status: "mitigating", category: "regulatory", description: "Non-compliance with GDPR requirements could result in fines up to 4% of annual global turnover." },
    { id: 3, title: "Third-party vendor data breach", probability: 4, impact: 4, score: 16, owner: "Procurement Director", status: "identified", category: "third_party", description: "Critical vendors with access to sensitive data may have inadequate security controls, creating supply chain risk." },
    { id: 4, title: "Insider threat - privileged access misuse", probability: 3, impact: 4, score: 12, owner: "IT Security Director", status: "assessed", category: "security", description: "Privileged users with extensive access rights could intentionally or accidentally exfiltrate sensitive data." },
    { id: 5, title: "Cloud infrastructure misconfiguration", probability: 4, impact: 3, score: 12, owner: "CloudOps Manager", status: "mitigating", category: "operational", description: "Cloud resources misconfigured could lead to data exposure or unauthorized access to production environments." },
    { id: 6, title: "Ransomware attack on critical systems", probability: 3, impact: 5, score: 15, owner: "CISO", status: "mitigating", category: "security", description: "Sophisticated ransomware could encrypt critical systems causing operational shutdown and data loss." },
    { id: 7, title: "Regulatory change - EU AI Act", probability: 4, impact: 4, score: 16, owner: "General Counsel", status: "identified", category: "regulatory", description: "New EU AI Act requirements may require significant changes to AI/ML systems and documentation." },
    { id: 8, title: "Talent retention in cybersecurity", probability: 3, impact: 3, score: 9, owner: "HR Director", status: "assessed", category: "strategic", description: "Difficulty retaining skilled cybersecurity professionals could weaken security posture." },
    { id: 9, title: "Supply chain disruption", probability: 3, impact: 4, score: 12, owner: "Supply Chain VP", status: "assessed", category: "operational", description: "Concentration of critical suppliers in geopolitically unstable regions could disrupt operations." },
    { id: 10, title: "Data privacy litigation", probability: 2, impact: 5, score: 10, owner: "General Counsel", status: "identified", category: "legal", description: "Class-action lawsuits from data privacy incidents could result in significant financial and reputational damage." },
    { id: 11, title: "SOC 2 report qualification", probability: 3, impact: 4, score: 12, owner: "Compliance Director", status: "mitigating", category: "regulatory", description: "Failure to achieve unqualified SOC 2 opinion could result in customer loss and revenue impact." },
    { id: 12, title: "Phishing and social engineering attacks", probability: 5, impact: 3, score: 15, owner: "Security Awareness Manager", status: "mitigating", category: "security", description: "Sophisticated phishing campaigns targeting employees could lead to credential compromise and data breach." },
    { id: 13, title: "API security vulnerabilities", probability: 4, impact: 3, score: 12, owner: "Application Security Lead", status: "mitigating", category: "security", description: "Exposed or vulnerable APIs could be exploited to access sensitive data or perform unauthorized actions." },
    { id: 14, title: "Business continuity plan failure", probability: 2, impact: 5, score: 10, owner: "BCM Director", status: "assessed", category: "operational", description: "Untested or outdated BCP may fail during actual crisis, leading to extended downtime." },
    { id: 15, title: "Intellectual property theft", probability: 3, impact: 4, score: 12, owner: "Legal Counsel", status: "identified", category: "legal", description: "Trade secrets and proprietary technology could be stolen by competitors or nation-state actors." },
    { id: 16, title: "Zero-day vulnerability exploitation", probability: 3, impact: 5, score: 15, owner: "Vulnerability Management", status: "mitigating", category: "security", description: "Unknown vulnerabilities in critical software could be exploited before patches are available." },
    { id: 17, title: "Financial reporting misstatement", probability: 2, impact: 5, score: 10, owner: "CFO", status: "assessed", category: "financial", description: "Material weakness in financial reporting controls could lead to SOX non-compliance and restatement." },
    { id: 18, title: "Cryptographic key compromise", probability: 2, impact: 5, score: 10, owner: "PKI Manager", status: "mitigating", category: "security", description: "Compromise of root CA or signing keys could undermine all encrypted communications and trust." },
    { id: 19, title: "Vendor lock-in - critical SaaS platform", probability: 3, impact: 3, score: 9, owner: "CTO", status: "assessed", category: "strategic", description: "Dependence on single vendor for critical platform creates switching cost and negotiation disadvantage." },
    { id: 20, title: "Multi-factor authentication bypass", probability: 3, impact: 4, score: 12, owner: "IAM Director", status: "identified", category: "security", description: "Emerging MFA bypass techniques (MFA fatigue, SIM swapping) could compromise authentication controls." },
    { id: 21, title: "Cross-border data transfer restrictions", probability: 4, impact: 4, score: 16, owner: "DPO", status: "identified", category: "regulatory", description: "Increasing data localization laws and invalidation of transfer mechanisms could impact global operations." },
    { id: 22, title: "DevOps pipeline compromise", probability: 3, impact: 5, score: 15, owner: "DevSecOps Lead", status: "mitigating", category: "security", description: "Compromised CI/CD pipeline could inject malicious code into production software supply chain." },
    { id: 23, title: "Customer churn post-security incident", probability: 3, impact: 4, score: 12, owner: "Customer Success VP", status: "identified", category: "reputational", description: "Security incidents erode customer trust leading to increased churn and reduced revenue." },
    { id: 24, title: "Inadequate employee security training", probability: 4, impact: 2, score: 8, owner: "HR Director", status: "assessed", category: "operational", description: "Insufficient security awareness training increases likelihood of successful social engineering attacks." },
    { id: 25, title: "Physical security breach at data center", probability: 2, impact: 5, score: 10, owner: "Facilities Director", status: "mitigating", category: "physical", description: "Unauthorized physical access to data center could result in theft, damage, or data compromise." },
    { id: 26, title: "Non-compliance with SEC cybersecurity rules", probability: 3, impact: 4, score: 12, owner: "SEC Counsel", status: "identified", category: "regulatory", description: "SEC cybersecurity disclosure rules require timely incident reporting and risk management disclosure." },
    { id: 27, title: "Software supply chain attack", probability: 3, impact: 5, score: 15, owner: "Software Engineering VP", status: "mitigating", category: "security", description: "Compromised open-source or third-party components could introduce vulnerabilities or backdoors." },
    { id: 28, title: "Data retention compliance failure", probability: 3, impact: 3, score: 9, owner: "Records Manager", status: "assessed", category: "regulatory", description: "Failure to properly retain and dispose of records per legal requirements could result in penalties." },
    { id: 29, title: "Insider trading compliance", probability: 2, impact: 4, score: 8, owner: "Corporate Secretary", status: "assessed", category: "legal", description: "Inadequate insider trading controls could result in SEC enforcement actions and reputational harm." },
    { id: 30, title: "Cloud cost overrun", probability: 4, impact: 2, score: 8, owner: "CloudOps Manager", status: "mitigating", category: "financial", description: "Uncontrolled cloud spending could significantly exceed budget due to misconfigured resources or sprawl." },
    { id: 31, title: "GDPR data subject request backlog", probability: 3, impact: 3, score: 9, owner: "DPO", status: "identified", category: "regulatory", description: "Growing volume of DSARs creates risk of missing statutory response deadlines." },
    { id: 32, title: "Legacy system end-of-life", probability: 4, impact: 3, score: 12, owner: "IT Operations Director", status: "identified", category: "operational", description: "Critical legacy systems reaching end-of-life without vendor support create security and operational risks." },
    { id: 33, title: "Wire transfer fraud", probability: 2, impact: 5, score: 10, owner: "Treasury Director", status: "mitigating", category: "financial", description: "Business email compromise leading to fraudulent wire transfers could cause direct financial loss." },
    { id: 34, title: "Ethical AI compliance risk", probability: 3, impact: 3, score: 9, owner: "AI Ethics Officer", status: "identified", category: "regulatory", description: "AI systems may produce biased outcomes leading to regulatory scrutiny and reputational damage." },
    { id: 35, title: "COVID-19/pandemic operational impact", probability: 1, impact: 4, score: 4, owner: "BCM Director", status: "accepted", category: "operational", description: "Future pandemic waves could impact workforce availability and operational continuity." },
    { id: 36, title: "Software licensing compliance", probability: 3, impact: 2, score: 6, owner: "IT Procurement", status: "mitigating", category: "financial", description: "Non-compliance with software licensing terms could result in audit penalties and legal action." },
    { id: 37, title: "Anti-bribery and corruption", probability: 2, impact: 5, score: 10, owner: "Chief Ethics Officer", status: "mitigating", category: "legal", description: "FCPA violations from improper payments in high-risk jurisdictions could result in criminal penalties." },
    { id: 38, title: "Environmental compliance (EPA)", probability: 2, impact: 3, score: 6, owner: "Sustainability Officer", status: "assessed", category: "regulatory", description: "Environmental regulations non-compliance could result in fines and operational restrictions." },
    { id: 39, title: "Conflict minerals compliance", probability: 2, impact: 3, score: 6, owner: "Supply Chain", status: "assessed", category: "regulatory", description: "SEC conflict minerals rule requires due diligence and reporting on mineral sourcing." },
    { id: 40, title: "Mergers and acquisitions integration risk", probability: 3, impact: 4, score: 12, owner: "Corporate Development", status: "identified", category: "strategic", description: "Poor integration of acquired companies could lead to control gaps, data leakage, and culture clash." },
    { id: 41, title: "Export control compliance", probability: 2, impact: 4, score: 8, owner: "Export Compliance Officer", status: "mitigating", category: "regulatory", description: "Inadvertent export of controlled technology could violate EAR and ITAR regulations." },
    { id: 42, title: "Social media brand impersonation", probability: 4, impact: 2, score: 8, owner: "Brand Protection", status: "mitigating", category: "reputational", description: "Fake social media accounts impersonating the brand could damage reputation and mislead customers." },
    { id: 43, title: "Biometric data privacy compliance", probability: 3, impact: 4, score: 12, owner: "Privacy Counsel", status: "identified", category: "regulatory", description: "State biometric privacy laws (BIPA, etc.) create class action exposure for biometric data collection." },
    { id: 44, title: "IT disaster recovery test failure", probability: 3, impact: 3, score: 9, owner: "DR Coordinator", status: "assessed", category: "operational", description: "DR test failures indicate recovery capability gaps that could materialize during actual disasters." },
    { id: 45, title: "Customer data portability requests", probability: 3, impact: 2, score: 6, owner: "Product Manager", status: "assessed", category: "regulatory", description: "GDPR data portability requests require systems capable of exporting data in machine-readable formats." },
    { id: 46, title: "Shadow IT application usage", probability: 4, impact: 3, score: 12, owner: "IT Governance", status: "identified", category: "operational", description: "Unauthorized cloud applications used by business units create data leakage and compliance blind spots." },
    { id: 47, title: "Credit rating downgrade", probability: 2, impact: 4, score: 8, owner: "CFO", status: "accepted", category: "financial", description: "Rating downgrade could increase borrowing costs and impact investor confidence." },
    { id: 48, title: "Workstation encryption compliance", probability: 3, impact: 3, score: 9, owner: "IT Operations", status: "mitigating", category: "security", description: "Unencrypted laptops and mobile devices create data breach risk if lost or stolen." },
    { id: 49, title: "Service desk social engineering", probability: 4, impact: 2, score: 8, owner: "IT Service Desk", status: "identified", category: "security", description: "Help desk personnel could be manipulated to reset credentials or grant unauthorized access." },
    { id: 50, title: "Regulatory reporting deadline misses", probability: 2, impact: 4, score: 8, owner: "Compliance Officer", status: "assessed", category: "regulatory", description: "Missing regulatory filing deadlines could result in fines, penalties, and increased regulatory scrutiny." },
    { id: 51, title: "Cookie consent compliance gap", probability: 4, impact: 2, score: 8, owner: "Digital Counsel", status: "identified", category: "regulatory", description: "Non-compliant cookie consent mechanisms could result in ePrivacy Directive and GDPR enforcement." },
    { id: 52, title: "Password policy enforcement", probability: 3, impact: 3, score: 9, owner: "IAM Manager", status: "mitigating", category: "security", description: "Weak password practices increase credential compromise risk despite technical controls." },
    { id: 53, title: "Diversity and inclusion compliance", probability: 2, impact: 3, score: 6, owner: "Chief Diversity Officer", status: "assessed", category: "legal", description: "Non-compliance with diversity reporting requirements could impact government contracts and reputation." },
    { id: 54, title: "GDPR leadSAAS determination complexity", probability: 3, impact: 2, score: 6, owner: "DPO", status: "assessed", category: "regulatory", description: "Complexity in determining lead supervisory authority for cross-border processing creates regulatory uncertainty." },
    { id: 55, title: "Ad tech regulatory compliance", probability: 4, impact: 3, score: 12, owner: "Privacy Engineer", status: "identified", category: "regulatory", description: "Evolving digital advertising regulations (ePrivacy, DMA) require significant technology and process changes." },
    { id: 56, title: "Health data (HIPAA) compliance", probability: 3, intent: 4, impact: 4, score: 12, owner: "Privacy Officer", status: "mitigating", category: "regulatory", description: "Protected health information handling requires HIPAA compliance with administrative and technical safeguards." },
    { id: 57, title: "Code repository security", probability: 3, impact: 3, score: 9, owner: "Source Code Manager", status: "mitigating", category: "security", description: "Unauthorized access to source code repositories could lead to intellectual property theft." },
    { id: 58, title: "Email security - DMARC enforcement", probability: 3, impact: 3, score: 9, owner: "Email Security", status: "mitigating", category: "security", description: "Weak email authentication allows domain spoofing for phishing attacks against customers and partners." },
    { id: 59, title: "Quarterly financial covenant compliance", probability: 2, impact: 4, score: 8, owner: "Treasurer", status: "assessed", category: "financial", description: "Breach of debt covenants could trigger acceleration of repayment obligations." },
    { id: 60, title: "Fair lending compliance (if applicable)", probability: 2, impact: 4, score: 8, owner: "Compliance Officer", status: "assessed", category: "regulatory", description: "Fair lending violations could result in regulatory action, fines, and reputational damage." },
    { id: 61, title: "AI model drift and performance degradation", probability: 3, impact: 3, score: 9, owner: "ML Ops Lead", status: "identified", category: "operational", description: "Production ML models may degrade over time leading to incorrect predictions and business impact." },
    { id: 62, title: "End-of-life operating systems", probability: 4, impact: 3, score: 12, owner: "IT Operations", status: "identified", category: "security", description: "Systems running unsupported OS versions no longer receive security patches, increasing vulnerability." },
    { id: 63, title: "Customer PII exposure in logs", probability: 3, impact: 4, score: 12, owner: "DevOps", status: "mitigating", category: "security", description: "Sensitive customer data written to application logs accessible to operational teams." },
    { id: 64, title: "GDPR right-to-erasure complexity", probability: 3, impact: 3, score: 9, owner: "Data Engineering", status: "identified", category: "regulatory", description: "Technical challenges in deleting all customer data across multiple systems within 30-day window." },
    { id: 65, title: "Insurance coverage adequacy", probability: 3, impact: 3, score: 9, owner: "Risk Manager", status: "assessed", category: "financial", description: "Current cyber insurance and D&O coverage may be insufficient for evolving threat landscape." },
    { id: 66, title: "User acceptance testing gaps", probability: 3, impact: 2, score: 6, owner: "QA Director", status: "assessed", category: "operational", description: "Inadequate UAT could allow flawed features or security issues into production." },
    { id: 67, title: "Data center energy/power reliability", probability: 2, impact: 4, score: 8, owner: "Facilities", status: "assessed", category: "operational", description: "Power grid instability could impact data center uptime despite UPS and generator backup." },
    { id: 68, title: "Customer contractual liability caps", probability: 3, impact: 3, score: 9, owner: "Legal Counsel", status: "assessed", category: "contractual", description: "Uncapped liability in customer contracts could expose company to disproportionate damages." },
    { id: 69, title: "SBOM compliance (US Executive Order)", probability: 3, impact: 3, score: 9, owner: "Software Engineering", status: "identified", category: "regulatory", description: "Executive Order 14028 requires software bill of materials for all federal software suppliers." },
    { id: 70, title: "AI governance framework maturity", probability: 3, impact: 3, score: 9, owner: "AI Governance", status: "identified", category: "regulatory", description: "Immature AI governance framework may not meet emerging regulatory requirements." },
    { id: 71, title: "Network segmentation effectiveness", probability: 3, impact: 4, score: 12, owner: "Network Architect", status: "mitigating", category: "security", description: "Flat network architecture could allow lateral movement after initial compromise." },
    { id: 72, title: "Remote work security posture", probability: 4, impact: 3, score: 12, owner: "Remote Work Program", status: "mitigating", category: "security", description: "Remote workers using personal networks and devices create security blind spots." },
    { id: 73, title: "Internal fraud - procurement", probability: 2, impact: 4, score: 8, owner: "Internal Audit", status: "assessed", category: "financial", description: "Inadequate procurement oversight could enable kickback schemes or vendor collusion." },
    { id: 74, title: "Data quality for regulatory reporting", probability: 3, impact: 3, score: 9, owner: "Data Governance", status: "assessed", category: "regulatory", description: "Poor data quality could result in inaccurate regulatory submissions and enforcement action." },
    { id: 75, title: "Executive and board communication crisis", probability: 2, impact: 4, score: 8, owner: "Corporate Communications", status: "assessed", category: "reputational", description: "Ineffective crisis communication could amplify reputational damage during security incidents." },
  ];
  return risks.map(r => ({
    ...r,
    severity: r.score >= 15 ? "critical" : r.score >= 10 ? "high" : r.score >= 5 ? "medium" : "low",
    likelihood: r.probability,
    mitigation: r.status === "mitigating" ? "Mitigation controls implemented. Regular monitoring and reviews scheduled." : r.status === "identified" ? "Risk identified. Mitigation plan being developed." : r.status === "assessed" ? "Risk assessed. Awaiting mitigation prioritization." : "Risk accepted within risk appetite." + (r.status === "accepted" ? " Periodic review required." : ""),
  }));
}

function mockRisksSummary() {
  const risks = getRisks();
  return {
    total: risks.length,
    byLevel: {
      critical: risks.filter(r => r.score >= 15).length,
      high: risks.filter(r => r.score >= 10 && r.score < 15).length,
      medium: risks.filter(r => r.score >= 5 && r.score < 10).length,
      low: risks.filter(r => r.score < 5).length,
    },
    byStatus: {
      identified: risks.filter(r => r.status === "identified").length,
      assessed: risks.filter(r => r.status === "assessed").length,
      mitigating: risks.filter(r => r.status === "mitigating").length,
      accepted: risks.filter(r => r.status === "accepted").length,
      transferred: risks.filter(r => r.status === "transferred").length,
      avoided: risks.filter(r => r.status === "avoided").length,
    },
  };
}


function mockAudits() {
  return [
    { id: 1, title: "Q2 2026 Internal Financial Audit", type: "internal", lead: "Sarah Chen", team: ["James Wilson", "Lisa Park", "Tom Bradley"], startDate: "2026-06-01", endDate: "2026-06-28", status: "active", progress: 65, scope: "Financial reporting controls for Q2 2026 including revenue recognition, accounts payable, and payroll processing." },
    { id: 2, title: "SOC 2 Type II Readiness Assessment", type: "external", lead: "Deloitte", team: ["John Masters", "Rachel Kim"], startDate: "2026-05-15", endDate: "2026-07-30", status: "active", progress: 40, scope: "Readiness assessment for SOC 2 Type II certification covering security, availability, and confidentiality trust services criteria." },
    { id: 3, title: "ISO 27001 Internal Surveillance Audit", type: "internal", lead: "Mike Johnson", team: ["Anna Petrova", "David Chen"], startDate: "2026-06-10", endDate: "2026-07-05", status: "active", progress: 30, scope: "Annual ISO 27001 internal audit covering clauses 4-10 and Annex A controls." },
    { id: 4, title: "PCI DSS Compliance Review", type: "regulatory", lead: "QSA Assessor", team: ["Security Team"], startDate: "2026-06-15", endDate: "2026-08-01", status: "active", progress: 25, scope: "PCI DSS 4.0 compliance assessment for cardholder data environment." },
    { id: 5, title: "Annual Vendor Security Assessment", type: "external", lead: "SecurityScorecard", team: ["Procurement Team"], startDate: "2026-06-05", endDate: "2026-07-15", status: "active", progress: 50, scope: "Security assessment of top 25 critical vendors including penetration testing and controls review." },
    { id: 6, title: "GDPR Compliance Audit", type: "regulatory", lead: "DPO", team: ["Legal Team", "IT Security"], startDate: "2026-06-20", endDate: "2026-08-15", status: "planning", progress: 10, scope: "Comprehensive GDPR compliance audit covering data mapping, consent management, DSAR processing, and cross-border transfers." },
    { id: 7, title: "IT General Controls Review", type: "internal", lead: "IT Audit Manager", team: ["Alex Rivera", "Jessica Tan"], startDate: "2026-07-01", endDate: "2026-07-31", status: "planning", progress: 5, scope: "Review of ITGC controls including access management, change management, and computer operations." },
    { id: 8, title: "Cloud Security Posture Assessment", type: "internal", lead: "Cloud Security Architect", team: ["CloudOps Team"], startDate: "2026-07-10", endDate: "2026-08-10", status: "planning", progress: 0, scope: "Assessment of cloud security posture across AWS, Azure, and GCP environments." },
    { id: 9, title: "Financial Statement Audit - FY2026", type: "external", lead: "PwC", team: ["Audit Partners"], startDate: "2026-01-15", endDate: "2026-03-30", status: "closed", progress: 100, scope: "Annual financial statement audit for fiscal year 2026." },
    { id: 10, title: "SOX 404 Internal Control Testing - Q1", type: "internal", lead: "Internal Audit Director", team: ["Audit Team"], startDate: "2026-02-01", endDate: "2026-03-15", status: "closed", progress: 100, scope: "Quarterly SOX 404 testing of internal controls over financial reporting." },
    { id: 11, title: "ISO 27001 Recertification Audit", type: "external", lead: "BSI", team: ["Quality Team"], startDate: "2026-03-01", endDate: "2026-03-30", status: "closed", progress: 100, scope: "Triennial ISO 27001 recertification audit covering all clauses and controls." },
    { id: 12, title: "Data Privacy Impact Assessment Review", type: "internal", lead: "Privacy Officer", team: ["DPO Office"], startDate: "2026-04-01", endDate: "2026-04-30", status: "closed", progress: 100, scope: "Review of all DPIAs conducted in FY2025 for completeness and regulatory compliance." },
    { id: 13, title: "Business Continuity Plan Audit", type: "internal", lead: "BCM Director", team: ["BCM Team"], startDate: "2026-04-15", endDate: "2026-05-15", status: "closed", progress: 100, scope: "Audit of business continuity and disaster recovery plans, tests, and maintenance activities." },
    { id: 14, title: "SOC 2 Type I Report - Bridge Period", type: "external", lead: "Deloitte", team: ["Compliance Team"], startDate: "2026-05-01", endDate: "2026-05-30", status: "closed", progress: 100, scope: "SOC 2 Type I bridge letter covering controls design during the period between Type II reports." },
    { id: 15, title: "Incident Response Tabletop Exercise", type: "internal", lead: "CISO", team: ["SOC Team", "Legal", "PR"], startDate: "2026-05-20", endDate: "2026-05-20", status: "closed", progress: 100, scope: "Tabletop exercise simulating ransomware attack to test incident response procedures and cross-functional coordination." },
    { id: 16, title: "HIPAA Privacy & Security Audit", type: "regulatory", lead: "HIPAA Officer", team: ["Privacy Team"], startDate: "2026-07-15", endDate: "2026-08-30", status: "planning", progress: 0, scope: "HIPAA compliance audit covering administrative, physical, and technical safeguards for ePHI." },
    { id: 17, title: "Application Security Penetration Test", type: "internal", lead: "AppSec Lead", team: ["Security Engineers"], startDate: "2026-06-01", endDate: "2026-07-01", status: "active", progress: 60, scope: "Penetration testing of customer-facing web applications, mobile apps, and API endpoints." },
    { id: 18, title: "Annual SOX 404 Testing - Q3", type: "internal", lead: "Internal Audit", team: ["Audit Team"], startDate: "2026-08-01", endDate: "2026-09-15", status: "planning", progress: 0, scope: "Quarterly SOX 404 testing of internal controls over financial reporting - Q3 cycle." },
    { id: 19, title: "Network Security Architecture Review", type: "internal", lead: "Network Security Architect", team: ["Network Team"], startDate: "2026-05-01", endDate: "2026-06-15", status: "review", progress: 90, scope: "Review of network security architecture including segmentation, firewall rules, IDS/IPS, and zero trust controls." },
    { id: 20, title: "Anti-Bribery & Corruption Compliance Audit", type: "external", lead: "EY Forensics", team: ["Legal Team"], startDate: "2026-06-15", endDate: "2026-07-30", status: "active", progress: 35, scope: "FCPA and UK Bribery Act compliance audit covering high-risk markets, third-party due diligence, and gift/entertainment records." },
  ];
}

function mockAuditFindings(auditId) {
  const findings = {
    1: [
      { id: 101, auditId: 1, title: "Revenue recognition documentation incomplete", severity: "high", status: "open", owner: "Finance Manager", dueDate: "2026-07-15", description: "Supporting documentation for revenue recognition under ASC 606 is insufficient for three major contracts." },
      { id: 102, auditId: 1, title: "Segregation of duties in accounts payable", severity: "medium", status: "open", owner: "AP Manager", dueDate: "2026-07-20", description: "Same individual can create vendor records and process payments in the AP system." },
      { id: 103, auditId: 1, title: "Payroll reconciliation not performed timely", severity: "low", status: "open", owner: "Payroll Manager", dueDate: "2026-07-10", description: "Monthly payroll reconciliations are completed 15 days after month-end instead of 5 days per policy." },
    ],
    2: [
      { id: 201, auditId: 2, title: "Incident response playbooks incomplete", severity: "high", status: "open", owner: "SOC Manager", dueDate: "2026-08-15", description: "SOC 2 readiness assessment identified gaps in incident response documentation for specific scenarios." },
      { id: 202, auditId: 2, title: "Vendor management program documentation", severity: "high", status: "open", owner: "Procurement Director", dueDate: "2026-08-01", description: "Vendor risk assessment program lacks formalized documentation for ongoing monitoring." },
      { id: 203, auditId: 2, title: "Capacity planning documentation", severity: "medium", status: "open", owner: "Infrastructure Director", dueDate: "2026-07-30", description: "Formal capacity planning process not consistently documented for all critical systems." },
    ],
    3: [
      { id: 301, auditId: 3, title: "Asset management inventory incomplete", severity: "medium", status: "open", owner: "IT Asset Manager", dueDate: "2026-07-20", description: "Internal audit found 15 unregistered assets connected to the network per ISO 27001 A.8.1.1." },
      { id: 302, auditId: 3, title: "Supplier security review overdue", severity: "high", status: "open", owner: "Procurement", dueDate: "2026-07-15", description: "Annual security reviews for 5 critical suppliers have not been completed per ISO 27001 A.15." },
    ],
    4: [
      { id: 401, auditId: 4, title: "Quarterly ASV scan results review", severity: "high", status: "open", owner: "Security Engineer", dueDate: "2026-08-15", description: "Last quarterly ASV scan identified 3 medium severity findings not yet remediated within SLA." },
      { id: 402, auditId: 4, title: "Cardholder data discovery scan", severity: "critical", status: "open", owner: "Security Engineer", dueDate: "2026-07-20", description: "Initial CDE scope discovery identified potential cardholder data in unexpected storage locations." },
    ],
    5: [
      { id: 501, auditId: 5, title: "Vendor A - SOC 2 report expired", severity: "critical", status: "open", owner: "Procurement Manager", dueDate: "2026-07-10", description: "Critical vendor's SOC 2 report expired 45 days ago. No updated report available." },
      { id: 502, auditId: 5, title: "Vendor B - Pen test report gaps", severity: "high", status: "open", owner: "Security Engineer", dueDate: "2026-07-30", description: "Vendor penetration test report does not cover critical API endpoints identified in data flow mapping." },
      { id: 503, auditId: 5, title: "Vendor C - No security questionnaire on file", severity: "medium", status: "open", owner: "Procurement Analyst", dueDate: "2026-07-15", description: "New vendor onboarded without completing required security assessment questionnaire." },
    ],
    9: [
      { id: 901, auditId: 9, title: "Revenue recognition timing difference", severity: "medium", status: "closed", owner: "Controller", dueDate: "2026-04-15", description: "PwC identified $2.3M in revenue recognized in wrong period due to contract terms interpretation." },
    ],
    10: [
      { id: 1001, auditId: 10, title: "User access recertification delay", severity: "medium", status: "closed", owner: "IAM Manager", dueDate: "2026-04-01", description: "Quarterly user access recertification completed 7 days past due date." },
    ],
    17: [
      { id: 1701, auditId: 17, title: "API authentication bypass vulnerability", severity: "critical", status: "open", owner: "Backend Lead", dueDate: "2026-07-05", description: "Internal API endpoint lacks proper authentication, allowing unauthorized data access." },
      { id: 1702, auditId: 17, title: "SQL injection in search endpoint", severity: "high", status: "open", owner: "Backend Developer", dueDate: "2026-07-10", description: "User search endpoint vulnerable to SQL injection via unsanitized input parameter." },
      { id: 1703, auditId: 17, title: "Insecure direct object reference", severity: "high", status: "open", owner: "Full Stack Developer", dueDate: "2026-07-10", description: "Document download endpoint allows IDOR attacks by manipulating document ID parameter." },
    ],
    19: [
      { id: 1901, auditId: 19, title: "Unrestricted east-west traffic", severity: "high", status: "open", owner: "Network Engineer", dueDate: "2026-07-01", description: "Limited network segmentation allows unrestricted lateral movement between application tiers." },
      { id: 1902, auditId: 19, title: "Legacy firewall rules not reviewed", severity: "medium", status: "open", owner: "Network Admin", dueDate: "2026-07-15", description: "Over 200 firewall rules have not been reviewed in the past 12 months." },
    ],
    20: [
      { id: 2001, auditId: 20, title: "Gift register not maintained", severity: "high", status: "open", owner: "Legal Counsel", dueDate: "2026-08-01", description: "Central gift and entertainment register not consistently maintained across all departments." },
      { id: 2002, auditId: 20, title: "Third-party due diligence gaps", severity: "high", status: "open", owner: "Compliance Officer", dueDate: "2026-08-15", description: "Enhanced due diligence not completed for high-risk market intermediaries." },
    ],
  };
  return findings[auditId] || [];
}

function mockAuditsSummary() {
  const audits = getAudits();
  return {
    total: audits.length,
    byStatus: {
      planning: audits.filter(a => a.status === "planning").length,
      active: audits.filter(a => a.status === "active").length,
      review: audits.filter(a => a.status === "review").length,
      closed: audits.filter(a => a.status === "closed").length,
    },
    byType: {
      internal: audits.filter(a => a.type === "internal").length,
      external: audits.filter(a => a.type === "external").length,
      regulatory: audits.filter(a => a.type === "regulatory").length,
    },
  };
}


function mockEvidence() {
  const evidence = [];
  const categories = ["screenshot", "document", "log", "report", "configuration", "certification"];
  const statuses = ["uploaded", "reviewed", "expiring", "expired", "rejected"];
  const sourceProducts = ["AWS CloudTrail", "Azure Security Center", "Datadog", "Splunk", "Jira", "Confluence", "GitLab", "SonarQube", "Nessus", "Qualys", "CrowdStrike", "Okta", "Terraform", "Kubernetes", "Docker", "Jenkins", "Snyk", "Hashicorp Vault", "ServiceNow", "SailPoint"];

  const controlCodes = ["AC-1","AC-2","AC-3","AC-4","AC-5","AC-6","AC-7","AU-1","AU-2","AU-3","AU-4","AU-5","AU-6","CM-1","CM-2","CM-3","IR-1","IR-2","IR-3","MP-1","MP-2","PS-1","PS-2","RA-1","RA-2","RA-3","SA-1","SA-2","SC-1","SC-2","SC-3","SC-4","SC-5","SC-6","SC-7","SC-8","SI-1","SI-2","SI-3","SI-4"];

  for (let i = 1; i <= 500; i++) {
    const category = categories[i % categories.length];
    const status = statuses[i % statuses.length];
    const source = sourceProducts[i % sourceProducts.length];
    const control = controlCodes[i % controlCodes.length];

    const createdDate = new Date(2025, 0, 1);
    createdDate.setDate(createdDate.getDate() + Math.floor(Math.random() * 500));

    const expiryDate = new Date(createdDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    evidence.push({
      id: i,
      name: `Evidence Record ${i} - ${control} Control Testing`,
      title: `Evidence Record ${i} - ${control} Control Testing`,
      controlCode: control,
      category,
      sourceProduct: source,
      status: i < 480 ? (i < 400 ? status : "reviewed") : (i < 490 ? "expiring" : "expired"),
      uploadedBy: ["Sarah Chen", "Mike Johnson", "Anna Petrova", "David Chen", "Alex Rivera"][i % 5],
      uploadedDate: createdDate.toISOString().split("T")[0],
      expiryDate: expiryDate.toISOString().split("T")[0],
      fileSize: `${(Math.random() * 10 + 0.1).toFixed(1)} MB`,
      fileType: [".pdf", ".png", ".csv", ".json", ".xml", ".docx"][i % 6],
      tags: [`control-${control}`, category, `audit-${(i % 10) + 1}`, "soc2", "iso27001"],
      description: `Evidence for ${control} control testing - ${category} from ${source} - Cycle ${(i % 4) + 1}`,
      version: `1.${Math.floor(i / 50)}`,
    });
  }
  return evidence;
}

function mockEvidenceSummary() {
  const evidence = getEvidence();
  return {
    total: evidence.length,
    byStatus: {
      uploaded: evidence.filter(e => e.status === "uploaded").length,
      reviewed: evidence.filter(e => e.status === "reviewed").length,
      expiring: evidence.filter(e => e.status === "expiring").length,
      expired: evidence.filter(e => e.status === "expired").length,
      rejected: evidence.filter(e => e.status === "rejected").length,
    },
    byCategory: {
      screenshot: evidence.filter(e => e.category === "screenshot").length,
      document: evidence.filter(e => e.category === "document").length,
      log: evidence.filter(e => e.category === "log").length,
      report: evidence.filter(e => e.category === "report").length,
      configuration: evidence.filter(e => e.category === "configuration").length,
      certification: evidence.filter(e => e.category === "certification").length,
    },
    expiringSoon: evidence.filter(e => e.status === "expiring" || e.status === "expired").length,
  };
}


function mockPolicies() {
  return [
    { id: 1, title: "Information Security Policy", category: "security", owner: "CISO", version: "4.2", status: "published", reviewDate: "2026-08-15", approvalDate: "2026-01-15", effectiveDate: "2026-02-01", description: "Enterprise information security policy covering all aspects of information security management, roles, and responsibilities.", acknowledgementRequired: true, acknowledgedCount: 285, totalEmployees: 320 },
    { id: 2, title: "Data Protection Policy", category: "data_privacy", owner: "DPO", version: "3.1", status: "published", reviewDate: "2026-07-01", approvalDate: "2026-01-10", effectiveDate: "2026-02-01", description: "Policy governing the collection, processing, storage, and transfer of personal data in compliance with GDPR and other privacy regulations.", acknowledgementRequired: true, acknowledgedCount: 298, totalEmployees: 320 },
    { id: 3, title: "Code of Conduct", category: "legal", owner: "General Counsel", version: "2.0", status: "published", reviewDate: "2026-09-01", approvalDate: "2026-03-01", effectiveDate: "2026-04-01", description: "Enterprise code of conduct outlining ethical standards, anti-bribery, conflicts of interest, and reporting obligations.", acknowledgementRequired: true, acknowledgedCount: 310, totalEmployees: 320 },
    { id: 4, title: "Acceptable Use Policy", category: "IT", owner: "IT Director", version: "5.0", status: "published", reviewDate: "2026-06-30", approvalDate: "2026-01-05", effectiveDate: "2026-02-01", description: "Policy defining acceptable use of company technology resources including internet, email, and computing devices.", acknowledgementRequired: true, acknowledgedCount: 275, totalEmployees: 320 },
    { id: 5, title: "Access Control Policy", category: "security", owner: "IAM Director", version: "3.3", status: "published", reviewDate: "2026-08-01", approvalDate: "2026-02-15", effectiveDate: "2026-03-01", description: "Policy governing user access management, authentication requirements, authorization controls, and access reviews.", acknowledgementRequired: false },
    { id: 6, title: "Incident Response Policy", category: "security", owner: "CISO", version: "2.1", status: "published", reviewDate: "2026-07-15", approvalDate: "2026-01-20", effectiveDate: "2026-02-15", description: "Policy establishing incident response framework, team structure, severity classification, and reporting procedures.", acknowledgementRequired: true, acknowledgedCount: 260, totalEmployees: 320 },
    { id: 7, title: "Business Continuity Policy", category: "operations", owner: "BCM Director", version: "1.5", status: "published", reviewDate: "2026-09-30", approvalDate: "2026-03-15", effectiveDate: "2026-04-01", description: "Policy defining business continuity management framework, recovery objectives, and testing requirements.", acknowledgementRequired: false },
    { id: 8, title: "Data Classification Policy", category: "data_privacy", owner: "Information Security", version: "2.0", status: "published", reviewDate: "2026-08-20", approvalDate: "2026-02-01", effectiveDate: "2026-03-01", description: "Policy for classifying information assets based on sensitivity and criticality with corresponding handling requirements.", acknowledgementRequired: true, acknowledgedCount: 240, totalEmployees: 320 },
    { id: 9, title: "Password Policy", category: "security", owner: "IT Security", version: "4.0", status: "published", reviewDate: "2026-07-01", approvalDate: "2026-01-10", effectiveDate: "2026-02-01", description: "Policy establishing password complexity, length, rotation, and multi-factor authentication requirements.", acknowledgementRequired: true, acknowledgedCount: 290, totalEmployees: 320 },
    { id: 10, title: "Remote Work Policy", category: "HR", owner: "HR Director", version: "1.2", status: "published", reviewDate: "2026-10-01", approvalDate: "2026-04-01", effectiveDate: "2026-04-15", description: "Policy governing remote work arrangements, security requirements, equipment, and productivity expectations.", acknowledgementRequired: true, acknowledgedCount: 230, totalEmployees: 320 },
    { id: 11, title: "Vendor Management Policy", category: "operations", owner: "Procurement Director", version: "2.1", status: "published", reviewDate: "2026-08-15", approvalDate: "2026-02-15", effectiveDate: "2026-03-01", description: "Policy governing vendor selection, due diligence, contracting, ongoing monitoring, and offboarding.", acknowledgementRequired: false },
    { id: 12, title: "Privacy Impact Assessment Policy", category: "data_privacy", owner: "DPO", version: "1.0", status: "published", reviewDate: "2026-09-01", approvalDate: "2026-03-01", effectiveDate: "2026-03-15", description: "Policy requiring PIA for all new processing activities and significant changes per GDPR Article 35.", acknowledgementRequired: false },
    { id: 13, title: "Records Management Policy", category: "operations", owner: "Records Manager", version: "3.0", status: "published", reviewDate: "2026-08-01", approvalDate: "2026-02-01", effectiveDate: "2026-03-01", description: "Policy for records retention, disposal, and management across all media types and regulatory requirements.", acknowledgementRequired: false },
    { id: 14, title: "Anti-Bribery and Corruption Policy", category: "legal", owner: "Chief Ethics Officer", version: "2.2", status: "published", reviewDate: "2026-09-15", approvalDate: "2026-03-15", effectiveDate: "2026-04-01", description: "Policy prohibiting bribery, kickbacks, and improper payments in compliance with FCPA, UK Bribery Act, and local laws.", acknowledgementRequired: true, acknowledgedCount: 250, totalEmployees: 320 },
    { id: 15, title: "Social Media Policy", category: "HR", owner: "Communications Director", version: "1.5", status: "published", reviewDate: "2026-10-15", approvalDate: "2026-04-15", effectiveDate: "2026-05-01", description: "Policy governing employee use of social media in professional and personal capacity as it relates to the company.", acknowledgementRequired: true, acknowledgedCount: 210, totalEmployees: 320 },
    { id: 16, title: "Change Management Policy", category: "IT", owner: "IT Operations Director", version: "3.1", status: "published", reviewDate: "2026-07-30", approvalDate: "2026-01-30", effectiveDate: "2026-02-15", description: "Policy for IT change management including classification, approval, testing, and emergency change procedures.", acknowledgementRequired: false },
    { id: 17, title: "Cryptography Policy", category: "security", owner: "Security Architect", version: "2.0", status: "published", reviewDate: "2026-08-01", approvalDate: "2026-02-01", effectiveDate: "2026-03-01", description: "Policy governing cryptographic controls, key management, algorithm standards, and certificate lifecycle.", acknowledgementRequired: false },
    { id: 18, title: "Mobile Device Policy", category: "IT", owner: "IT Operations", version: "4.0", status: "published", reviewDate: "2026-06-30", approvalDate: "2026-01-10", effectiveDate: "2026-02-01", description: "Policy for mobile device management including enrollment, security requirements, remote wipe, and acceptable apps.", acknowledgementRequired: true, acknowledgedCount: 265, totalEmployees: 320 },
    { id: 19, title: "Travel and Expense Policy", category: "finance", owner: "Finance Director", version: "5.2", status: "published", reviewDate: "2026-09-01", approvalDate: "2026-03-01", effectiveDate: "2026-04-01", description: "Policy for business travel booking, expense reimbursement limits, approval workflows, and documentation requirements.", acknowledgementRequired: true, acknowledgedCount: 255, totalEmployees: 320 },
    { id: 20, title: "Conflict of Interest Policy", category: "legal", owner: "General Counsel", version: "1.3", status: "published", reviewDate: "2026-09-30", approvalDate: "2026-04-01", effectiveDate: "2026-04-15", description: "Policy requiring disclosure of potential conflicts of interest and recusal from related decisions.", acknowledgementRequired: true, acknowledgedCount: 200, totalEmployees: 320 },
    { id: 21, title: "Disaster Recovery Policy", category: "operations", owner: "IT Operations Director", version: "2.1", status: "published", reviewDate: "2026-08-30", approvalDate: "2026-03-01", effectiveDate: "2026-03-15", description: "Policy defining disaster recovery planning, testing, and recovery procedures for critical information systems.", acknowledgementRequired: false },
    { id: 22, title: "Software Development Lifecycle Policy", category: "IT", owner: "Engineering Director", version: "3.0", status: "published", reviewDate: "2026-07-15", approvalDate: "2026-01-15", effectiveDate: "2026-02-15", description: "Policy for secure SDLC including security requirements, code review, testing gates, and deployment approvals.", acknowledgementRequired: false },
    { id: 23, title: "Physical Security Policy", category: "security", owner: "Facilities Director", version: "2.0", status: "published", reviewDate: "2026-10-01", approvalDate: "2026-04-01", effectiveDate: "2026-04-15", description: "Policy for physical security controls including access control, visitor management, surveillance, and asset protection.", acknowledgementRequired: false },
    { id: 24, title: "Whistleblower Policy", category: "legal", owner: "Audit Committee Chair", version: "1.1", status: "published", reviewDate: "2026-09-15", approvalDate: "2026-03-15", effectiveDate: "2026-04-01", description: "Policy establishing confidential whistleblower channel, non-retaliation protections, and investigation procedures.", acknowledgementRequired: true, acknowledgedCount: 195, totalEmployees: 320 },
    { id: 25, title: "Data Retention and Disposal Policy", category: "data_privacy", owner: "DPO", version: "2.0", status: "published", reviewDate: "2026-08-01", approvalDate: "2026-02-01", effectiveDate: "2026-03-01", description: "Policy defining data retention periods, disposal methods, and archiving procedures for all data categories.", acknowledgementRequired: false },
    { id: 26, title: "Third-Party Risk Management Policy", category: "operations", owner: "Risk Manager", version: "1.2", status: "published", reviewDate: "2026-09-01", approvalDate: "2026-03-01", effectiveDate: "2026-04-01", description: "Policy for third-party risk classification, due diligence, ongoing monitoring, and termination procedures.", acknowledgementRequired: false },
    { id: 27, title: "Email and Communications Policy", category: "IT", owner: "IT Director", version: "3.0", status: "published", reviewDate: "2026-07-01", approvalDate: "2026-01-10", effectiveDate: "2026-02-01", description: "Policy for corporate email usage, encryption, retention, monitoring, and acceptable communication tools.", acknowledgementRequired: true, acknowledgedCount: 270, totalEmployees: 320 },
    { id: 28, title: "AI Usage Policy", category: "legal", owner: "AI Ethics Officer", version: "1.0", status: "draft", reviewDate: "2026-10-01", approvalDate: null, effectiveDate: null, description: "Policy governing the development, deployment, and use of AI systems including ethical principles, bias testing, and transparency.", acknowledgementRequired: true, acknowledgedCount: 0, totalEmployees: 320 },
    { id: 29, title: "Insider Trading Policy", category: "legal", owner: "Corporate Secretary", version: "1.4", status: "published", reviewDate: "2026-09-30", approvalDate: "2026-04-01", effectiveDate: "2026-04-15", description: "Policy prohibiting insider trading, tipping, and establishing blackout periods for material non-public information.", acknowledgementRequired: true, acknowledgedCount: 180, totalEmployees: 320 },
    { id: 30, title: "Cloud Governance Policy", category: "IT", owner: "CTO", version: "2.0", status: "published", reviewDate: "2026-08-15", approvalDate: "2026-02-15", effectiveDate: "2026-03-01", description: "Policy for cloud service adoption, architecture standards, security controls, and cost management.", acknowledgementRequired: false },
    { id: 31, title: "Data Breach Response Policy", category: "data_privacy", owner: "DPO", version: "1.5", status: "published", reviewDate: "2026-07-30", approvalDate: "2026-01-30", effectiveDate: "2026-02-15", description: "Policy for data breach detection, containment, notification to authorities and affected individuals, and post-incident review.", acknowledgementRequired: true, acknowledgedCount: 245, totalEmployees: 320 },
    { id: 32, title: "Workplace Health and Safety Policy", category: "HR", owner: "H&S Manager", version: "2.1", status: "published", reviewDate: "2026-10-01", approvalDate: "2026-04-01", effectiveDate: "2026-04-15", description: "Policy for workplace health and safety including hazard reporting, emergency procedures, and compliance with OSHA standards.", acknowledgementRequired: true, acknowledgedCount: 235, totalEmployees: 320 },
    { id: 33, title: "Network Security Policy", category: "security", owner: "Network Architect", version: "3.2", status: "published", reviewDate: "2026-07-15", approvalDate: "2026-01-15", effectiveDate: "2026-02-01", description: "Policy for network security architecture, segmentation, firewall management, VPN, and wireless security.", acknowledgementRequired: false },
    { id: 34, title: "Patch Management Policy", category: "IT", owner: "Patch Management Lead", version: "2.0", status: "published", reviewDate: "2026-08-01", approvalDate: "2026-02-01", effectiveDate: "2026-03-01", description: "Policy for vulnerability patch management including severity-based SLAs, testing, deployment, and emergency patching.", acknowledgementRequired: false },
    { id: 35, title: "Diversity, Equity and Inclusion Policy", category: "HR", owner: "Chief Diversity Officer", version: "1.1", status: "published", reviewDate: "2026-09-30", approvalDate: "2026-04-01", effectiveDate: "2026-04-15", description: "Policy committing to diversity, equity, and inclusion in hiring, promotion, compensation, and workplace culture.", acknowledgementRequired: true, acknowledgedCount: 215, totalEmployees: 320 },
    { id: 36, title: "Internal Audit Charter", category: "operations", owner: "Audit Committee Chair", version: "2.0", status: "published", reviewDate: "2026-08-30", approvalDate: "2026-03-01", effectiveDate: "2026-03-15", description: "Charter establishing internal audit function's authority, independence, scope, and reporting structure.", acknowledgementRequired: false },
    { id: 37, title: "E-Discovery Policy", category: "legal", owner: "General Counsel", version: "1.0", status: "published", reviewDate: "2026-10-01", approvalDate: "2026-04-01", effectiveDate: "2026-05-01", description: "Policy for electronic discovery processes including legal hold, data preservation, collection, and production.", acknowledgementRequired: false },
    { id: 38, title: "Software Asset Management Policy", category: "IT", owner: "IT Asset Manager", version: "1.3", status: "published", reviewDate: "2026-09-01", approvalDate: "2026-03-01", effectiveDate: "2026-04-01", description: "Policy for software license management, compliance, procurement, and retirement.", acknowledgementRequired: false },
    { id: 39, title: "Environmental Policy", category: "operations", owner: "Sustainability Officer", version: "1.0", status: "published", reviewDate: "2026-12-01", approvalDate: "2026-06-01", effectiveDate: "2026-07-01", description: "Policy for environmental sustainability including emissions reduction, waste management, and green procurement.", acknowledgementRequired: false },
    { id: 40, title: "Performance Management Policy", category: "HR", owner: "HR Director", version: "3.0", status: "published", reviewDate: "2026-09-01", approvalDate: "2026-03-01", effectiveDate: "2026-04-01", description: "Policy for employee performance management including goal setting, reviews, feedback, and improvement plans.", acknowledgementRequired: true, acknowledgedCount: 225, totalEmployees: 320 },
    { id: 41, title: "Data Ethics Policy", category: "data_privacy", owner: "Chief Data Officer", version: "1.0", status: "draft", reviewDate: "2026-11-01", approvalDate: null, effectiveDate: null, description: "Policy for ethical data use including fairness, transparency, accountability, and responsible AI principles.", acknowledgementRequired: true, acknowledgedCount: 0, totalEmployees: 320 },
    { id: 42, title: "Procurement Policy", category: "finance", owner: "Procurement Director", version: "4.1", status: "published", reviewDate: "2026-08-01", approvalDate: "2026-02-01", effectiveDate: "2026-03-01", description: "Policy for procurement processes including competitive bidding, approval thresholds, and contract management.", acknowledgementRequired: false },
    { id: 43, title: "Business Intelligence and Analytics Policy", category: "operations", owner: "BI Director", version: "1.2", status: "published", reviewDate: "2026-10-01", approvalDate: "2026-04-01", effectiveDate: "2026-05-01", description: "Policy governing business intelligence data access, analytics governance, reporting standards, and tool usage.", acknowledgementRequired: false },
    { id: 44, title: "Gifts and Entertainment Policy", category: "legal", owner: "Chief Ethics Officer", version: "1.1", status: "published", reviewDate: "2026-09-15", approvalDate: "2026-03-15", effectiveDate: "2026-04-01", description: "Policy for gifts, hospitality, and entertainment with limits, disclosure requirements, and prohibited practices.", acknowledgementRequired: true, acknowledgedCount: 205, totalEmployees: 320 },
    { id: 45, title: "Open Source Software Policy", category: "IT", owner: "Engineering Director", version: "1.0", status: "published", reviewDate: "2026-08-15", approvalDate: "2026-02-15", effectiveDate: "2026-03-15", description: "Policy for open source software usage, license compliance, contribution, and security scanning.", acknowledgementRequired: false },
    { id: 46, title: "Log Management Policy", category: "security", owner: "SOC Manager", version: "2.0", status: "published", reviewDate: "2026-07-01", approvalDate: "2026-01-10", effectiveDate: "2026-02-01", description: "Policy for log generation, collection, retention, monitoring, and protection across all systems.", acknowledgementRequired: false },
    { id: 47, title: "Regulatory Compliance Policy", category: "legal", owner: "Compliance Officer", version: "2.1", status: "published", reviewDate: "2026-09-01", approvalDate: "2026-03-01", effectiveDate: "2026-04-01", description: "Policy for regulatory compliance management including obligation tracking, reporting, and regulatory change monitoring.", acknowledgementRequired: false },
    { id: 48, title: "Endpoint Security Policy", category: "security", owner: "Endpoint Security Lead", version: "3.1", status: "published", reviewDate: "2026-08-01", approvalDate: "2026-02-01", effectiveDate: "2026-03-01", description: "Policy for endpoint security including EDR, antivirus, device encryption, USB controls, and compliance monitoring.", acknowledgementRequired: false },
    { id: 49, title: "Risk Management Policy", category: "operations", owner: "CRO", version: "2.0", status: "published", reviewDate: "2026-09-30", approvalDate: "2026-04-01", effectiveDate: "2026-04-15", description: "Policy for enterprise risk management framework, methodology, risk appetite, and reporting.", acknowledgementRequired: false },
    { id: 50, title: "Training and Awareness Policy", category: "HR", owner: "Security Awareness Manager", version: "1.3", status: "published", reviewDate: "2026-10-01", approvalDate: "2026-04-01", effectiveDate: "2026-05-01", description: "Policy for security awareness training, phishing simulations, compliance training, and effectiveness measurement.", acknowledgementRequired: false },
    { id: 51, title: "GDPR Data Subject Rights Policy", category: "data_privacy", owner: "DPO", version: "2.0", status: "published", reviewDate: "2026-08-01", approvalDate: "2026-02-01", effectiveDate: "2026-03-01", description: "Policy for handling data subject rights requests including access, rectification, erasure, portability, and objection.", acknowledgementRequired: false },
    { id: 52, title: "Artificial Intelligence Ethics Policy", category: "legal", owner: "AI Ethics Board", version: "1.0", status: "draft", reviewDate: "2026-12-01", approvalDate: null, effectiveDate: null, description: "Policy establishing ethical principles for AI development including fairness, accountability, transparency, and human oversight.", acknowledgementRequired: true, acknowledgedCount: 0, totalEmployees: 320 },
    { id: 53, title: "Information Security Incident Reporting Policy", category: "security", owner: "SOC Manager", version: "1.4", status: "published", reviewDate: "2026-07-15", approvalDate: "2026-01-15", effectiveDate: "2026-02-01", description: "Policy requiring immediate reporting of security incidents with clear procedures and escalation paths.", acknowledgementRequired: true, acknowledgedCount: 238, totalEmployees: 320 },
    { id: 54, title: "Customer Communication Policy", category: "operations", owner: "Customer Success VP", version: "2.1", status: "published", reviewDate: "2026-09-01", approvalDate: "2026-03-01", effectiveDate: "2026-04-01", description: "Policy for customer communications including response times, escalation procedures, and quality standards.", acknowledgementRequired: false },
    { id: 55, title: "Crisis Management Policy", category: "operations", owner: "CEO", version: "1.0", status: "published", reviewDate: "2026-11-01", approvalDate: "2026-05-01", effectiveDate: "2026-06-01", description: "Policy for enterprise crisis management including crisis team, communication protocols, and decision-making authority.", acknowledgementRequired: false },
  ];
}

function mockPoliciesSummary() {
  const policies = getPolicies();
  return {
    total: policies.length,
    byStatus: {
      draft: policies.filter(p => p.status === "draft").length,
      pending_review: policies.filter(p => p.status === "pending_review").length,
      approved: policies.filter(p => p.status === "approved").length,
      published: policies.filter(p => p.status === "published").length,
      archived: policies.filter(p => p.status === "archived").length,
    },
    byCategory: {
      security: policies.filter(p => p.category === "security").length,
      data_privacy: policies.filter(p => p.category === "data_privacy").length,
      hr: policies.filter(p => p.category === "hr").length,
      finance: policies.filter(p => p.category === "finance").length,
      operations: policies.filter(p => p.category === "operations").length,
      legal: policies.filter(p => p.category === "legal").length,
      it: policies.filter(p => p.category === "it").length,
    },
    overallComplianceRate: Math.round(policies.filter(p => p.status === "published").length / policies.length * 100),
  };
}


function mockCalendarEvents() {
  return [
    { id: 1, title: "Q2 Financial Audit - Closing Meeting", type: "audit", date: "2026-06-28", endDate: "2026-06-28", status: "active", owner: "Sarah Chen", description: "Closing meeting for Q2 2026 internal financial audit." },
    { id: 2, title: "SOC 2 Readiness - Controls Testing", type: "audit", date: "2026-07-15", endDate: "2026-07-19", status: "active", owner: "Compliance Director", description: "Week-long controls testing phase for SOC 2 Type II readiness." },
    { id: 3, title: "ISO 27001 Surveillance Audit", type: "audit", date: "2026-06-30", endDate: "2026-07-05", status: "active", owner: "Mike Johnson", description: "ISO 27001 annual surveillance audit by certification body." },
    { id: 4, title: "GDPR Annual Report Submission", type: "filing", date: "2026-07-15", endDate: "2026-07-15", status: "pending", owner: "DPO", description: "Deadline for GDPR annual data protection report submission." },
    { id: 5, title: "PCI DSS Quarterly ASV Scan", type: "filing", date: "2026-07-01", endDate: "2026-07-07", status: "pending", owner: "Security Engineer", description: "Quarterly external vulnerability scan by approved scanning vendor." },
    { id: 6, title: "Information Security Policy Review", type: "review", date: "2026-08-15", endDate: "2026-08-19", status: "pending", owner: "CISO", description: "Annual review of Information Security Policy." },
    { id: 7, title: "Data Protection Policy Review", type: "review", date: "2026-07-01", endDate: "2026-07-03", status: "overdue", owner: "DPO", description: "Annual review of Data Protection Policy." },
    { id: 8, title: "Acceptable Use Policy Review", type: "review", date: "2026-06-30", endDate: "2026-07-02", status: "overdue", owner: "IT Director", description: "Annual review of Acceptable Use Policy." },
    { id: 9, title: "GDPR Cross-Border Transfer Deadline", type: "filing", date: "2026-09-15", endDate: "2026-09-15", status: "pending", owner: "DPO", description: "Deadline for cross-border data transfer assessment completion." },
    { id: 10, title: "Code of Conduct Renewal", type: "review", date: "2026-09-01", endDate: "2026-09-05", status: "pending", owner: "General Counsel", description: "Biennial review and renewal of Code of Conduct." },
    { id: 11, title: "SOX 404 Q3 Testing", type: "audit", date: "2026-08-01", endDate: "2026-09-15", status: "pending", owner: "Internal Audit", description: "Q3 2026 SOX 404 internal control testing." },
    { id: 12, title: "HIPAA Privacy Assessment", type: "audit", date: "2026-07-15", endDate: "2026-08-30", status: "pending", owner: "Privacy Officer", description: "Annual HIPAA privacy and security assessment." },
    { id: 13, title: "SEC Cybersecurity Disclosure Filing", type: "filing", date: "2026-08-01", endDate: "2026-08-01", status: "pending", owner: "General Counsel", description: "Annual SEC cybersecurity risk management and incident disclosure filing." },
    { id: 14, title: "PCI DSS Report on Compliance", type: "filing", date: "2026-07-31", endDate: "2026-07-31", status: "pending", owner: "Compliance Analyst", description: "PCI DSS ROC submission deadline." },
    { id: 15, title: "Annual Ethics Training Completion", type: "deadline", date: "2026-08-30", endDate: "2026-08-30", status: "pending", owner: "HR Director", description: "All employees must complete annual ethics and compliance training." },
    { id: 16, title: "Board Risk Appetite Review", type: "review", date: "2026-08-30", endDate: "2026-08-31", status: "pending", owner: "Board Risk Committee", description: "Annual board review and approval of risk appetite statement." },
    { id: 17, title: "CMMC Assessment", type: "audit", date: "2026-10-01", endDate: "2026-10-05", status: "pending", owner: "CISO", description: "CMMC Level 2 certification assessment." },
    { id: 18, title: "DORA Compliance Deadline", type: "filing", date: "2026-09-30", endDate: "2026-09-30", status: "pending", owner: "CRO", description: "EU Digital Operational Resilience Act compliance deadline." },
    { id: 19, title: "Conflict of Interest Disclosures Due", type: "deadline", date: "2026-08-01", endDate: "2026-08-01", status: "pending", owner: "Legal", description: "Annual conflict of interest disclosure submission deadline for all officers and directors." },
    { id: 20, title: "Quarterly Access Review", type: "deadline", date: "2026-07-05", endDate: "2026-07-12", status: "active", owner: "IT Security", description: "Quarterly privileged access review." },
    { id: 21, title: "Vendor Risk Assessment Q3", type: "review", date: "2026-09-01", endDate: "2026-09-30", status: "pending", owner: "Risk Manager", description: "Q3 2026 annual vendor risk assessments for critical vendors." },
    { id: 22, title: "EU AI Act Classification Report", type: "filing", date: "2026-10-01", endDate: "2026-10-01", status: "pending", owner: "AI Governance Lead", description: "Submit AI system risk classifications per EU AI Act." },
    { id: 23, title: "Cyber Insurance Renewal", type: "deadline", date: "2026-08-01", endDate: "2026-08-01", status: "active", owner: "Risk Manager", description: "Annual cyber insurance policy renewal." },
    { id: 24, title: "Penetration Test - External", type: "audit", date: "2026-08-01", endDate: "2026-08-15", status: "pending", owner: "Security Operations", description: "Annual external infrastructure penetration test." },
    { id: 25, title: "Data Retention Audit", type: "audit", date: "2026-07-15", endDate: "2026-07-26", status: "active", owner: "Records Manager", description: "Audit of data retention and disposal practices across all departments." },
    { id: 26, title: "BCP Tabletop Exercise", type: "audit", date: "2026-07-30", endDate: "2026-07-30", status: "pending", owner: "BCM Director", description: "Semi-annual business continuity tabletop exercise." },
    { id: 27, title: "SOX 302 CEO/CFO Certification", type: "filing", date: "2026-07-15", endDate: "2026-07-15", status: "active", owner: "CFO", description: "Quarterly SOX 302 certification of internal controls." },
    { id: 28, title: "GDPR DSAR Processing Review", type: "review", date: "2026-07-10", endDate: "2026-07-12", status: "active", owner: "DPO", description: "Monthly review of DSAR processing timeliness and quality." },
    { id: 29, title: "Cloud Security Posture Review", type: "review", date: "2026-07-10", endDate: "2026-08-10", status: "pending", owner: "Cloud Security Architect", description: "Review of cloud security posture across all cloud providers." },
    { id: 30, title: "Privacy Impact Assessment Backlog", type: "deadline", date: "2026-08-01", endDate: "2026-08-01", status: "pending", owner: "DPO", description: "Clear backlog of pending privacy impact assessments." },
    { id: 31, title: "UK GDPR Rep Appointment", type: "filing", date: "2026-07-15", endDate: "2026-07-15", status: "active", owner: "DPO", description: "Designate UK GDPR representative." },
    { id: 32, title: "ISO 27001 Internal Audit Program", type: "audit", date: "2026-08-01", endDate: "2026-08-15", status: "pending", owner: "Quality Manager", description: "Annual ISO 27001 internal audit program." },
    { id: 33, title: "FCPA Risk Assessment", type: "review", date: "2026-09-15", endDate: "2026-09-30", status: "pending", owner: "Legal Counsel", description: "Annual FCPA risk assessment for high-risk markets." },
    { id: 34, title: "Corporate Transparency Act Filing", type: "filing", date: "2026-09-01", endDate: "2026-09-01", status: "pending", owner: "Corporate Secretary", description: "FinCEN beneficial ownership information report." },
    { id: 35, title: "Quarterly Security Awareness Metrics", type: "deadline", date: "2026-07-05", endDate: "2026-07-05", status: "active", owner: "Security Awareness", description: "Q2 2026 security awareness metrics report due." },
    { id: 36, title: "Tokenization Implementation Review", type: "review", date: "2026-08-20", endDate: "2026-08-22", status: "pending", owner: "Security Architect", description: "Review of payment tokenization implementation status." },
    { id: 37, title: "Data Processing Agreement Renewals", type: "deadline", date: "2026-08-15", endDate: "2026-08-15", status: "pending", owner: "Legal Counsel", description: "DPA renewals with all sub-processors." },
    { id: 38, title: "Social Engineering Testing", type: "audit", date: "2026-07-15", endDate: "2026-07-19", status: "active", owner: "Security Awareness", description: "Quarterly phishing and social engineering simulation." },
    { id: 39, title: "GLBA Compliance Review", type: "review", date: "2026-09-01", endDate: "2026-09-05", status: "pending", owner: "Privacy Officer", description: "Annual GLBA privacy compliance review." },
    { id: 40, title: "NIST CSF Assessment", type: "review", date: "2026-08-20", endDate: "2026-08-31", status: "pending", owner: "IT Risk Manager", description: "Annual NIST Cybersecurity Framework assessment." },
    { id: 41, title: "Data Erasure Request Queue Clearance", type: "deadline", date: "2026-07-02", endDate: "2026-07-02", status: "overdue", owner: "DPO", description: "Clear pending right-to-erasure request backlog." },
    { id: 42, title: "SEC Whistleblower Program Review", type: "review", date: "2026-08-01", endDate: "2026-08-03", status: "pending", owner: "General Counsel", description: "Annual review of whistleblower program compliance." },
    { id: 43, title: "BIometric Privacy Compliance (BIPA)", type: "filing", date: "2026-09-01", endDate: "2026-09-01", status: "pending", owner: "Privacy Counsel", description: "Illinois BIPA compliance documentation deadline." },
    { id: 44, title: "Patent Filing - Zero-Trust Technology", type: "deadline", date: "2026-07-15", endDate: "2026-07-15", status: "active", owner: "IP Counsel", description: "Provisional patent application deadline." },
    { id: 45, title: "Cookie Consent Mechanism Update", type: "deadline", date: "2026-07-01", endDate: "2026-07-01", status: "overdue", owner: "Digital Marketing", description: "Update cookie consent mechanism per ePrivacy Directive." },
    { id: 46, title: "Anti-Bribery & Corruption Audit - EY", type: "audit", date: "2026-06-15", endDate: "2026-07-30", status: "active", owner: "Legal Team", description: "FCPA compliance audit by EY Forensics." },
    { id: 47, title: "Sustainability Report (TCFD)", type: "filing", date: "2026-09-30", endDate: "2026-09-30", status: "pending", owner: "Sustainability Officer", description: "TCFD-aligned climate risk disclosure report." },
    { id: 48, title: "AI Ethics Board Meeting", type: "review", date: "2026-07-20", endDate: "2026-07-20", status: "pending", owner: "AI Ethics Board", description: "Quarterly AI Ethics Board meeting." },
    { id: 49, title: "Key Risk Indicator Review", type: "review", date: "2026-08-15", endDate: "2026-08-16", status: "pending", owner: "Risk Analytics", description: "Annual KRI recalibration and threshold review." },
    { id: 50, title: "Internal Controls over Financial Reporting", type: "audit", date: "2026-08-01", endDate: "2026-09-15", status: "pending", owner: "Internal Audit", description: "SOX 404 Q3 testing cycle." },
  ];
}

function mockCalendarSummary() {
  const events = getCalendarEvents();
  return {
    total: events.length,
    byType: {
      audit: events.filter(e => e.type === "audit").length,
      filing: events.filter(e => e.type === "filing").length,
      review: events.filter(e => e.type === "review").length,
      deadline: events.filter(e => e.type === "deadline").length,
    },
    byMonth: [
      { month: "Jun 2026", count: events.filter(e => e.date >= "2026-06-01" && e.date <= "2026-06-30").length },
      { month: "Jul 2026", count: events.filter(e => e.date >= "2026-07-01" && e.date <= "2026-07-31").length },
      { month: "Aug 2026", count: events.filter(e => e.date >= "2026-08-01" && e.date <= "2026-08-31").length },
      { month: "Sep 2026", count: events.filter(e => e.date >= "2026-09-01" && e.date <= "2026-09-30").length },
      { month: "Oct 2026", count: events.filter(e => e.date >= "2026-10-01" && e.date <= "2026-10-31").length },
    ],
    upcoming: events.filter(e => e.date >= "2026-06-16" && e.date <= "2026-07-15").length,
    overdue: events.filter(e => e.status === "overdue").length,
  };
}


function mockIncidents() {
  const now = new Date();
  const daysAgo = (d) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date.toISOString().split("T")[0];
  };

  const incidents = [
    { id: 1, title: "Unauthorized access attempt - production database", severity: "critical", status: "investigating", reportedDate: daysAgo(2), assignee: "IT Security", reportedBy: "SOC Analyst", category: "unauthorized_access", description: "Multiple failed login attempts detected on production database from external IP address. Investigation ongoing to determine if any data was accessed.", rootCause: "", resolution: "" },
    { id: 2, title: "Phishing campaign targeting finance department", severity: "high", status: "remediation", reportedDate: daysAgo(4), assignee: "Security Team", reportedBy: "Employee Report", category: "phishing", description: "Sophisticated phishing emails targeting finance team members with fake invoice payment requests. 3 employees clicked the link.", rootCause: "Targeted phishing campaign bypassing email filters through compromised legitimate sender domain.", resolution: "Email filters updated, affected accounts reset, awareness training conducted" },
    { id: 3, title: "Sensitive data exposed in application logs", severity: "high", status: "resolved", reportedDate: daysAgo(6), assignee: "DevOps", reportedBy: "Security Scan", category: "data_leakage", description: "Customer PII including email addresses and partial credit card numbers found in application debug logs accessible to engineering team.", rootCause: "Logging configuration set to debug mode in production, capturing sensitive request data.", resolution: "Logging configuration fixed, log entries purged, access reviewed" },
    { id: 4, title: "Policy violation - personal device usage", severity: "medium", status: "closed", reportedDate: daysAgo(8), assignee: "HR", reportedBy: "Manager Report", category: "policy_violation", description: "Employee found using personal unencrypted laptop to access company data in violation of Remote Work and Acceptable Use policies.", rootCause: "Employee unaware of policy requirements for remote access.", resolution: "Employee counseled, device enrolled in MDM, policy awareness training completed" },
    { id: 5, title: "Firewall misconfiguration exposes internal services", severity: "critical", status: "resolved", reportedDate: daysAgo(11), assignee: "Network Team", reportedBy: "Automated Scan", category: "misconfiguration", description: "Internal admin panel exposed to internet due to incorrect firewall rule after maintenance change. Exposed for approximately 4 hours.", rootCause: "Firewall rule change during scheduled maintenance incorrectly allowed public access to management interface.", resolution: "Rule corrected, access logs reviewed (no unauthorized access detected), change management process updated" },
    { id: 6, title: "Malware detected on workstation", severity: "high", status: "resolved", reportedDate: daysAgo(14), assignee: "IT Support", reportedBy: "Endpoint Protection", category: "malware", description: "EDR alert detected potentially unwanted application (PUA) on marketing department workstation. Application quarantined automatically.", rootCause: "Employee downloaded software from untrusted source for a project.", resolution: "Workstation scanned and cleaned, user counseled on software installation policy" },
    { id: 7, title: "Lost company laptop", severity: "high", status: "resolved", reportedDate: daysAgo(17), assignee: "IT Security", reportedBy: "Employee Report", category: "lost_device", description: "Employee reported company-issued laptop lost during business travel. Device encrypted with BitLocker and reportedly password protected.", rootCause: "Personal negligence during travel.", resolution: "Device location attempted via MDM (offline), BitLocker keys verified secure, remote wipe initiated, replacement issued" },
    { id: 8, title: "Social engineering - help desk password reset", severity: "high", status: "remediation", reportedDate: daysAgo(5), assignee: "IT Service Desk", reportedBy: "Internal Audit", category: "social_engineering", description: "Help desk technician reset password for attacker posing as executive via phone call. Attacker gained access to email for 30 minutes.", rootCause: "Help desk verification procedure not followed; caller ID spoofing used.", resolution: "Password reset procedures updated, additional verification steps implemented, affected accounts audited" },
    { id: 9, title: "Cloud storage bucket publicly accessible", severity: "critical", status: "resolved", reportedDate: daysAgo(20), assignee: "CloudOps", reportedBy: "Security Scan", category: "misconfiguration", description: "AWS S3 bucket containing backup data was configured as publicly readable. Discovered during routine cloud security scan. No evidence of data access.", rootCause: "Terraform template misconfiguration - missing private ACL setting.", resolution: "Bucket access restricted, Terraform templates updated and reviewed, cloud security scanning enhanced" },
    { id: 10, title: "GDPR data subject erasure request missed deadline", severity: "medium", status: "remediation", reportedDate: daysAgo(9), assignee: "DPO", reportedBy: "Compliance Team", category: "compliance_failure", description: "Data subject erasure request exceeded 30-day statutory deadline due to processing backlog in engineering team.", rootCause: "Lack of automated erasure workflow and insufficient engineering capacity for manual data deletion.", resolution: "Request processed late, automated erasure workflow being implemented, backlog triaged" },
    { id: 11, title: "Vendor data breach notification", severity: "critical", status: "investigating", reportedDate: daysAgo(1), assignee: "Procurement", reportedBy: "Vendor Notification", category: "third_party", description: "Critical vendor (cloud infrastructure provider) reported security incident potentially affecting customer data hosted on their platform.", rootCause: "", resolution: "" },
    { id: 12, title: "Unauthorized physical access attempt", severity: "medium", status: "closed", reportedDate: daysAgo(25), assignee: "Physical Security", reportedBy: "Security Guard", category: "physical_security", description: "Individual without valid badge attempted to tailgate into secured office area. Stopped by security personnel.", rootCause: "Tailgating - individual followed authorized employee through access door.", resolution: "Incident documented, security awareness reminder sent to all employees" },
    { id: 13, title: "API rate limit abuse detected", severity: "medium", status: "resolved", reportedDate: daysAgo(22), assignee: "API Team", reportedBy: "Automated Monitoring", category: "abuse", description: "Customer API key used to make excessive requests (1000x normal rate) potentially indicating account compromise or abuse.", rootCause: "Customer API key leaked in public GitHub repository.", resolution: "API key rotated, customer notified, GitHub repository scanned and secret removed" },
    { id: 14, title: "Ransomware attempt blocked", severity: "critical", status: "resolved", reportedDate: daysAgo(16), assignee: "SOC", reportedBy: "EDR Alert", category: "ransomware", description: "EDR detected and blocked ransomware encryption attempt on engineering workstation. Attack originated from malicious email attachment.", rootCause: "Employee opened phishing email containing malicious macro-enabled document.", resolution: "Threat contained by EDR, workstation isolated and reimaged, IOC shared with threat intelligence" },
    { id: 15, title: "Data export by departing employee", severity: "high", status: "investigating", reportedDate: daysAgo(3), assignee: "IT Security", reportedBy: "DLP Alert", category: "data_exfiltration", description: "DLP system detected departing employee downloading large volume of customer data to personal USB drive on last day of employment.", rootCause: "", resolution: "" },
    { id: 16, title: "Insider trading policy breach investigation", severity: "high", status: "investigating", reportedDate: daysAgo(7), assignee: "Legal Counsel", reportedBy: "Compliance Officer", category: "policy_violation", description: "Executive reported stock trades during blackout period. Referral to legal for investigation.", rootCause: "", resolution: "" },
    { id: 17, title: "Incorrect data processing consent", severity: "medium", status: "resolved", reportedDate: daysAgo(30), assignee: "Privacy Team", reportedBy: "Audit Finding", category: "compliance_failure", description: "Marketing automation platform found processing personal data without proper consent for 2,500 contacts.", rootCause: "Legacy consent records not migrated to new consent management platform.", resolution: "Consent re-obtained for affected contacts, data migration audit completed, records corrected" },
    { id: 18, title: "Privileged access account compromise", severity: "critical", status: "remediation", reportedDate: daysAgo(10), assignee: "IAM Team", reportedBy: "SIEM Alert", category: "account_compromise", description: "Service account with admin privileges showed unusual login pattern from unrecognized geographic location.", rootCause: "Service account credentials found in public code repository.", resolution: "Account disabled, credentials rotated, access logs being analyzed for unauthorized activity" },
    { id: 19, title: "Software license compliance gap", severity: "low", status: "closed", reportedDate: daysAgo(35), assignee: "IT Procurement", reportedBy: "Software Audit", category: "compliance_failure", description: "Software license audit revealed 50 unlicensed copies of analytics software installed across engineering team.", rootCause: "Software installed via central deployment without proper license allocation.", resolution: "Licenses procured, deployment process updated to verify license availability" },
    { id: 20, title: "DDoS attack on customer-facing service", severity: "critical", status: "resolved", reportedDate: daysAgo(28), assignee: "Network Security", reportedBy: "DDoS Protection", category: "availability", description: "Layer 7 DDoS attack targeted customer authentication endpoint. WAF and DDoS protection mitigated impact with 2-minute latency spike.", rootCause: "Targeted attack on login endpoint, likely competitor or activist group.", resolution: "Attack mitigated by WAF rules, IPs blocked, post-incident review completed" },
    { id: 21, title: "Employee data access without business need", severity: "high", status: "remediation", reportedDate: daysAgo(12), assignee: "Privacy Officer", reportedBy: "Access Review", category: "unauthorized_access", description: "Quarterly access review identified manager accessing HR records of employees outside their reporting line without authorization.", rootCause: "Excessive access rights not removed after team restructuring.", resolution: "Access revoked, data access logs reviewed, HR system access controls updated" },
    { id: 22, title: "Certificate expiration causes outage", severity: "high", status: "resolved", reportedDate: daysAgo(40), assignee: "Infrastructure", reportedBy: "Monitoring Alert", category: "availability", description: "Expired TLS certificate caused 45-minute service outage for customer-facing API. Automated certificate renewal had failed silently.", rootCause: "Automated certificate renewal script had bug that caused silent failures for specific certificate type.", resolution: "Certificate manually renewed, renewal script fixed, monitoring added for certificate expiry" },
    { id: 23, title: "Confidential document left in public area", severity: "low", status: "closed", reportedDate: daysAgo(45), assignee: "Facilities", reportedBy: "Employee Report", category: "physical_security", description: "Confidential merger documents found in meeting room shared with external visitors. Documents contained non-public financial information.", rootCause: "Employee forgot to collect documents after meeting.", resolution: "Documents secured, employee reminded of clean desk policy" },
    { id: 24, title: "GDPR data portability request backlog", severity: "medium", status: "remediation", reportedDate: daysAgo(15), assignee: "Data Engineering", reportedBy: "DPO", category: "compliance_failure", description: "Data portability requests accumulated due to manually intensive export process requiring engineering support.", rootCause: "Lack of automated data export functionality for customer data.", resolution: "Automated export tool being developed, interim manual process documented" },
    { id: 25, title: "Customer account takeover attempt", severity: "critical", status: "investigating", reportedDate: daysAgo(1), assignee: "Security Team", reportedBy: "Fraud Detection", category: "account_compromise", description: "Multiple customer accounts showed login attempts from botnet IPs. Credential stuffing attack in progress.", rootCause: "", resolution: "" },
    { id: 26, title: "Unsecured API endpoint discovery", severity: "high", status: "resolved", reportedDate: daysAgo(33), assignee: "AppSec Team", reportedBy: "Pen Test", category: "vulnerability", description: "Penetration test discovered internal API endpoint accessible without authentication that returns user profile data.", rootCause: "API gateway routing misconfiguration allowed public access to internal endpoint.", resolution: "Endpoint secured, API gateway configuration audited, additional testing completed" },
    { id: 27, title: "Vendor contract termination - data return", severity: "medium", status: "closed", reportedDate: daysAgo(50), assignee: "Procurement", reportedBy: "Vendor Manager", category: "third_party", description: "Former vendor failed to return customer data within contractual 30-day window after contract termination.", rootCause: "Vendor operational delay and unclear data return process.", resolution: "Data received after escalation, vendor offboarding process updated" },
    { id: 28, title: "Biometric time clock data access concern", severity: "medium", status: "resolved", reportedDate: daysAgo(20), assignee: "Privacy Officer", reportedBy: "Employee Complaint", category: "privacy", description: "Employee raised concern about biometric fingerprint data collected for time tracking and who has access to it.", rootCause: "Lack of transparency about biometric data handling and access controls.", resolution: "Privacy notice updated, access controls reviewed, employee notified of data handling practices" },
    { id: 29, title: "Unauthorized software installation", severity: "low", status: "closed", reportedDate: daysAgo(55), assignee: "IT Operations", reportedBy: "Software Inventory", category: "policy_violation", description: "Employee installed unauthorized screen recording software on company laptop. Software had data exfiltration capabilities.", rootCause: "Employee wanted to record training sessions but used unapproved software.", resolution: "Software removed, approved alternatives provided, policy reminded" },
    { id: 30, title: "Executive impersonation - wire fraud attempt", severity: "critical", status: "resolved", reportedDate: daysAgo(42), assignee: "Treasury", reportedBy: "Accounts Payable", category: "fraud", description: "AP team received email appearing from CFO requesting urgent wire transfer of $250,000 to new vendor. Alert employee verified request verbally and stopped transfer.", rootCause: "Spear-phishing email spoofing CFO's email address with social engineering.", resolution: "Wire transfer blocked, security awareness team notified, training example created" },
  ];
  return incidents.map(inc => ({
    ...inc,
    impact: inc.severity === "critical" ? "Critical business operations affected" : inc.severity === "high" ? "Significant business impact" : inc.severity === "medium" ? "Moderate operational impact" : "Minor operational impact",
    regulatoryReporting: inc.category === "data_leakage" || inc.category === "data_exfiltration" || inc.category === "account_compromise" || inc.id === 10 || inc.id === 11 || inc.id === 24,
    comments: [
      { id: 1, author: "SOC Analyst", text: "Initial investigation started. Gathering evidence.", date: daysAgo(1) },
      { id: 2, author: "IT Manager", text: "Impact assessment in progress.", date: daysAgo(1) },
    ],
  }));
}

function mockIncidentsSummary() {
  const incidents = getIncidents();
  const investigating = incidents.filter(i => i.status === "investigating").length;
  const remediation = incidents.filter(i => i.status === "remediation").length;
  return {
    total: incidents.length,
    open: investigating + remediation,
    byStatus: {
      reported: incidents.filter(i => i.status === "reported").length,
      investigating,
      remediation,
      resolved: incidents.filter(i => i.status === "resolved").length,
      closed: incidents.filter(i => i.status === "closed").length,
    },
    bySeverity: {
      critical: incidents.filter(i => i.severity === "critical").length,
      high: incidents.filter(i => i.severity === "high").length,
      medium: incidents.filter(i => i.severity === "medium").length,
      low: incidents.filter(i => i.severity === "low").length,
    },
    byCategory: {
      phishing: incidents.filter(i => i.category === "phishing").length,
      unauthorized_access: incidents.filter(i => i.category === "unauthorized_access").length,
      misconfiguration: incidents.filter(i => i.category === "misconfiguration").length,
      malware: incidents.filter(i => i.category === "malware").length,
      compliance_failure: incidents.filter(i => i.category === "compliance_failure").length,
      third_party: incidents.filter(i => i.category === "third_party").length,
      account_compromise: incidents.filter(i => i.category === "account_compromise").length,
      data_exfiltration: incidents.filter(i => i.category === "data_exfiltration").length,
      policy_violation: incidents.filter(i => i.category === "policy_violation").length,
      physical_security: incidents.filter(i => i.category === "physical_security").length,
    },
  };
}


function mockReports() {
  return [
    { id: 1, type: "compliance_summary", title: "Enterprise Compliance Summary - Q2 2026", description: "Comprehensive compliance posture overview across all regulatory frameworks including GDPR, SOC 2, ISO 27001, PCI DSS, HIPAA, and SOX.", generatedDate: "2026-06-15", generatedBy: "Compliance Director", status: "completed", format: "pdf", framework: "Multi-Framework", pages: 45 },
    { id: 2, type: "risk_analysis", title: "Enterprise Risk Analysis Report - H1 2026", description: "Detailed risk analysis covering all identified risks, heat map, mitigation status, and residual risk assessment.", generatedDate: "2026-06-10", generatedBy: "CRO", status: "completed", format: "pdf", framework: "Enterprise Risk", pages: 62 },
    { id: 3, type: "audit_findings", title: "Audit Findings Summary - Q2 2026", description: "Consolidated audit findings from all active and completed audits in Q2 2026, including severity distribution and remediation tracking.", generatedDate: "2026-06-30", generatedBy: "Internal Audit Director", status: "pending", format: "excel", framework: "Multi-Audit", pages: 28 },
    { id: 4, type: "incident_trends", title: "Security Incident Trend Analysis - H1 2026", description: "Analysis of security incidents reported in H1 2026 including trends by severity, category, mean time to detect, and mean time to resolve.", generatedDate: "2026-06-20", generatedBy: "SOC Manager", status: "pending", format: "pdf", framework: "Incident Response", pages: 35 },
    { id: 5, type: "policy_compliance", title: "Policy Compliance & Acknowledgement Report", description: "Organization-wide policy compliance metrics including acknowledgement rates, coverage by department, and overdue acknowledgements.", generatedDate: "2026-06-12", generatedBy: "Compliance Analyst", status: "completed", format: "csv", framework: "Policy Management", pages: 18 },
    { id: 6, type: "executive_pack", title: "Executive Compliance Pack - Q2 2026", description: "Executive summary of compliance posture, key risks, audit status, and strategic recommendations for Board of Directors.", generatedDate: "2026-07-01", generatedBy: "CCO", status: "pending", format: "pdf", framework: "Executive", pages: 20 },
    { id: 7, type: "compliance_summary", title: "SOC 2 Compliance Status Report", description: "SOC 2 Type II readiness assessment status, control testing results, and remediation progress.", generatedDate: "2026-06-08", generatedBy: "Compliance Director", status: "completed", format: "pdf", framework: "SOC 2", pages: 38 },
    { id: 8, type: "risk_analysis", title: "Third-Party Risk Assessment Report", description: "Risk assessment results for all critical and high-risk vendors including scores, findings, and remediation plans.", generatedDate: "2026-06-05", generatedBy: "Risk Manager", status: "completed", format: "excel", framework: "Third-Party Risk", pages: 55 },
    { id: 9, type: "audit_findings", title: "ISO 27001 Internal Audit Report", description: "Findings from annual ISO 27001 internal audit including non-conformities, observations, and opportunities for improvement.", generatedDate: "2026-07-05", generatedBy: "Quality Manager", status: "pending", format: "pdf", framework: "ISO 27001", pages: 42 },
    { id: 10, type: "compliance_summary", title: "GDPR Compliance Assessment Report", description: "GDPR compliance maturity assessment covering data mapping, consent management, DSAR processing, breach response, and cross-border transfers.", generatedDate: "2026-06-18", generatedBy: "DPO", status: "completed", format: "pdf", framework: "GDPR", pages: 50 },
    { id: 11, type: "policy_compliance", title: "Policy Effectiveness Metrics Dashboard", description: "Metrics dashboard showing policy effectiveness, review completion rates, and policy lifecycle status.", generatedDate: "2026-06-14", generatedBy: "Policy Manager", status: "completed", format: "pdf", framework: "Policy Management", pages: 22 },
    { id: 12, type: "incident_trends", title: "Phishing Simulation Results Report", description: "Quarterly phishing simulation results including click rates, department comparisons, and improvement trends.", generatedDate: "2026-06-07", generatedBy: "Security Awareness Manager", status: "completed", format: "excel", framework: "Security Awareness", pages: 15 },
    { id: 13, type: "executive_pack", title: "Board Risk Committee Report - Q2 2026", description: "Quarterly risk report for Board Risk Committee covering top risks, KRI dashboard, and risk appetite compliance.", generatedDate: "2026-06-25", generatedBy: "CRO", status: "pending", format: "pdf", framework: "Executive", pages: 30 },
    { id: 14, type: "compliance_summary", title: "PCI DSS Compliance Status Report", description: "PCI DSS 4.0 compliance status including SAQ progress, ASV scan results, and CDE scope documentation.", generatedDate: "2026-06-22", generatedBy: "Compliance Analyst", status: "completed", format: "pdf", framework: "PCI DSS", pages: 33 },
    { id: 15, type: "risk_analysis", title: "IT Risk Assessment Report", description: "IT risk assessment covering infrastructure, applications, cloud, and security operations risk areas.", generatedDate: "2026-06-03", generatedBy: "IT Risk Manager", status: "completed", format: "pdf", framework: "IT Risk", pages: 48 },
    { id: 16, type: "audit_findings", title: "Financial Controls Audit Report - Q2", description: "Q2 2026 financial controls audit findings including revenue recognition, procurement, and payroll control testing results.", generatedDate: "2026-06-28", generatedBy: "Internal Audit", status: "pending", format: "pdf", framework: "SOX", pages: 36 },
    { id: 17, type: "incident_trends", title: "Cyber Threat Intelligence Report - June 2026", description: "Monthly threat intelligence report covering industry-specific threats, actor profiles, and recommended mitigations.", generatedDate: "2026-06-30", generatedBy: "Threat Intel Lead", status: "pending", format: "pdf", framework: "Threat Intelligence", pages: 25 },
    { id: 18, type: "executive_pack", title: "Annual Compliance Report - FY2026 (Preliminary)", description: "Preliminary annual compliance report covering all regulatory obligations, compliance initiatives, and forward-looking strategy.", generatedDate: "2026-07-15", generatedBy: "CCO", status: "pending", format: "pdf", framework: "Executive", pages: 60 },
    { id: 19, type: "compliance_summary", title: "HIPAA Compliance Assessment Report", description: "HIPAA privacy and security compliance assessment results including gap analysis, remediation plan, and milestone tracking.", generatedDate: "2026-06-25", generatedBy: "Privacy Officer", status: "pending", format: "pdf", framework: "HIPAA", pages: 44 },
    { id: 20, type: "policy_compliance", title: "Policy Acknowledgment Compliance Report", description: "Department-level policy acknowledgment compliance tracking with aging analysis and escalation recommendations.", generatedDate: "2026-06-11", generatedBy: "HR Director", status: "completed", format: "csv", framework: "Policy Management", pages: 12 },
  ];
}

function mockReportsSummary() {
  const reports = getReports();
  return {
    total: reports.length,
    byType: {
      compliance_summary: reports.filter(r => r.type === "compliance_summary").length,
      risk_analysis: reports.filter(r => r.type === "risk_analysis").length,
      audit_findings: reports.filter(r => r.type === "audit_findings").length,
      incident_trends: reports.filter(r => r.type === "incident_trends").length,
      policy_compliance: reports.filter(r => r.type === "policy_compliance").length,
      executive_pack: reports.filter(r => r.type === "executive_pack").length,
    },
    byStatus: {
      completed: reports.filter(r => r.status === "completed").length,
      pending: reports.filter(r => r.status === "pending").length,
    },
  };
}


const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

async function fetchWithFallback(url, mockFn, isList = true) {
  try {
    const result = await api.get(url);
    return result;
  } catch (err) {
    console.warn(`complyService: fetch failed for ${url}, falling back to mock:`, err.message || err);
  }
  await delay();
  const data = mockFn ? mockFn() : undefined;
  if (isList && Array.isArray(data)) return [...data];
  if (!isList && typeof data === "object" && data !== null) return { ...data };
  return data;
}

export async function getDashboard() {
  return fetchWithFallback("/comply/dashboard", mockDashboard, false);
}

export async function getObligations() {
  return fetchWithFallback("/comply/obligations", mockObligations);
}

export async function getObligationsDashboard() {
  return fetchWithFallback("/comply/obligations/dashboard", mockObligationsDashboard, false);
}

export async function getControls() {
  return fetchWithFallback("/comply/controls", mockControls);
}

export async function getControlById(id) {
  try {
    return await api.get(`/comply/controls/${id}`);
  } catch (err) {
    console.warn(`complyService: fetch failed for /comply/controls/${id}, falling back to mock:`, err.message || err);
  }
  await delay();
  return mockControls().find(c => c.id === Number(id)) || null;
}

export async function getControlsSummary() {
  return fetchWithFallback("/comply/controls/summary", mockControlsSummary, false);
}

export async function getRisks() {
  return fetchWithFallback("/comply/risks", mockRisks);
}

export async function getRisksSummary() {
  return fetchWithFallback("/comply/risks/summary", mockRisksSummary, false);
}

export async function getAudits() {
  return fetchWithFallback("/comply/audits", mockAudits);
}

export async function getAuditFindings(auditId) {
  try {
    return await api.get(`/comply/audits/${auditId}/findings`);
  } catch (err) {
    console.warn(`complyService: fetch failed for /comply/audits/${auditId}/findings, falling back to mock:`, err.message || err);
  }
  await delay();
  return [...mockAuditFindings(auditId)];
}

export async function getAuditsSummary() {
  return fetchWithFallback("/comply/audits/summary", mockAuditsSummary, false);
}

export async function getEvidence() {
  return fetchWithFallback("/comply/evidence", mockEvidence);
}

export async function getEvidenceSummary() {
  return fetchWithFallback("/comply/evidence/summary", mockEvidenceSummary, false);
}

export async function getPolicies(category) {
  const url = `/comply/policies${category ? `?category=${category}` : ""}`;
  try {
    return await api.get(url);
  } catch (err) {
    console.warn(`complyService: fetch failed for ${url}, falling back to mock:`, err.message || err);
  }
  await delay();
  return [...mockPolicies()];
}

export async function getPolicyById(id) {
  try {
    return await api.get(`/comply/policies/${id}`);
  } catch (err) {
    console.warn(`complyService: fetch failed for /comply/policies/${id}, falling back to mock:`, err.message || err);
  }
  await delay();
  return mockPolicies().find(p => p.id === Number(id)) || null;
}

export async function getPoliciesSummary() {
  return fetchWithFallback("/comply/policies/summary", mockPoliciesSummary, false);
}

export async function getCalendarEvents() {
  return fetchWithFallback("/comply/calendar", mockCalendarEvents);
}

export async function getCalendarSummary() {
  return fetchWithFallback("/comply/calendar/summary", mockCalendarSummary, false);
}

export async function getIncidents() {
  return fetchWithFallback("/comply/incidents", mockIncidents);
}

export async function getIncidentsSummary() {
  return fetchWithFallback("/comply/incidents/summary", mockIncidentsSummary, false);
}

export async function getReports() {
  return fetchWithFallback("/comply/reports", mockReports);
}

export async function getReportsSummary() {
  return fetchWithFallback("/comply/reports/summary", mockReportsSummary, false);
}

export const createPolicy = (payload) => api.post("/comply/policies", payload);

export const updatePolicy = (id, payload) => api.put(`/comply/policies/${id}`, payload);

export const acknowledgePolicy = (policyId) => api.post(`/comply/policies/${policyId}/ack`);

export const getAcknowledgements = async (policyId) => {
  try {
    return await api.get(`/comply/policies/${policyId}/acks`);
  } catch (err) {
    console.warn(`complyService: fetch failed for /comply/policies/${policyId}/acks, falling back to mock:`, err.message || err);
  }
  return [];
};

export const getOverview = async () => {
  try {
    return await api.get("/comply/overview");
  } catch (err) {
    console.warn("complyService: fetch failed for /comply/overview, falling back to mock:", err.message || err);
  }
  return { message: "Zoiko Comply overview (mock)" };
};

export const getFilingCalendar = async (params) => {
  try {
    return await api.get("/comply/filing-calendar", { params });
  } catch (err) {
    console.warn("complyService: fetch failed for /comply/filing-calendar, falling back to mock:", err.message || err);
  }
  return [];
};

export const getAuditLogs = async (params) => {
  try {
    return await api.get("/comply/audit-logs", { params });
  } catch (err) {
    console.warn("complyService: fetch failed for /comply/audit-logs, falling back to mock:", err.message || err);
  }
  return [];
};

export const getEvidencePacks = async (params) => {
  try {
    return await api.get("/comply/evidence-packs", { params });
  } catch (err) {
    console.warn("complyService: fetch failed for /comply/evidence-packs, falling back to mock:", err.message || err);
  }
  return [];
};

export const getRiskAlerts = async (params) => {
  try {
    return await api.get("/comply/risk-alerts", { params });
  } catch (err) {
    console.warn("complyService: fetch failed for /comply/risk-alerts, falling back to mock:", err.message || err);
  }
  return [];
};

export const acknowledgeRiskAlert = async (id) => {
  try {
    return await api.post(`/comply/risk-alerts/${id}/ack`);
  } catch (err) {
    console.warn(`complyService: fetch failed for /comply/risk-alerts/${id}/ack, falling back to mock:`, err.message || err);
  }
  return { acknowledged: true };
};

export async function getIncidentById(id) {
  try {
    return await api.get(`/comply/incidents/${id}`);
  } catch (err) {
    console.warn(`complyService: fetch failed for /comply/incidents/${id}, falling back to mock:`, err.message || err);
  }
  await delay();
  return mockIncidents().find(i => i.id === Number(id)) || null;
}

export const updateIncident = (id, payload) => api.put(`/comply/incidents/${id}`, payload);

export async function getCertifications() {
  await delay();
  return [
    { id: 1, name: "ISO 27001:2022", standard: "ISO 27001", issuedDate: "2024-03-15", expiryDate: "2027-03-14", status: "active", auditor: "BSI Group" },
    { id: 2, name: "SOC 2 Type II", standard: "SOC 2", issuedDate: "2024-06-01", expiryDate: "2025-06-01", status: "active", auditor: "Deloitte" },
    { id: 3, name: "PCI DSS v4.0", standard: "PCI DSS", issuedDate: "2024-01-20", expiryDate: "2025-01-19", status: "active", auditor: "SecurityMetrics" },
    { id: 4, name: "HIPAA Compliance", standard: "HIPAA", issuedDate: "2024-09-10", expiryDate: "2025-09-09", status: "active", auditor: "CompliancePoint" },
    { id: 5, name: "GDPR Rep. Designation", standard: "GDPR", issuedDate: "2024-02-01", expiryDate: "2026-02-01", status: "active", auditor: "Internal" },
    { id: 6, name: "FedRAMP Moderate", standard: "FedRAMP", issuedDate: "2025-01-15", expiryDate: "2028-01-14", status: "in_progress", auditor: "KPMG" },
    { id: 7, name: "ISO 27701", standard: "ISO 27701", issuedDate: "2024-11-01", expiryDate: "2027-10-31", status: "active", auditor: "BSI Group" },
    { id: 8, name: "NIST CSF", standard: "NIST", issuedDate: "2024-08-15", expiryDate: "2025-08-14", status: "expired", auditor: "Internal" },
  ];
}

export const uploadEvidence = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/comply/evidence", formData).catch(() => ({ success: true, filename: file.name }));
};

export async function getRiskRegister() {
  try {
    return await api.get("/comply/risks/register");
  } catch (err) {
    console.warn("complyService: fetch failed for /comply/risks/register, falling back to mock:", err.message || err);
  }
  await delay();
  const risks = mockRisks();
  return {
    total: risks.length,
    severityDistribution: {
      critical: risks.filter(r => r.score >= 15).length,
      high: risks.filter(r => r.score >= 10 && r.score < 15).length,
      medium: risks.filter(r => r.score >= 5 && r.score < 10).length,
      low: risks.filter(r => r.score < 5).length,
    },
  };
}

export const updateRisk = (id, payload) => api.put(`/comply/risks/${id}`, payload);

export async function getControlsLibrary() {
  try {
    return await api.get("/comply/controls/library");
  } catch (err) {
    console.warn("complyService: fetch failed for /comply/controls/library, falling back to mock:", err.message || err);
  }
  await delay();
  const controls = mockControls();
  return {
    total: controls.length,
    statusDistribution: {
      active: controls.filter(c => c.status === "operating").length,
      inactive: controls.filter(c => c.status === "not_operating" || c.status === "deficient").length,
      not_implemented: controls.filter(c => c.status === "not_implemented" || c.status === "planned").length,
    },
  };
}

export async function getTraining() {
  await delay();
  return [
    { id: 1, title: "GDPR Awareness Training", type: "regulatory", enrolled: 245, completionRate: 78, dueDate: "2026-07-15", status: "in_progress" },
    { id: 2, title: "Security Awareness Annual", type: "security", enrolled: 320, completionRate: 92, dueDate: "2026-06-30", status: "completed" },
    { id: 3, title: "Anti-Money Laundering", type: "compliance", enrolled: 120, completionRate: 65, dueDate: "2026-08-01", status: "in_progress" },
    { id: 4, title: "Code of Conduct", type: "ethics", enrolled: 400, completionRate: 95, dueDate: "2026-05-31", status: "completed" },
    { id: 5, title: "Data Privacy for Engineers", type: "technical", enrolled: 180, completionRate: 55, dueDate: "2026-09-01", status: "pending" },
    { id: 6, title: "Information Security Policy", type: "security", enrolled: 350, completionRate: 88, dueDate: "2026-07-01", status: "completed" },
    { id: 7, title: "Incident Response Training", type: "technical", enrolled: 95, completionRate: 72, dueDate: "2026-08-15", status: "in_progress" },
    { id: 8, title: "Records Management", type: "compliance", enrolled: 150, completionRate: 60, dueDate: "2026-09-30", status: "pending" },
  ];
}
