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

// Contact values are supplied by GEIT; unknown values remain null.
// Components must omit unavailable contact methods and social links from the public site.
export const companyContact: CompanyContactConfig = {
  companyName: "Global Energy Innovation Technologies Ltd",
  shortName: "GEIT Ltd.",
  country: "Rwanda",
  officeAddress: "Kigali, Rwanda",
  businessEmail: "dntechnologies.info@gmail.com",
  businessTelephone: "+250 78 866567",
  socialProfiles: {
    linkedin: null,
    facebook: null,
    instagram: null,
    youtube: null,
    x: null,
  },
};
