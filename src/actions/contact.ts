"use server";

import nodemailer from "nodemailer";
import {
  renderContactEmailHtml,
  validateContactPayload,
} from "../../utils/contact";

interface ActionState {
  success: boolean;
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    message?: string[];
    recaptcha?: string[];
  };
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not configured");
    return false;
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secretKey}&response=${token}`,
      },
    );

    const data = await response.json();
    const isValid = data.success && data.score >= 0.5;
    return isValid;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}

export async function submitContactForm(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const validation = validateContactPayload({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
    recaptchaToken: formData.get("recaptchaToken"),
  });

  const errors: ActionState["errors"] = {};
  for (const [field, messages] of Object.entries(validation.errors)) {
    errors[field === "recaptchaToken" ? "recaptcha" : field as keyof NonNullable<ActionState["errors"]>] = messages;
  }

  if (!validation.data) {
    return { success: false, message: "Validation failed", errors };
  }
  const { name, email, message, recaptchaToken } = validation.data;

  const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
  if (!isRecaptchaValid) {
    errors.recaptcha = ["reCAPTCHA verification failed"];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, message: "Validation failed", errors };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: process.env.SMTP_USER,
      subject: `Portfolio Landing Form Submission from ${name}`,
      text: message,
      html: renderContactEmailHtml(validation.data),
    });

    return { success: true, message: "Message sent successfully!" };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      message: "Failed to send email. Please try again later.",
    };
  }
}
