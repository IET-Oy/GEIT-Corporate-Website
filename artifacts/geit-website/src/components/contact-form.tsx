import { useEffect, useMemo, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import {
  contactFormDefaultValues,
  contactServiceOptions,
  createContactFormSchema,
  getUnconfiguredSubmissionResult,
  type ContactFormValues,
} from "@/lib/contact-form-schema";
import { useLanguage } from "@/lib/language-context";
import { companyContact } from "@/config/company-contact";

type FieldControlProps = {
  id: string;
  required: boolean;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
};

function Field({
  id,
  label,
  required = true,
  description,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: (props: FieldControlProps) => ReactNode;
}) {
  const { t } = useLanguage();
  const describedBy = [
    description ? `${id}-help` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(" ");

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-semibold text-[#35495b]">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-[#168568]"> *</span>
            <span className="sr-only"> {t("required")}</span>
          </>
        )}
      </label>
      {children({
        id,
        required,
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy || undefined,
      })}
      {description && (
        <p id={`${id}-help`} className="text-xs text-[#82909a]">{description}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-[#a53d2b]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ContactForm() {
  const { language, t, c } = useLanguage();
  const schema = useMemo(() => createContactFormSchema(language), [language]);
  const [submissionResult, setSubmissionResult] = useState<ReturnType<
    typeof getUnconfiguredSubmissionResult
  > | null>(null);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: contactFormDefaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const errors = form.formState.errors;
  const hasErrors = Object.keys(errors).length > 0;
  const fieldError = (name: keyof ContactFormValues) => errors[name]?.message;
  const { trigger, formState: { isSubmitted } } = form;
  useEffect(() => {
    // Refresh existing feedback on a language switch without changing entries.
    if (isSubmitted) void trigger();
  }, [language, isSubmitted, trigger]);

  const onSubmit = () => {
    // Intentionally do not send, store, or log form values.
    form.reset();
    setSubmissionResult(getUnconfiguredSubmissionResult(language));
  };

  return (
    <div
      className="bg-white geit-glass geit-readable-glass p-6 shadow-[0_24px_65px_-45px_rgba(16,36,58,.55)] sm:p-9"
      data-testid="form-contact"
    >
      <div className="mb-7">
        <p className="text-xs font-bold tracking-[.16em] text-[#168568]">
          {t("navContact").toLocaleUpperCase(language)}
        </p>
        <h3 className="mt-2 text-2xl font-bold text-[#10243a]">{t("formTitle")}</h3>
      </div>

      <div
        className="mb-6 border border-[#e8c98a] bg-[#fff9e9] p-4 text-sm leading-6 text-[#554820]"
        role="note"
        data-testid="status-submission-not-configured"
      >
        <strong className="block">{t("formUnavailableTitle")}</strong>
        <span>{t("formUnavailableCopy")}</span>
        {companyContact.businessEmail && (
          <p className="mt-2">
            {t("emailGeitDirectly")}{" "}
            <a
              href={`mailto:${companyContact.businessEmail}`}
              className="font-semibold underline underline-offset-2"
            >
              {companyContact.businessEmail}
            </a>
          </p>
        )}
      </div>

      {submissionResult && (
        <div
          className="mb-6 border border-[#e8c4b2] bg-[#fff7f2] p-4 text-sm leading-6 text-[#873e25]"
          role="status"
          aria-live="polite"
          data-testid="status-enquiry-not-sent"
        >
          {t("formNotSent")}
        </div>
      )}

      {form.formState.isSubmitted && hasErrors && (
        <div
          className="mb-6 border border-[#e8c4b2] bg-[#fff7f2] p-4 text-sm leading-6 text-[#873e25]"
          role="alert"
          data-testid="status-form-validation-error"
        >
          {t("formValidationSummary")}
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit, (validationErrors) => {
          const order: (keyof ContactFormValues)[] = [
            "fullName", "organization", "businessEmail", "telephone", "country",
            "serviceOfInterest", "projectDescription", "privacyConsent",
          ];
          const firstInvalid = order.find((name) => validationErrors[name]);
          if (firstInvalid) form.setFocus(firstInvalid);
        })}
        className="space-y-5"
        noValidate
        autoComplete="off"
        data-testid="consultation-form"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="fullName"
            label={t("fullName")}
            description={t("nameHint")}
            error={fieldError("fullName")}
          >
            {(props) => (
              <input
                {...form.register("fullName")}
                {...props}
                type="text"
                autoComplete="off"
                maxLength={120}
                className="form-input"
                data-testid="input-full-name"
              />
            )}
          </Field>

          <Field
            id="organization"
            label={t("organization")}
            description={t("organizationHint")}
            error={fieldError("organization")}
          >
            {(props) => (
              <input
                {...form.register("organization")}
                {...props}
                type="text"
                autoComplete="off"
                maxLength={160}
                className="form-input"
                data-testid="input-organization"
              />
            )}
          </Field>

          <Field
            id="businessEmail"
            label={t("businessEmail")}
            description={t("emailHint")}
            error={fieldError("businessEmail")}
          >
            {(props) => (
              <input
                {...form.register("businessEmail")}
                {...props}
                type="email"
                autoComplete="off"
                maxLength={254}
                placeholder="name@organisation.com"
                className="form-input"
                data-testid="input-business-email"
              />
            )}
          </Field>

          <Field
            id="telephone"
            label={t("telephoneOptional")}
            required={false}
            description={t("telephoneHint")}
            error={fieldError("telephone")}
          >
            {(props) => (
              <input
                {...form.register("telephone")}
                {...props}
                type="tel"
                autoComplete="off"
                maxLength={40}
                placeholder="+250 …"
                className="form-input"
                data-testid="input-telephone"
              />
            )}
          </Field>

          <Field
            id="country"
            label={t("country")}
            description={t("countryHint")}
            error={fieldError("country")}
          >
            {(props) => (
              <input
                {...form.register("country")}
                {...props}
                type="text"
                autoComplete="off"
                maxLength={80}
                className="form-input"
                data-testid="input-country"
              />
            )}
          </Field>

          <Field
            id="serviceOfInterest"
            label={t("serviceOfInterest")}
            description={t("serviceHint")}
            error={fieldError("serviceOfInterest")}
          >
            {(props) => (
              <select
                {...form.register("serviceOfInterest")}
                {...props}
                autoComplete="off"
                className="form-input"
                data-testid="select-service-interest"
              >
                <option value="">{t("chooseService")}</option>
                {contactServiceOptions.map((service) => (
                  <option key={service} value={service}>{c(service)}</option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <Field
          id="projectDescription"
          label={t("projectDescription")}
          description={t("descriptionHint")}
          error={fieldError("projectDescription")}
        >
          {(props) => (
            <textarea
              {...form.register("projectDescription")}
              {...props}
              rows={5}
              minLength={20}
              maxLength={5000}
              autoComplete="off"
              className="form-input resize-y"
              data-testid="input-project-description"
            />
          )}
        </Field>

        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <input
              {...form.register("privacyConsent")}
              id="privacyConsent"
              type="checkbox"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.privacyConsent)}
              aria-describedby={errors.privacyConsent ? "privacyConsent-error" : undefined}
              className="mt-1 h-4 w-4 accent-[#168568]"
              data-testid="checkbox-privacy-consent"
            />
            <label htmlFor="privacyConsent" className="text-xs leading-5 text-[#526775]">
              {t("privacyConsent")}{" "}
              <Link href="/privacy-policy" className="font-bold text-[#168568] underline">
                {t("privacyNotice")}
              </Link>{" "}
              {t("privacyConsentEnd")}
              <span aria-hidden="true" className="text-[#168568]"> *</span>
              <span className="sr-only"> {t("required")}</span>
            </label>
          </div>
          {errors.privacyConsent?.message && (
            <p id="privacyConsent-error" className="text-xs font-medium text-[#a53d2b]" role="alert">
              {errors.privacyConsent.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-3 bg-[#168568] px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-[#116d55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]"
          data-testid="button-check-form"
        >
          {t("checkForm")}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        <p className="text-center text-xs leading-5 text-[#81909a]">{t("checkFormHelp")}</p>
      </form>
    </div>
  );
}
