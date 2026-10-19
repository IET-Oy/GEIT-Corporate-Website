import { companyContact } from "@/config/company-contact";

/** Public support copy is English only and is not routed through the translation catalogue. */
export type FaqStatus = "available" | "limited" | "planned";
export type FaqLink = { label: string; href: string };
export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  status: FaqStatus;
  statusNote: string;
  keywords: string[];
  links: FaqLink[];
  humanHelp?: boolean;
};

export const STATUS_LABEL: Record<FaqStatus, string> = {
  available: "Available now",
  limited: "Available with limits",
  planned: "Planned, not yet available",
};

const CONTACT: FaqLink = { label: "Contact GEIT", href: "/contact" };
const PLATFORM: FaqLink = { label: "Energy SaaS sign-in", href: "/app" };

export const saasFaq: FaqItem[] = [
  {
    id: "services",
    question: "What services does GEIT Ltd offer?",
    answer:
      "GEIT provides energy management and consulting, project development, market research, technology solutions, renewable energy advisory, efficiency and auditing, battery storage and flexibility consulting, EV charging advisory, digital energy analytics, and carbon footprint services. The service pages explain scope and next steps. Consulting services are distinct from the software features available in the workspace.",
    status: "available",
    statusNote: "Read the service scope or contact GEIT to discuss your needs.",
    keywords: ["services", "consulting", "consultant", "advisory", "research", "development", "ev", "charging", "carbon", "company"],
    links: [{ label: "Explore all GEIT services", href: "/services" }, CONTACT],
  },
  {
    id: "what-is",
    question: "What is GEIT Energy SaaS?",
    answer:
      "GEIT Energy SaaS is a signed-in workspace for energy analysis. Organisations import interval data manually, manage sites and meters, and save analyses, scenarios and reports. It is currently in internal testing, so it is not offered as a production monitoring service.",
    status: "limited",
    statusNote: "Internal testing stage.",
    keywords: ["what", "saas", "platform", "energy saas", "product", "workspace", "about"],
    links: [PLATFORM, { label: "Digital energy solutions", href: "/digital-energy-solutions" }],
  },
  {
    id: "who",
    question: "Who can use the platform?",
    answer:
      "Registered users who belong to an organisation, with roles of owner, administrator, energy manager, consultant, analyst or reader. Permissions differ by role. Verify your email after registration before signing in. Signed-out visitors see the sign-in gate, not customer records.",
    status: "available",
    statusNote: "Role-based access is implemented.",
    keywords: ["who", "users", "roles", "register", "account", "sign in", "login", "organisation", "reader", "analyst"],
    links: [PLATFORM, CONTACT],
  },
  {
    id: "data",
    question: "What energy data can the platform monitor?",
    answer:
      "It analyses interval energy and power readings that you upload from CSV or XLSX templates, after a validation preview and an explicit commit. Files are limited to 5,000 rows and 2 MiB. It does not connect to meters or IoT gateways and does not poll live data, so it does not provide live monitoring.",
    status: "limited",
    statusNote: "Manual import only. No live telemetry.",
    keywords: ["data", "monitor", "monitoring", "import", "csv", "xlsx", "excel", "meter", "live", "iot", "upload", "ingestion", "onboarding"],
    links: [PLATFORM, { label: "Energy management service", href: "/services/energy-management" }],
  },
  {
    id: "solar-battery",
    question: "Does it support solar PV and battery energy storage systems?",
    answer:
      "Yes, at screening level. The platform has baseline solar yield and battery dispatch scenarios with capacity, state-of-charge, power and efficiency constraints. These are documented baseline calculations, not advanced optimisation, and they are not measured battery performance. GEIT also offers consulting on renewables and storage.",
    status: "limited",
    statusNote: "Baseline scenarios only.",
    keywords: ["solar", "pv", "battery", "storage", "bess", "renewable", "scenario", "flexibility"],
    links: [
      { label: "Renewable energy advisory", href: "/services/renewable-energy-advisory" },
      { label: "Battery storage consulting", href: "/services/battery-energy-storage-flexibility" },
    ],
  },
  {
    id: "dashboards",
    question: "What dashboards, analytics, and reports are available?",
    answer:
      "Saved Energy Management analyses show consumption, peak power, coverage, load factor and flat-rate cost, with charts and accessible tables. Imported-data digital twins and sufficient-history baseline forecasts exist. The workspace overview is a module landing page, not a portfolio-wide dashboard. Module exports exist in CSV, XLSX, PDF or JSON depending on module; PDF tables are summaries. A consolidated report hub is planned and is not available.",
    status: "limited",
    statusNote: "Per-analysis views. Consolidated report hub planned.",
    keywords: ["dashboard", "dashboards", "analytics", "report", "reports", "export", "kpi", "chart", "forecast", "twin", "pdf", "reporting", "overview"],
    links: [PLATFORM, { label: "Digital energy solutions", href: "/digital-energy-solutions" }],
  },
  {
    id: "inefficiencies",
    question: "Can users monitor energy performance and identify inefficiencies?",
    answer:
      "Users can review saved analyses for consumption patterns, peaks and load factor, and compare periods. Anomaly screening exists but is not fault diagnosis. Forecasts need at least 35 complete consecutive days and are withheld when history is insufficient. For a site-level efficiency review, GEIT offers auditing as a consulting service.",
    status: "limited",
    statusNote: "Analysis of imported data, not continuous monitoring.",
    keywords: ["efficiency", "inefficiency", "inefficiencies", "performance", "waste", "audit", "anomaly", "savings", "load factor"],
    links: [{ label: "Energy efficiency and auditing", href: "/services/energy-efficiency-auditing" }, CONTACT],
  },
  {
    id: "alerts",
    question: "How do alerts and notifications work?",
    answer:
      "You can save rules for daily kWh or peak-interval kW. Rules are evaluated only when an analysis is saved, and a triggered alert links to that analysis and can be acknowledged. There is no scheduler, continuous evaluation, or email, SMS or push delivery, so a saved rule does not mean active monitoring.",
    status: "limited",
    statusNote: "Checked at save time. No delivery channels.",
    keywords: ["alert", "alerts", "notification", "notifications", "email", "sms", "threshold", "rule"],
    links: [PLATFORM],
  },
  {
    id: "sites",
    question: "Does the platform support multiple buildings or sites?",
    answer:
      "Yes. You can create and edit sites and meters, set site time zones and flat tariffs, and archive or restore them, subject to your role. It is not a general equipment register or maintenance system, and the overview is not a portfolio-wide KPI dashboard.",
    status: "limited",
    statusNote: "Site and meter management only.",
    keywords: ["site", "sites", "building", "buildings", "multiple", "multi-site", "meter", "asset", "portfolio", "tariff"],
    links: [PLATFORM, { label: "Energy management service", href: "/services/energy-management" }],
  },
  {
    id: "security",
    question: "How are customer data and access permissions protected?",
    answer:
      "Customer records sit in tenant tables with Row Level Security, files are in a private bucket, and sessions use HttpOnly cookies. Access follows organisation membership and role. This was checked by a read-only metadata audit; a full cross-tenant behavioural test and independent security review are still outstanding, and GEIT makes no certification claim. Please contact GEIT for security or privacy questions.",
    status: "limited",
    statusNote: "No certifications claimed. Independent review pending.",
    keywords: ["security", "secure", "privacy", "permission", "permissions", "protect", "data protection", "gdpr", "certification", "encryption", "access"],
    links: [CONTACT, { label: "Privacy Policy", href: "/privacy-policy" }],
    humanHelp: true,
  },
  {
    id: "start",
    question: "How can customers get started or request a demonstration?",
    answer:
      "Email or call GEIT using the contact details on the contact page to discuss your needs or request a demonstration. The website consultation form only validates entries: it does not send or store enquiries because submission is not configured. You can register and verify your email to access the workspace, which is currently in internal testing.",
    status: "available",
    statusNote: "Contact route and registration are available.",
    keywords: ["start", "started", "demo", "demonstration", "trial", "pricing", "price", "quote", "consultation", "onboarding", "begin", "cost", "billing"],
    links: [CONTACT, PLATFORM],
    humanHelp: true,
  },
  {
    id: "support",
    question: "How can users obtain technical support?",
    answer:
      "For sign-in problems use the account recovery pages on the platform: forgot password and reset password. For anything else, contact GEIT directly using the details below. This chat only answers from the FAQ and cannot open tickets or access your account.",
    status: "available",
    statusNote: "Human support via the contact route.",
    keywords: ["support", "help", "technical", "problem", "issue", "bug", "password", "reset", "forgot", "recover", "recovery", "account", "human", "agent", "person"],
    links: [
      { label: "Forgot password", href: "/app/forgot-password" },
      { label: "Sign in", href: "/app/sign-in" },
      CONTACT,
    ],
    humanHelp: true,
  },
];

