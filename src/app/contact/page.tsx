"use client";

import { useState } from "react";
import { useTranslation } from "../../../hooks/useTranslation";

const ContactForm = () => {
  const { t, language } = useTranslation(); 
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<null | "sending" | "success" | "error">(
    null
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    // opcional: enviar el idioma actual al API
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-languageuage": language },
      body: JSON.stringify({ ...formData, language }),
    });

    if (res.ok) {
      setStatus("success");
      setFormData({ name: "", email: "", message: "" });
    } else {
      setStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("contact.title")}</h2>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="sr-only">{t("contact.name")}</span>
          <input
            type="text"
            name="name"
            value={formData.name}
            placeholder={t("contact.name")}
            onChange={handleChange}
            required
            aria-required="true"
            className="border p-2 w-full"
          />
        </label>

        <label className="block">
          <span className="sr-only">{t("contact.email")}</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            placeholder={t("contact.email")}
            onChange={handleChange}
            required
            aria-required="true"
            className="border p-2 w-full"
          />
        </label>

        <label className="block">
          <span className="sr-only">{t("contact.message")}</span>
          <textarea
            name="message"
            value={formData.message}
            placeholder={t("contact.message")}
            onChange={handleChange}
            required
            aria-required="true"
            rows={5}
            className="border p-2 w-full"
          />
        </label>

        <button type="submit" className="bg-blue-600 text-white p-2 rounded">
          {status === "sending" ? t("contact.sending") : t("contact.send")}
        </button>

        {status &&
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

      {/* Social Links si quieres añadirlos aquí */}
    </div>
  );
};

export default ContactForm;
