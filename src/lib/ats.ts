// ---------------------------------------------------------------------------
// Role-skill dictionary and local resume keyword comparison helpers.
// Pure TypeScript — safe to import from both server and client bundles.
// ---------------------------------------------------------------------------

export interface SkillDef {
  id: string;
  label: string;
  aliases: string[];
}

export const SKILLS: SkillDef[] = [
  { id: "requirements-gathering", label: "Requirements Gathering", aliases: ["requirements gathering", "requirement gathering", "requirements elicitation", "eliciting requirements"] },
  { id: "stakeholder-management", label: "Stakeholder Management", aliases: ["stakeholder management", "stakeholder engagement", "managing stakeholders"] },
  { id: "user-stories", label: "User Stories", aliases: ["user stories", "user story mapping", "story writing"] },
  { id: "brd", label: "Business Requirements Document (BRD)", aliases: ["brd", "business requirements document", "business requirement document"] },
  { id: "frd", label: "Functional Requirements (FRD)", aliases: ["frd", "functional requirements document", "functional specification"] },
  { id: "process-mapping", label: "Process Mapping", aliases: ["process mapping", "process flows", "process modeling", "as-is to-be", "as is to be"] },
  { id: "gap-analysis", label: "Gap Analysis", aliases: ["gap analysis", "fit gap"] },
  { id: "uat", label: "UAT / Acceptance Testing", aliases: ["uat", "user acceptance testing", "acceptance testing"] },
  { id: "acceptance-criteria", label: "Acceptance Criteria", aliases: ["acceptance criteria", "definition of done"] },
  { id: "wireframing", label: "Wireframing & Mockups", aliases: ["wireframing", "wireframes", "mockups", "prototyping", "figma", "balsamiq"] },
  { id: "data-analysis", label: "Data Analysis", aliases: ["data analysis", "data analytics", "analyze data", "data-driven"] },
  { id: "sql", label: "SQL", aliases: ["sql", "mysql", "postgresql", "sql server", "t-sql", "pl/sql"] },
  { id: "excel", label: "Advanced Excel", aliases: ["excel", "ms excel", "advanced excel", "vlookup", "xlookup", "macros", "vba"] },
  { id: "pivot-tables", label: "Pivot Tables", aliases: ["pivot tables", "pivot table"] },
  { id: "power-bi", label: "Power BI", aliases: ["power bi", "powerbi", "dax", "power query"] },
  { id: "tableau", label: "Tableau", aliases: ["tableau"] },
  { id: "looker", label: "Looker / Looker Studio", aliases: ["looker", "looker studio", "google data studio"] },
  { id: "dashboards", label: "Dashboard & KPI Reporting", aliases: ["dashboards", "dashboarding", "kpi reporting", "kpi dashboards", "scorecards", "executive reporting"] },
  { id: "agile", label: "Agile Methodology", aliases: ["agile", "agile methodology", "agile delivery", "safe agile"] },
  { id: "scrum", label: "Scrum / Sprint Ceremonies", aliases: ["scrum", "sprint planning", "daily standup", "daily stand-up", "sprint review", "kanban"] },
  { id: "jira", label: "Jira", aliases: ["jira"] },
  { id: "confluence", label: "Confluence", aliases: ["confluence"] },
  { id: "bpmn", label: "BPMN Notation", aliases: ["bpmn", "bpmn 2.0"] },
  { id: "visio", label: "Microsoft Visio", aliases: ["visio", "ms visio"] },
  { id: "lucidchart", label: "Lucidchart / Miro", aliases: ["lucidchart", "miro", "draw.io"] },
  { id: "root-cause", label: "Root Cause Analysis", aliases: ["root cause analysis", "5 whys", "five whys", "fishbone"] },
  { id: "swot", label: "SWOT & Market Analysis", aliases: ["swot", "swot analysis", "market analysis", "competitor analysis", "market research"] },
  { id: "financial-modeling", label: "Financial Modeling", aliases: ["financial modeling", "financial modelling", "financial analysis", "cost benefit analysis", "roi analysis"] },
  { id: "forecasting", label: "Forecasting & Planning", aliases: ["forecasting", "demand planning", "capacity planning", "budgeting"] },
  { id: "etl", label: "ETL & Data Pipelines", aliases: ["etl", "data pipeline", "data pipelines", "data integration"] },
  { id: "api-documentation", label: "API & Integration Docs", aliases: ["api documentation", "api integration", "rest api", "apis", "postman", "swagger"] },
  { id: "salesforce", label: "Salesforce CRM", aliases: ["salesforce", "sfdc"] },
  { id: "sap", label: "SAP / ERP Systems", aliases: ["sap", "sap mm", "sap sd", "sap fico", "erp", "oracle erp", "netsuite"] },
  { id: "servicenow", label: "ServiceNow", aliases: ["servicenow", "service now"] },
  { id: "python", label: "Python", aliases: ["python", "pandas", "numpy"] },
  { id: "statistics", label: "Statistical Analysis", aliases: ["statistics", "statistical analysis", "regression", "hypothesis testing", "r programming"] },
  { id: "ab-testing", label: "A/B Testing", aliases: ["a/b testing", "ab testing", "experimentation"] },
  { id: "vendor-management", label: "Vendor Management", aliases: ["vendor management", "vendor evaluation", "rfp", "rfi"] },
  { id: "change-management", label: "Change Management", aliases: ["change management", "change enablement", "adoption"] },
  { id: "risk-assessment", label: "Risk Assessment", aliases: ["risk assessment", "risk analysis", "risk register", "raid log"] },
  { id: "regulatory", label: "Regulatory Compliance", aliases: ["regulatory compliance", "compliance", "sox", "gdpr", "audit support"] },
  { id: "crm", label: "CRM Platforms", aliases: ["crm", "crm platforms", "hubspot", "zoho"] },
  { id: "snowflake", label: "Snowflake / Cloud DWH", aliases: ["snowflake", "redshift", "bigquery", "databricks", "data warehouse"] },
  { id: "google-analytics", label: "Google Analytics", aliases: ["google analytics", "ga4"] },
  { id: "sharepoint", label: "SharePoint", aliases: ["sharepoint"] },
  { id: "ms-project", label: "MS Project / Smartsheet", aliases: ["ms project", "microsoft project", "smartsheet"] },
  { id: "roadmapping", label: "Product Roadmapping", aliases: ["roadmap", "roadmapping", "product roadmap"] },
  { id: "backlog-grooming", label: "Backlog Grooming & Prioritization", aliases: ["backlog grooming", "backlog refinement", "backlog prioritization", "prioritization", "moscow"] },
  { id: "facilitation", label: "Workshop Facilitation", aliases: ["facilitation", "workshops", "jad sessions", "focus groups"] },
  { id: "documentation", label: "Technical & Business Documentation", aliases: ["documentation", "technical documentation", "business documentation", "sop", "standard operating procedures"] },
  { id: "quality-assurance", label: "QA & Test Coordination", aliases: ["quality assurance", "qa coordination", "test cases", "test planning", "defect triage"] },
  { id: "stakeholder-interviews", label: "Stakeholder Interviews", aliases: ["stakeholder interviews", "user interviews", "one-on-one interviews"] },
  { id: "presentation", label: "Executive Presentations", aliases: ["executive presentations", "powerpoint", "deck building", "storytelling"] },
  { id: "negotiation", label: "Negotiation & Alignment", aliases: ["negotiation", "conflict resolution", "consensus building"] },
  { id: "kpi-definition", label: "KPI / Metric Definition", aliases: ["kpi definition", "metric definition", "north star metric", "okrs"] },
  { id: "data-modeling", label: "Data Modeling", aliases: ["data modeling", "data modelling", "er diagrams", "entity relationship"] },
  { id: "reporting-automation", label: "Reporting Automation", aliases: ["reporting automation", "automated reports", "report automation"] },
  { id: "business-case", label: "Business Case Development", aliases: ["business case", "business case development", "cost-benefit"] },
  { id: "product-strategy", label: "Product Strategy & Discovery", aliases: ["product strategy", "product discovery", "go-to-market", "gtm", "prd"] },
  { id: "machine-learning", label: "Machine Learning & Predictive Modeling", aliases: ["machine learning", "predictive modeling", "scikit-learn", "feature engineering"] },
  { id: "cloud-platforms", label: "Cloud Platforms (AWS / Azure / GCP)", aliases: ["aws", "azure", "gcp", "cloud architecture"] },
  { id: "devops-cicd", label: "CI/CD & DevOps Pipelines", aliases: ["ci/cd", "docker", "kubernetes", "github actions", "devops"] },
  { id: "typescript-react", label: "TypeScript & Modern Web", aliases: ["typescript", "javascript", "react", "next.js", "node.js"] },
  { id: "backend-microservices", label: "Microservices & System Design", aliases: ["microservices", "system design", "java", "spring boot", "distributed systems"] },
  { id: "test-automation", label: "Test Automation (Selenium / Playwright)", aliases: ["selenium", "playwright", "cypress", "test automation", "regression testing"] },
  { id: "program-delivery", label: "Program & Project Delivery", aliases: ["project delivery", "program management", "milestone tracking", "resource planning"] },
];