export const suggestedQuestions: string[] = [
  "What is GEIT Energy SaaS?",
  "What energy data can the platform monitor?",
  "How do alerts and notifications work?",
  "How can customers get started or request a demonstration?",
  "How can users obtain technical support?",
];

export function humanContact(): { email: string | null; telephone: string | null; page: string } {
  return { email: companyContact.businessEmail, telephone: companyContact.businessTelephone, page: "/contact" };
}

/** Mutually relevant lookups: every FAQ entry links back to the same data used by the chat. */
export function searchFaq(query: string, items: FaqItem[] = saasFaq): FaqItem[] {
  const terms = tokenize(query);
  if (!terms.length) return items;
  return rank(terms, items).map((r) => r.item);
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}
const STOP = new Set(["the", "and", "does", "can", "how", "what", "who", "for", "are", "with", "you", "your", "this", "that", "have", "from", "platform", "geit"]);

function rank(terms: string[], items: FaqItem[]) {
  return items
    .map((item) => {
      const q = item.question.toLowerCase();
      const a = item.answer.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (item.keywords.some((k) => k === t || k.split(" ").includes(t))) score += 3;
        else if (item.keywords.some((k) => k.includes(t))) score += 2;
        if (q.includes(t)) score += 2;
        if (a.includes(t)) score += 1;
      }
      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score);
}

