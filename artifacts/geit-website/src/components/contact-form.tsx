import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  contactFormDefaultValues,
  contactFormSchema,
  contactServiceOptions,
  getUnconfiguredSubmissionResult,
  type ContactFormValues,
} from "@/lib/contact-form-schema";

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-[#168568]"> *</span>
      <span className="sr-only"> required</span>
    </>
  );
}

export default function ContactForm() {
  const [submissionResult, setSubmissionResult] = useState<ReturnType<
    typeof getUnconfiguredSubmissionResult
  > | null>(null);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contactFormDefaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = () => {
    // Intentionally do not send, store, or log form values.
    form.reset();
    setSubmissionResult(getUnconfiguredSubmissionResult());
  };

  return (
    <div
      className="bg-white p-6 shadow-[0_24px_65px_-45px_rgba(16,36,58,.55)] sm:p-9"
      data-testid="form-contact"
    >
      <div className="mb-7">
        <p className="text-xs font-bold tracking-[.16em] text-[#168568]">LET'S TALK</p>
        <h3 className="mt-2 text-2xl font-bold text-[#10243a]">
          Tell us what you’re working through.
        </h3>
      </div>

      <div
        className="mb-6 border border-[#e8c98a] bg-[#fff9e9] p-4 text-sm leading-6 text-[#554820]"
        role="note"
        data-testid="status-submission-not-configured"
      >
        <strong className="block">Enquiry submission is not configured.</strong>
        <span>
          This form only checks fields on this page. Details entered here are not sent to GEIT or
          stored by this site. Please do not enter confidential or sensitive information.
        </span>
      </div>

      {submissionResult && (
        <div
          className="mb-6 border border-[#e8c4b2] bg-[#fff7f2] p-4 text-sm leading-6 text-[#873e25]"
          role="status"
          aria-live="polite"
          data-testid="status-enquiry-not-sent"
        >
          {submissionResult.message}
        </div>
      )}

      {form.formState.isSubmitted && !form.formState.isValid && (
        <div
          className="mb-6 border border-[#e8c4b2] bg-[#fff7f2] p-4 text-sm leading-6 text-[#873e25]"
          role="alert"
          data-testid="status-form-validation-error"
        >
          Please correct the highlighted fields. No information has been sent or stored.
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
          autoComplete="off"
          data-testid="consultation-form"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-[#35495b]">
                    Full name <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      type="text"
                      required
                      autoComplete="off"
                      maxLength={120}
                      className="form-input"
                      data-testid="input-full-name"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-[#82909a]">
                    Enter your first and last name.
                  </FormDescription>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-[#35495b]">
                    Organization <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      type="text"
                      required
                      autoComplete="off"
                      maxLength={160}
                      className="form-input"
                      data-testid="input-organization"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-[#82909a]">
                    Company, institution, or other organization.
                  </FormDescription>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-[#35495b]">
                    Business email <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      type="email"
                      required
                      autoComplete="off"
                      maxLength={254}
                      placeholder="name@organisation.com"
                      className="form-input"
                      data-testid="input-business-email"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-[#82909a]">
                    Enter a valid email address.
                  </FormDescription>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-[#35495b]">
                    Telephone <span className="font-normal text-[#87939c">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      type="tel"
                      autoComplete="off"
                      maxLength={40}
                      placeholder="+250 …"
                      className="form-input"
                      data-testid="input-telephone"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-[#82909a]">
                    Include a country code if useful.
                  </FormDescription>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-[#35495b]">
                    Country <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      type="text"
                      required
                      autoComplete="off"
                      maxLength={80}
                      className="form-input"
                      data-testid="input-country"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-[#82909a]">
                    Country where you are based or the project is located.
                  </FormDescription>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceOfInterest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-[#35495b]">
                    Service of interest <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      required
                      autoComplete="off"
                      className="form-input"
                      data-testid="select-service-interest"
                    >
                      <option value="">Choose a service</option>
                      {contactServiceOptions.map((service) => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription className="text-xs text-[#82909a]">
                    Select the closest fit, or choose Other.
                  </FormDescription>
                  <FormMessage role="alert" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="projectDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-[#35495b]">
                  Project description <RequiredMark />
                </FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    rows={5}
                    required
                    minLength={20}
                    maxLength={5000}
                    autoComplete="off"
                    placeholder="What decision, opportunity, or energy challenge would you like to discuss?"
                    className="form-input resize-y"
                    data-testid="input-project-description"
                  />
                </FormControl>
                <FormDescription className="text-xs text-[#82909a]">
                  At least 20 characters. Please avoid confidential information.
                </FormDescription>
                <FormMessage role="alert" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="privacyConsent"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      required
                      aria-required="true"
                      className="mt-1 h-4 w-4 accent-[#168568]"
                      data-testid="checkbox-privacy-consent"
                    />
                  </FormControl>
                  <FormLabel className="text-xs leading-5 text-[#526775]">
                    I have read the{" "}
                    <Link href="/privacy-policy" className="font-bold text-[#168568] underline">
                      privacy notice
                    </Link>{" "}
                    and understand that this form is not connected to a submission service. Details
                    entered here will not be sent or stored by this site.
                    <RequiredMark />
                  </FormLabel>
                </div>
                <FormDescription className="sr-only">
                  Required. Confirms you understand the submission service is not configured.
                </FormDescription>
                <FormMessage role="alert" />
              </FormItem>
            )}
          />

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-3 bg-[#168568] px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-[#116d55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]"
            data-testid="button-check-form"
          >
            Check form
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <p className="text-center text-xs leading-5 text-[#81909a]">
            Checking the form does not send or save your details.
          </p>
        </form>
      </Form>
    </div>
  );
}
