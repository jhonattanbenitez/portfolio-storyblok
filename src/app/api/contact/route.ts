import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import {
  renderContactEmailHtml,
  validateContactPayload,
} from "../../../../utils/contact";

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
      }
    );

    const data = await response.json();

    // Score threshold: 0.0 (bot) to 1.0 (human)
    // Use 0.5 or higher to filter most bots
    const isValid = data.success && data.score >= 0.5;

    console.log(`reCAPTCHA score: ${data.score}, valid: ${isValid}`);
    return isValid;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const { data, errors } = validateContactPayload(body);
  if (!data) {
    return NextResponse.json({ error: "Invalid contact form", errors }, { status: 400 });
  }
  const { name, email, message, recaptchaToken } = data;

  // Verify reCAPTCHA token
  const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
  if (!isRecaptchaValid) {
    return NextResponse.json(
      { error: "reCAPTCHA verification failed" },
      { status: 400 }
    );
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
      subject: `Portfolio Form Submission from ${name}`,
      text: message,
      html: renderContactEmailHtml(data),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      { error: "Email could not be sent" },
      { status: 500 }
    );
  }
}
