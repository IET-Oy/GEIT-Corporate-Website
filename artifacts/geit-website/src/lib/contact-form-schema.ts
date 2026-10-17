import { z } from "zod";
import { translate, type LanguageCode } from "@/lib/i18n";

export const contactServiceOptions = [
  "Energy Management",
  "Energy Consulting",
  "Energy Project Development",
  "Energy Market Research",
  "Energy Technology Solutions",
  "Renewable Energy Advisory",
  "Energy Efficiency & Energy Auditing",
  "Battery Energy Storage & Energy Flexibility Consulting",
  "EV Charging Infrastructure Advisory",
  "AI-Powered Energy Analytics & Digital Energy Solutions",
  "Carbon Footprint Services",
  "Other",
] as const;

const allowedServices = new Set<string>(contactServiceOptions);

export function createContactFormSchema(language: LanguageCode) {
  const message = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return z.object({
    fullName: z
      .string()
      .trim()
      .min(2, message("nameRequired"))
      .max(120, message("tooLong")),
    organization: z
      .string()
      .trim()
      .min(2, message("organizationRequired"))
      .max(160, message("tooLong")),
    businessEmail: z
      .string()
      .trim()
      .min(1, message("emailRequired"))
      .email(message("emailInvalid"))
      .max(254, message("tooLong")),
    telephone: z
      .string()
      .trim()
      .max(40, message("tooLong")),
    country: z
      .string()
      .trim()
      .min(2, message("countryRequired"))
      .max(80, message("tooLong")),
    serviceOfInterest: z
      .string()
      .min(1, message("serviceRequired"))
      .refine((value) => allowedServices.has(value), message("serviceInvalid")),
    projectDescription: z
      .string()
      .trim()
      .min(20, message("descriptionTooShort"))
      .max(5000, message("tooLong")),
    privacyConsent: z.literal(true, {
      errorMap: () => ({ message: message("privacyRequired") }),
    }),
  });
}

export type ContactFormValues = z.infer<ReturnType<typeof createContactFormSchema>>;

export const contactFormDefaultValues: ContactFormValues = {
  fullName: "",
  organization: "",
  businessEmail: "",
  telephone: "",
  country: "",
  serviceOfInterest: "",
  projectDescription: "",
  privacyConsent: false,
};

export function getUnconfiguredSubmissionResult(language: LanguageCode) {
  return {
    status: "not-configured" as const,
    message: translate(language, "formNotSent"),
  };
}
