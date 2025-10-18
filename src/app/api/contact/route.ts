import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

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
  const { name, email, message, recaptchaToken } = await req.json();

  // Verify reCAPTCHA token
  if (!recaptchaToken) {
    return NextResponse.json(
      { error: "reCAPTCHA token missing" },
      { status: 400 }
    );
  }

  const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
  if (!isRecaptchaValid) {
    return NextResponse.json(
      { error: "reCAPTCHA verification failed" },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Validate field lengths
  if (name.length > 100 || message.length > 5000) {
    return NextResponse.json(
      { error: "Input fields exceed maximum length" },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
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
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong> ${message}</p>`,
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
