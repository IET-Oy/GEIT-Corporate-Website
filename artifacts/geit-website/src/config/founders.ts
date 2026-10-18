export type FounderProfile = {
  id: string;
  fullName: string;
  /** Set only when officially approved. */
  officialTitle: string | null;
  /** Public path or URL of an approved portrait. */
  portraitSrc: string | null;
  email: string | null;
  telephone: string | null;
};

export const founders: FounderProfile[] = [
  {
    id: "hyacinthe-nshuti",
    fullName: "Dr. Hyacinthe M. Nshuti",
    officialTitle: null,
    portraitSrc: null,
    email: null,
    telephone: null,
  },
  {
    id: "noel-dushimiyimana",
    fullName: "Mr. Noel Dushimiyimana",
    officialTitle: null,
    portraitSrc: null,
    email: null,
    telephone: null,
  },
];