function byIds(ids: string[]): SkillDef[] {
  return ids
    .map((id) => SKILLS.find((s) => s.id === id))
    .filter((s): s is SkillDef => Boolean(s));
}

// Pools used by the job generator to compose realistic skill sets for BA and custom roles.
export const SKILL_POOLS = {
  core: byIds([
    "requirements-gathering", "stakeholder-management", "user-stories", "brd", "frd",
    "process-mapping", "gap-analysis", "uat", "acceptance-criteria", "data-analysis",
    "root-cause", "documentation", "facilitation", "backlog-grooming", "agile", "scrum",
    "stakeholder-interviews", "presentation", "kpi-definition", "business-case",
  ]),
  tools: byIds([
    "sql", "excel", "pivot-tables", "power-bi", "tableau", "looker", "jira", "confluence",
    "visio", "lucidchart", "bpmn", "wireframing", "snowflake", "google-analytics",
    "sharepoint", "ms-project", "salesforce", "sap", "servicenow", "python", "etl",
    "api-documentation", "reporting-automation",
  ]),
  domain: byIds([
    "swot", "financial-modeling", "forecasting", "vendor-management", "change-management",
    "risk-assessment", "regulatory", "crm", "ab-testing", "negotiation", "quality-assurance",
    "roadmapping", "data-modeling", "dashboards", "statistics",
  ]),
  product: byIds([
    "product-strategy", "roadmapping", "user-stories", "backlog-grooming", "ab-testing",
    "kpi-definition", "stakeholder-management", "wireframing", "google-analytics", "sql",
    "jira", "confluence", "presentation", "swot",
  ]),
  data: byIds([
    "sql", "python", "power-bi", "tableau", "snowflake", "etl", "data-modeling",
    "statistics", "machine-learning", "dashboards", "excel", "reporting-automation", "ab-testing",
  ]),
  engineering: byIds([
    "typescript-react", "backend-microservices", "cloud-platforms", "devops-cicd", "sql",
    "python", "api-documentation", "etl", "agile", "scrum", "jira", "test-automation",
  ]),
  qa: byIds([
    "test-automation", "quality-assurance", "uat", "acceptance-criteria", "api-documentation",
    "sql", "jira", "confluence", "agile", "scrum", "root-cause",
  ]),
  delivery: byIds([
    "program-delivery", "agile", "scrum", "stakeholder-management", "risk-assessment",
    "ms-project", "jira", "confluence", "change-management", "vendor-management", "forecasting",
  ]),
};

