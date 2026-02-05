"use server";

import nodemailer from "nodemailer";

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
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const message = formData.get("message") as string;
  const recaptchaToken = formData.get("recaptchaToken") as string;

  const errors: ActionState["errors"] = {};

  // Validation
  if (!recaptchaToken) {
    errors.recaptcha = ["reCAPTCHA token missing"];
  } else {
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      errors.recaptcha = ["reCAPTCHA verification failed"];
    }
  }

  if (!name) errors.name = ["Name is required"];
  else if (name.length > 100) errors.name = ["Name exceeds 100 characters"];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) errors.email = ["Email is required"];
  else if (!emailRegex.test(email)) errors.email = ["Invalid email format"];

  if (!message) errors.message = ["Message is required"];
  else if (message.length > 5000)
    errors.message = ["Message exceeds 5000 characters"];

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
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong> ${message}</p>`,
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
