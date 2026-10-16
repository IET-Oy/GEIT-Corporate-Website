import { z } from "zod";

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

export const contactFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Full name must be 120 characters or fewer."),
  organization: z
    .string()
    .trim()
    .min(2, "Enter your organization.")
    .max(160, "Organization must be 160 characters or fewer."),
  businessEmail: z
    .string()
    .trim()
    .min(1, "Enter your business email.")
    .email("Enter a valid business email address.")
    .max(254, "Business email must be 254 characters or fewer."),
  telephone: z
    .string()
    .trim()
    .max(40, "Telephone must be 40 characters or fewer."),
  country: z
    .string()
    .trim()
    .min(2, "Enter your country.")
    .max(80, "Country must be 80 characters or fewer."),
  serviceOfInterest: z
    .string()
    .min(1, "Select a service of interest.")
    .refine((value) => allowedServices.has(value), "Select a listed service."),
  projectDescription: z
    .string()
    .trim()
    .min(20, "Add at least 20 characters about the project or question.")
    .max(5000, "Project description must be 5,000 characters or fewer."),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: "Please confirm the privacy notice before continuing." }),
  }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

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

export const UNCONFIGURED_SUBMISSION_MESSAGE =
  "The form passed validation, but the enquiry submission service is not configured yet. Your details were not sent or stored, and the form has been cleared.";

export function getUnconfiguredSubmissionResult() {
  return {
    status: "not-configured" as const,
    message: UNCONFIGURED_SUBMISSION_MESSAGE,
  };
}
