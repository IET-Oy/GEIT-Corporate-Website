export type FounderProfile = {
  id: string;
  fullName: string;
  /** Set only when officially approved. */
  officialTitle: string | null;
  /** Approved facts only; no inferred qualifications or experience. */
  biography: string;
  /** Public path or URL of an approved portrait. */
  portraitSrc: string | null;
  email: string | null;
  telephone: string | null;
};

export const founders: FounderProfile[] = [
  {
    id: "hyacinthe-nshuti",
    fullName: "Dr. Hyacinthe M. Nshuti",
    officialTitle: "Founder/CEO",
    biography: "Dr. Hyacinthe M. Nshuti founded GEIT Ltd in 2026 and serves as Founder/CEO.",
    portraitSrc: `${import.meta.env.BASE_URL}images/founders/hyacinthe-nshuti.webp`,
    email: "dntechnologies.info@gmail.com",
    telephone: null,
  },
  {
    id: "noel-dushimiyimana",
    fullName: "Mr. Noel Dushimiyimana",
    officialTitle: "Co-founder/General manager",
    biography: "Mr. Noel Dushimiyimana co-founded GEIT Ltd in 2026 and serves as Co-founder/General manager.",
    portraitSrc: `${import.meta.env.BASE_URL}images/founders/noel-dushimiyimana.webp`,
    email: "dntechnologies.info@gmail.com",
    telephone: null,
  },
];
