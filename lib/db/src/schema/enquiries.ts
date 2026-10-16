import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const enquiriesTable = pgTable("geit_enquiries", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  organization: varchar("organization", { length: 160 }).notNull(),
  businessEmail: varchar("business_email", { length: 254 }).notNull(),
  telephone: varchar("telephone", { length: 40 }),
  country: varchar("country", { length: 80 }).notNull(),
  serviceOfInterest: varchar("service_of_interest", { length: 120 }).notNull(),
  projectDescription: text("project_description").notNull(),
  preferredContactMethod: varchar("preferred_contact_method", { length: 20 }),
  privacyConsent: boolean("privacy_consent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Enquiry = typeof enquiriesTable.$inferSelect;