export type SupportAnswer = {
  kind: "faq" | "human" | "provider";
  text: string;
  status?: FaqStatus;
  links: FaqLink[];
  related?: string[];
};

const HUMAN_RE = /\b(human|person|agent|call me|speak to|talk to|complaint|refund|invoice|contract|legal|urgent|my account|my data|outage)\b/i;

/** Pure FAQ matcher. Never claims to be AI and never invents an answer. */
export function answerFromFaq(question: string, items: FaqItem[] = saasFaq): SupportAnswer {
  const q = question.trim();
  const ranked = rank(tokenize(q), items);
  const exact = items.find((i) => i.question.toLowerCase() === q.toLowerCase());
  const best = exact ?? (ranked[0] && ranked[0].score >= 3 ? ranked[0].item : undefined);
  if (HUMAN_RE.test(q) && !exact) {
    return {
      kind: "human",
      text: "That sounds like a question for a person. This FAQ chat cannot see accounts or contracts. Please use the contact page or the direct details below.",
      links: [CONTACT],
    };
  }
  if (!best) {
    return {
      kind: "human",
      text: "I could not find a matching answer in the Energy SaaS FAQ. Please try one of the suggested questions, or contact GEIT directly.",
      links: [CONTACT, { label: "Energy SaaS FAQ", href: "/#saas-faq" }],
    };
  }
  return {
    kind: best.humanHelp ? "human" : "faq",
    text: best.answer,
    status: best.status,
    links: best.links,
    related: ranked.filter((r) => r.item.id !== best.id).slice(0, 2).map((r) => r.item.question),
  };
}

/** Future integration boundary. Implementations must call a server-side endpoint; no keys in the browser. */
export interface SupportAnswerProvider {
  readonly id: string;
  answer(question: string, context: { faq: FaqItem[]; signal?: AbortSignal }): Promise<SupportAnswer>;
}

/** No public AI provider is configured. Set only when a real, secure provider exists. */
export const configuredProvider: SupportAnswerProvider | null = null;

export async function answerQuestion(
  question: string,
  provider: SupportAnswerProvider | null = configuredProvider,
  signal?: AbortSignal,
): Promise<SupportAnswer> {
  if (provider) {
    try {
      const res = await provider.answer(question, { faq: saasFaq, signal });
      return { ...res, kind: "provider" };
    } catch {
      /* fall through to the FAQ matcher; no success is simulated */
    }
  }
  return answerFromFaq(question);
}

export const SUPPORT_OPEN_EVENT = "geit:support-open";