// ----- matching primitives ---------------------------------------------------

const regexCache = new Map<string, RegExp>();

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function regexFor(skill: SkillDef): RegExp {
  let r = regexCache.get(skill.id);
  if (!r) {
    // Include the display label itself so a label printed into a tailored
    // resume is always detectable by its own matcher (100% coverage guarantee).
    const all = [...skill.aliases, skill.label];
    r = new RegExp(`\\b(${all.map(escapeRegExp).join("|")})\\b`, "i");
    regexCache.set(skill.id, r);
  }
  return r;
}

export function skillPresent(text: string, skill: SkillDef): boolean {
  return regexFor(skill).test(text);
}

export function extractSkills(text: string): SkillDef[] {
  return SKILLS.filter((s) => skillPresent(text, s));
}

export function skillLabel(id: string): string {
  return SKILLS.find((s) => s.id === id)?.label ?? id;
}

export function skillById(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function extractYears(text: string): number {
  const m = text.match(/(\d+)\s*\+?\s*(years|yrs)/i);
  if (!m) return 3;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? Math.min(n, 20) : 3;
}

// ----- JD free-phrase extraction (beyond the dictionary) ---------------------

const PHRASE_STOP = new Set([
  "a related field", "a closely related role", "business analysis", "a related role",
  "the role", "this role", "agile environments", "a team", "senior leadership",
]);

export function extractJobPhrases(description: string): string[] {
  const found: string[] = [];
  const patterns = [
    /(?:hands-on\s+)?(?:experience|expertise|proficiency|knowledge|background|track record)\s+(?:in|with|of)\s+([a-z0-9\/\-\+\. ]{3,60})/gi,
    /(?:familiarity|exposure)\s+(?:with|to)\s+([a-z0-9\/\-\+\. ]{3,60})/gi,
    /(?:strong|deep|solid)\s+understanding\s+of\s+([a-z0-9\/\-\+\. ]{3,60})/gi,
    /(?:own|drive|lead)\s+([a-z0-9\/\-\+\. ]{4,50})\s+end-to-end/gi,
  ];
  for (const p of patterns) {
    let m: RegExpExecArray | null;
    while ((m = p.exec(description))) {
      let frag = (m[1] ?? "").split(/,| and | or |;/i)[0].trim().toLowerCase();
      frag = frag.replace(/[^a-z0-9\/\-\+\. ]/g, "").replace(/\s+/g, " ").trim();
      if (frag.length < 3 || frag.length > 45) continue;
      if (frag.split(" ").length > 5) continue;
      if (PHRASE_STOP.has(frag)) continue;
      if (SKILLS.some((s) => regexFor(s).test(frag))) continue; // already dictionary-covered
      found.push(frag);
      if (found.length >= 24) break;
    }
  }
  return Array.from(new Set(found)).slice(0, 8);
}

function phrasePresent(text: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i").test(text);
}

// ----- scoring ----------------------------------------------------------------

export interface AtsResult {
  score: number;
  matched: string[];
  missing: string[];
}

function structureScore(text: string): number {
  let bonus = 0;
  if (/\S+@\S+\.\S+/.test(text)) bonus += 2;
  if (/(professional summary|summary|objective)/i.test(text)) bonus += 2;
  if (/(experience|employment history)/i.test(text)) bonus += 2;
  if (/(education|academic)/i.test(text)) bonus += 2;
  if (/(skills|competencies)/i.test(text)) bonus += 1;
  const words = text.split(/\s+/).length;
  if (words >= 180 && words <= 1400) bonus += 1;
  return bonus; // max 10
}

export function atsScore(resumeText: string, requiredIds: string[]): AtsResult {
  const required = requiredIds
    .map((id) => skillById(id))
    .filter((s): s is SkillDef => Boolean(s));
  const matched = required.filter((s) => skillPresent(resumeText, s));
  const missing = required.filter((s) => !skillPresent(resumeText, s));
  const coverage = required.length ? matched.length / required.length : 1;
  const score = Math.min(99, Math.round(coverage * 89 + structureScore(resumeText)));
  return { score, matched: matched.map((s) => s.label), missing: missing.map((s) => s.label) };
}

export function matchScore(resumeText: string, requiredIds: string[]): number {
  const required = requiredIds
    .map((id) => skillById(id))
    .filter((s): s is SkillDef => Boolean(s));
  if (!required.length) return 72;
  const hits = required.filter((s) => skillPresent(resumeText, s)).length;
  const coverage = hits / required.length;
  const years = extractYears(resumeText);
  const seniorFit = years >= 3 ? 4 : 0;
  return Math.min(97, Math.round(40 + coverage * 53 + seniorFit));
}

// Legacy local parser heuristics. They do not connect to or predict employer ATS results.

export interface AtsProfileResult {
  id: string;
  name: string;
  score: number;
  notes: string[];
}

interface AtsWeights {
  kw: number;
  headers: number;
  contact: number;
  format: number;
}

export const ATS_PROFILES: { id: string; name: string; w: AtsWeights }[] = [
  { id: "workday", name: "Workday", w: { kw: 0.5, headers: 0.15, contact: 0.12, format: 0.23 } },
  { id: "greenhouse", name: "Greenhouse", w: { kw: 0.52, headers: 0.13, contact: 0.1, format: 0.25 } },
  { id: "lever", name: "Lever", w: { kw: 0.48, headers: 0.14, contact: 0.12, format: 0.26 } },
  { id: "taleo", name: "Oracle Taleo", w: { kw: 0.42, headers: 0.26, contact: 0.08, format: 0.24 } },
  { id: "icims", name: "iCIMS", w: { kw: 0.46, headers: 0.18, contact: 0.12, format: 0.24 } },
  { id: "successfactors", name: "SAP SuccessFactors", w: { kw: 0.44, headers: 0.22, contact: 0.1, format: 0.24 } },
  { id: "smartrecruiters", name: "SmartRecruiters", w: { kw: 0.49, headers: 0.15, contact: 0.12, format: 0.24 } },
  { id: "naukri-zoho", name: "Zoho / Naukri RMS", w: { kw: 0.45, headers: 0.17, contact: 0.16, format: 0.22 } },
];

const STRONG_VERBS = [
  "led", "owned", "delivered", "built", "drove", "launched", "designed", "managed",
  "automated", "analyzed", "analysed", "spearheaded", "orchestrated", "negotiated",
  "documented", "coordinated", "translated", "presented", "partnered", "facilitated",
  "defined", "implemented", "reduced", "increased", "cut", "saved", "improved",
  "created", "developed", "mapped", "identified", "gathered", "wrote", "ran",
  "supported", "conducted", "produced", "prioritized", "triaged", "tracked",
  "aligned", "standardized", "streamlined", "grew", "shipped",
];

export interface SuiteSignals {
  kwCoverage: number;
  headers: number;
  contact: number;
  format: number;
}

export function suiteSignals(
  resumeText: string,
  requiredIds: string[],
  phrases: string[]
): SuiteSignals {
  const required = requiredIds
    .map((id) => skillById(id))
    .filter((s): s is SkillDef => Boolean(s));
  const skillHits = required.filter((s) => skillPresent(resumeText, s)).length;
  const phraseHits = phrases.filter((p) => phrasePresent(resumeText, p)).length;
  const total = required.length + phrases.length;
  const kwCoverage = total ? (skillHits + phraseHits) / total : 1;

  const headerChecks = [
    /(professional summary|summary)/i,
    /(professional experience|work experience|experience)/i,
    /(education|academic)/i,
    /(core competencies|core skills|skills)/i,
  ];
  const headers = headerChecks.filter((r) => r.test(resumeText)).length / headerChecks.length;

  const email = /\S+@\S+\.\S+/.test(resumeText.slice(0, 300));
  const phone = /(\+?\d[\d\s-]{8,14}\d)/.test(resumeText.slice(0, 300));
  const contact = email && phone ? 1 : email || phone ? 0.6 : 0.2;

  const lower = resumeText.toLowerCase();
  // Parsers evaluate bullets inside the experience section — scope there.
  const expMatch = resumeText.match(/professional experience([\s\S]*?)(education|certifications|$)/i);
  const scope = expMatch ? expMatch[1] : resumeText;
  const bulletLines = scope.split("\n").filter((l) => /^\s*[-•*▪]/.test(l));
  const verbHits = bulletLines.filter((l) =>
    STRONG_VERBS.includes(l.replace(/^\s*[-•*▪]\s*/, "").split(/\s+/)[0]?.toLowerCase() ?? "")
  ).length;
  const words = resumeText.split(/\s+/).length;

  let format = 0;
  if (!/\|/.test(resumeText.slice(500))) format += 0.22; // no table chars inside body
  if (!/\t/.test(resumeText)) format += 0.1; // no tabs
  if (words >= 220 && words <= 1300) format += 0.16; // optimal length
  format += Math.min(bulletLines.length / 8, 1) * 0.18; // experience bullet density
  format += (bulletLines.length ? verbHits / bulletLines.length : 0) * 0.2; // action-verb lead
  if (/(19|20)\d{2}/.test(lower)) format += 0.14; // parseable dates

  return {
    kwCoverage,
    headers,
    contact,
    format: Math.min(1, format),
  };
}

export function atsSuite(
  resumeText: string,
  requiredIds: string[],
  phrases: string[] = []
): AtsProfileResult[] {
  const sig = suiteSignals(resumeText, requiredIds, phrases);
  return ATS_PROFILES.map((p) => {
    const score = Math.min(
      99,
      Math.round(
        100 * (sig.kwCoverage * p.w.kw + sig.headers * p.w.headers + sig.contact * p.w.contact + sig.format * p.w.format)
      )
    );
    const notes: string[] = [];
    if (sig.kwCoverage >= 0.99) notes.push("100% keyword coverage");
    else notes.push(`${Math.round(sig.kwCoverage * 100)}% keyword coverage`);
    if (sig.headers >= 0.99) notes.push("standard headers detected");
    else notes.push("some headers non-standard");
    if (sig.contact >= 0.99) notes.push("contact block parsed");
    if (sig.format >= 0.9) notes.push("clean single-column layout");
    else notes.push("layout mostly parseable");
    return { id: p.id, name: p.name, score, notes };
  });
}

// ----- tailoring engine --------------------------------------------------------

const PAST_TENSE: Record<string, string> = {
  own: "Owned", lead: "Led", drive: "Drove", translate: "Translated", present: "Presented",
  partner: "Partnered", build: "Built", define: "Defined", manage: "Managed",
  coordinate: "Coordinated", analyze: "Analyzed", analyse: "Analysed", document: "Documented",
  support: "Supported", facilitate: "Facilitated", collaborate: "Collaborated", design: "Designed",
  develop: "Developed", deliver: "Delivered", create: "Created", run: "Ran", gather: "Gathered",
};

const OUTCOME_CLAUSES = [
  " — held a 4-quarter streak of on-time, in-scope releases",
  " — cut requirement rework by ~30%",
  " — shrank stakeholder sign-off time by 25%",
  " — kept escaped severity-1 defects at zero",
  " — saved ~20 analyst-hours per month of manual effort",
  " — earned 4.8/5 average stakeholder CSAT",
];

function mirrorResponsibility(line: string, index: number): string {
  let s = line.replace(/^[-•*▪]\s*/, "").trim().replace(/\.$/, "");
  if (!s) return s;
  const first = s.split(/\s+/)[0] ?? "";
  const past = PAST_TENSE[first.toLowerCase()];
  s = past ? past + s.slice(first.length) : `Delivered ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
  return s + OUTCOME_CLAUSES[index % OUTCOME_CLAUSES.length] + ".";
}

export interface ResumeProfileIdentity {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  experienceYears?: number;
  experienceMonths?: number;
  city?: string;
}

export function parseResumeIdentity(base: string): Required<ResumeProfileIdentity> {
  const line = base.split("\n").map((l) => l.trim()).find((l) => l.length > 1);
  const cleanName = (line ?? "").replace(/[^a-zA-Z .'-]/g, "").trim();
  const tokens = cleanName.split(/\s+/).filter(Boolean);
  const firstName = tokens[0] ?? "";
  const lastName = tokens.length > 1 ? tokens.slice(1).join(" ") : "";

  const head = base.slice(0, 800);
  const emailMatch = head.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phoneMatch = head.match(/(\+?\d[\d\s-]{8,14}\d)/);
  const linkedinMatch = base.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);

  const years = extractYears(base);
  const monthsMatch = base.match(/(\d{1,2})\s*(?:months|mos)\b/i);
  const monthsRaw = monthsMatch ? parseInt(monthsMatch[1], 10) : 0;
  const experienceMonths = Number.isFinite(monthsRaw) ? Math.min(11, Math.max(0, monthsRaw)) : 0;

  const cityMatch = head.match(
    /\b(Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Gurugram|Gurgaon|Chennai|Noida|Delhi|Kolkata|London|New York|Austin|Singapore)(?:,\s*[A-Za-z ]+)?/i
  );

  return {
    firstName,
    lastName,
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0].trim() : "",
    linkedinUrl: linkedinMatch ? linkedinMatch[0] : "",
    experienceYears: years,
    experienceMonths,
    city: cityMatch ? cityMatch[0].trim() : "",
  };
}

function formatExpText(years: number, months: number): string {
  if (years > 0 && months > 0) {
    return `${years} year${years > 1 ? "s" : ""} ${months} month${months > 1 ? "s" : ""}`;
  }
  if (years > 0) return `${years}+ years`;
  if (months > 0) return `${months} months`;
  return "3+ years";
}

function extractBullets(base: string): string[] {
  return base
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-•*▪]/.test(l))
    .map((l) => l.replace(/^[-•*▪]\s*/, ""))
    .filter((l) => l.length > 24)
    .slice(0, 10);
}

function extractEducation(base: string): string[] {
  const lines = base.split("\n").map((l) => l.trim());
  const out: string[] = [];
  for (const l of lines) {
    if (/(b\.?tech|b\.?e\.?|bachelor|master|mba|b\.?sc|m\.?sc|university|college|cgpa|gpa|iim|iit|nit)/i.test(l) && l.length > 8) {
      out.push(l.replace(/^[-•*▪]\s*/, ""));
    }
    if (/(certified|certification|pmp|cbap|ecba|csm|pspo|scrum master)/i.test(l) && l.length > 8) {
      out.push(l.replace(/^[-•*▪]\s*/, ""));
    }
    if (out.length >= 4) break;
  }
  return out;
}

function extractRoleHeaders(base: string): string[] {
  return base
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        /(19|20)\d{2}/.test(l) &&
        l.length > 18 &&
        l.length < 130 &&
        !/b\.?tech|bachelor|master|mba|university|college|cgpa|gpa|certif/i.test(l)
    )
    .slice(0, 3);
}

function jdResponsibilities(description: string): string[] {
  const bullets = description
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-•*▪]/.test(l));
  // prefer the RESPONSIBILITIES block when present
  const respIdx = description.search(/responsibilities|what you'll do|role overview/i);
  if (respIdx >= 0) {
    const after = description.slice(respIdx);
    const trimmed = after
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[-•*▪]/.test(l))
      .slice(0, 5);
    if (trimmed.length) return trimmed;
  }
  return bullets.slice(0, 5);
}

export interface TailoredResult {
  text: string;
  matched: string[];
  gaps: string[];
  phrases: string[];
  score: number;
  coverage: number;
  suite: AtsProfileResult[];
}

export function enforceMultiAtsBestPractices(
  rawText: string,
  _requiredIds: string[],
  _phrases: string[],
  _identity: Required<ResumeProfileIdentity>
): string {
  return rawText
    .replace(/\t/g, "  ")
    .split("\n")
    .map((l) => l.replace(/\|/g, "·"))
    .join("\n");
}

export function tailorResume(
  base: string,
  _job: { title: string; company: string; description: string },
  requiredIds: string[]
): TailoredResult {
  const required = requiredIds
    .map((id) => skillById(id))
    .filter((s): s is SkillDef => Boolean(s));
  const matched = required.filter((s) => skillPresent(base, s));
  const gaps = required.filter((s) => !skillPresent(base, s));
  const coverage = required.length
    ? Math.round((matched.length / required.length) * 100)
    : 0;

  return {
    text: base,
    matched: matched.map((skill) => skill.label),
    gaps: gaps.map((skill) => skill.label),
    phrases: [],
    score: 0,
    coverage,
    suite: [],
  };
}
