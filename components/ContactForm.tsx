"use client";
import { useState } from "react";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import { useTranslation } from "../hooks/useTranslation";

interface SBContactData extends SbBlokData {
  title: string;
}
interface ContactFormProps {
  blok: SBContactData;
}

type Status = "idle" | "sending" | "success" | "error";

const ContactForm: React.FC<ContactFormProps> = ({ blok }) => {
   const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<Status>("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setStatus(res.ok ? "success" : "error");
      if (res.ok) setFormData({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <section
      {...storyblokEditable(blok)}
      className="bg-gray-50 dark:bg-gray-900 py-16"
      id="contact"
    >
      <div className="max-w-2xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white text-center mb-8">
          {blok.title}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <label htmlFor="name" className="sr-only">
            {t("contact.name")}
          </label>
          <input
            id="name"
            type="text"
            name="name"
            autoComplete="name"
            placeholder={t("contact.name")}
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400"
          />

          {/* Email */}
          <label htmlFor="email" className="sr-only">
            {t("contact.email")}
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("contact.email")}
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400"
          />

          {/* Message */}
          <label htmlFor="message" className="sr-only">
            {t("contact.message")}
          </label>
          <textarea
            id="message"
            name="message"
            placeholder={t("contact.message")}
            value={formData.message}
            onChange={handleChange}
            required
            rows={5}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400"
          />

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:opacity-60"
          >
            {status === "sending" ? t("contact.sending") : t("contact.send")}
          </button>

          {/* Announce status (no role expression) */}
          {status !== "idle" &&
            status !== "sending" &&
            (status === "error" ? (
              <p role="alert" className="text-red-600">
                {t("contact.error")}
              </p>
            ) : (
              <p className="text-green-600" aria-live="polite">
                {t("contact.success")}
              </p>
            ))}
        </form>
      </div>
    </section>
  );
};

export default ContactForm;
