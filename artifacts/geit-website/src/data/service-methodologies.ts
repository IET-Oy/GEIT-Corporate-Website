export type ServiceMethodology = {
  summary: string;
  steps: {
    title: string;
    description: string;
  }[];
};

export const serviceMethodologies: Record<string, ServiceMethodology> = {
  "energy-management": {
    summary: "Start from how energy is actually used, then connect evidence to operating priorities and management routines.",
    steps: [
      { title: "Establish the baseline", description: "Review available bills, meter data, operating schedules and relevant site context." },
      { title: "Identify priorities", description: "Compare use patterns and operating conditions to identify areas for further review and action." },
      { title: "Embed improvement", description: "Define practical indicators, responsibilities and review routines suited to the organisation." },
    ],
  },
  "energy-consulting": {
    summary: "Structure the analysis around the decision, the constraints and the evidence that could change the choice.",
    steps: [
      { title: "Frame the decision", description: "Confirm the decision to be made, the available options, stakeholders and timing." },
      { title: "Compare options", description: "Assess technical and commercial considerations, scenarios, assumptions and sensitivities." },
      { title: "Support a choice", description: "Present trade-offs, uncertainties and decision materials for client review." },
    ],
  },
  "energy-project-development": {
    summary: "Move from an initial project idea to a clearer view of feasibility, risks and the next development decision.",
    steps: [
      { title: "Screen the concept", description: "Review the project need, site context, sponsor objectives and known constraints." },
      { title: "Test development questions", description: "Identify technical, commercial, stakeholder and delivery issues that need investigation." },
      { title: "Plan the next stage", description: "Document decision points, information gaps and an indicative development pathway." },
    ],
  },
  "energy-market-research": {
    summary: "Define the market question first, then assemble and assess evidence that is relevant to the decision.",
    steps: [
      { title: "Set the research frame", description: "Agree the geography, segment, value chain and question the research should address." },
      { title: "Review the evidence", description: "Assess available market, policy, customer and competitive information, noting source limitations." },
      { title: "Interpret the findings", description: "Synthesize patterns, assumptions and scenarios into implications for the client's decision." },
    ],
  },
  "energy-technology-solutions": {
    summary: "Evaluate technologies against defined use cases, operating requirements and the systems they must work with.",
    steps: [
      { title: "Define requirements", description: "Clarify the use case, users, operating conditions, functional needs and constraints." },
      { title: "Assess solution fit", description: "Compare relevant options for capability, interoperability, deployment and operating needs." },
      { title: "Plan adoption", description: "Set out integration questions, dependencies and practical implementation considerations." },
    ],
  },
  "renewable-energy-advisory": {
    summary: "Assess renewable options in the context of energy demand, site conditions, grid access and commercial assumptions.",
    steps: [
      { title: "Understand site and demand", description: "Review available load, site, resource and connection information relevant to the opportunity." },
      { title: "Compare configurations", description: "Screen suitable technology and system options against stated objectives and assumptions." },
      { title: "Clarify further work", description: "Document sensitivities, risks and studies needed before a later investment decision." },
    ],
  },
  "energy-efficiency-auditing": {
    summary: "Set a clear audit boundary, examine the available evidence and connect observations to prioritised opportunities.",
    steps: [
      { title: "Agree audit scope", description: "Confirm sites, systems, data sources, audit depth and any site-review arrangements." },
      { title: "Review performance", description: "Assess bills, operating information and agreed observations, documenting evidence and limitations." },
      { title: "Prioritise opportunities", description: "Organise findings for further assessment by potential relevance, practical constraints and information needs." },
    ],
  },
  "battery-energy-storage-flexibility": {
    summary: "Examine storage and flexibility use cases against actual load patterns, system constraints and transparent assumptions.",
    steps: [
      { title: "Understand operating context", description: "Review load profiles, tariffs, grid conditions and relevant technical constraints." },
      { title: "Define use cases", description: "Test possible operating scenarios and the requirements for managing them." },
      { title: "Screen risks and value drivers", description: "Make sensitivities, uncertainties and further feasibility questions visible." },
    ],
  },
  "ev-charging-infrastructure": {
    summary: "Connect fleet or user needs with site capacity, charging demand and a practical infrastructure sequence.",
    steps: [
      { title: "Map mobility requirements", description: "Review fleet or user patterns, candidate sites, dwell times and service expectations." },
      { title: "Assess energy and site needs", description: "Explore demand scenarios, electrical capacity questions and possible charging configurations." },
      { title: "Plan an appropriate sequence", description: "Set out phasing, operational considerations and procurement questions for further review." },
    ],
  },
  "ai-energy-analytics-digital-solutions": {
    summary: "Begin with a recurring energy decision and assess whether data, analytics and workflow changes can support it.",
    steps: [
      { title: "Choose the use case", description: "Identify the decision or routine, intended users and what a useful insight should enable." },
      { title: "Assess data and fit", description: "Review data availability, quality, ownership, integrations and relevant analytics options." },
      { title: "Shape adoption", description: "Define workflow, governance and phased implementation considerations for client review." },
    ],
  },
  "carbon-footprint-services": {
    summary: "Agree the purpose and boundaries, assess activity data and document the methods and limitations transparently.",
    steps: [
      { title: "Set the boundary", description: "Confirm organisational scope, reporting purpose, period and relevant emissions sources." },
      { title: "Review activity data", description: "Collect and assess data quality, documenting gaps, estimates and agreed emissions-factor sources." },
      { title: "Explain the result", description: "Present the approach, assumptions and limitations, then identify practical data improvements and priorities." },
    ],
  },
};
