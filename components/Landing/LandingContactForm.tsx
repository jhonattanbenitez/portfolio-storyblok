"use client";

import { useActionState, useEffect, startTransition } from "react";
import { storyblokEditable, SbBlokData } from "@storyblok/react/rsc";
import { submitContactForm } from "../../src/actions/contact";
import clsx from "clsx";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";

interface LandingContactFormProps {
  blok: SbBlokData & {
    title: string;
    description: string;
  };
}

const initialState = {
  success: false,
  message: "",
  errors: {},
};

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

const LandingContactForm = ({ blok }: LandingContactFormProps) => {
  const [state, formAction, isPending] = useActionState(
    submitContactForm,
    initialState,
  );
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!recaptchaSiteKey) {
      console.warn("reCAPTCHA site key is not configured");
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [recaptchaSiteKey]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const currentForm = e.currentTarget;
    const formData = new FormData(currentForm);

    try {
      if (window.grecaptcha && recaptchaSiteKey) {
        const token = await window.grecaptcha.execute(recaptchaSiteKey, {
          action: "submit",
        });
        formData.set("recaptchaToken", token);
      }
    } catch (err) {
      console.error("Recaptcha error", err);
    }

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <section
      {...storyblokEditable(blok)}
      className="relative bg-background py-16 md:py-24"
      id="contact"
    >
      {/* Background blobs */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 md:p-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              {blok.title || "Ready to Automate Your Business?"}
            </h2>
            <p className="text-lg text-muted-foreground">
              {blok.description ||
                "Get in touch to discuss your custom solution."}
            </p>
          </div>

          {state.success ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center animate-in fade-in slide-in-from-bottom-4">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-600 mb-2">
                Message Sent!
              </h3>
              <p className="text-foreground/80">
                Thank you for reaching out. We will get back to you shortly.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 text-sm text-muted-foreground hover:text-foreground underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-foreground"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className={clsx(
                      "w-full rounded-md border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary",
                      state.errors?.name ? "border-destructive" : "border-input",
                    )}
                    placeholder="John Doe"
                  />
                  {state.errors?.name && (
                    <p className="mt-1 flex items-center text-sm text-destructive">
                      <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                      {state.errors.name[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={clsx(
                      "w-full rounded-md border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary",
                      state.errors?.email ? "border-destructive" : "border-input",
                    )}
                    placeholder="john@example.com"
                  />
                  {state.errors?.email && (
                    <p className="mt-1 flex items-center text-sm text-destructive">
                      <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                      {state.errors.email[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="message"
                  className="text-sm font-medium text-foreground"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className={clsx(
                    "w-full rounded-md border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary",
                    state.errors?.message ? "border-destructive" : "border-input",
                  )}
                  placeholder="Tell us about your project..."
                />
                {state.errors?.message && (
                  <p className="mt-1 flex items-center text-sm text-destructive">
                    <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                    {state.errors.message[0]}
                  </p>
                )}
              </div>

              {state.message && !state.success && (
                <div className="flex items-center rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <ExclamationCircleIcon className="w-5 h-5 mr-2" />
                  {state.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className={clsx(
                  "w-full rounded-md py-4 font-bold text-primary-foreground transition-all transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isPending
                    ? "cursor-not-allowed bg-primary/50 opacity-60"
                    : "bg-primary hover:bg-primary/90 shadow-lg shadow-blue-500/25",
                )}
              >
                {isPending ? "Sending..." : "Send Message"}
              </button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                This site is protected by reCAPTCHA and the Google{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="underline hover:text-foreground"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="https://policies.google.com/terms"
                  className="underline hover:text-foreground"
                >
                  Terms of Service
                </a>{" "}
                apply.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default LandingContactForm;
