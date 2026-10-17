export type SocialProfileKey = "linkedin" | "facebook" | "instagram" | "youtube" | "x";

export type CompanyContactConfig = {
  companyName: string;
  shortName: string;
  country: string;
  officeAddress: string;
  businessEmail: string | null;
  businessTelephone: string | null;
  socialProfiles: Record<SocialProfileKey, string | null>;
};

// Contact values are intentionally null until GEIT provides verified details.
// Components must omit unavailable contact methods and social links from the public site.
export const companyContact: CompanyContactConfig = {
  companyName: "Global Energy Innovation Technologies Ltd",
  shortName: "GEIT Ltd.",
  country: "Rwanda",
  officeAddress: "Kigali, Rwanda",
  businessEmail: null,
  businessTelephone: null,
  socialProfiles: {
    linkedin: null,
    facebook: null,
    instagram: null,
    youtube: null,
    x: null,
  },
};
