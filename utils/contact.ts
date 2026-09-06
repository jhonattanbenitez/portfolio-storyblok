export type ContactPayload = {
  name: string;
  email: string;
  message: string;
  recaptchaToken: string;
};

export type ContactField = keyof ContactPayload;
export type ContactErrors = Partial<Record<ContactField, string[]>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function validateContactPayload(input: unknown): {
  data?: ContactPayload;
  errors: ContactErrors;
} {
  if (!input || typeof input !== "object") {
    return { errors: { name: ["Invalid contact form body"] } };
  }

  const source = input as Record<string, unknown>;
  const errors: ContactErrors = {};
  const readString = (field: ContactField): string => {
    const value = source[field];
    if (typeof value !== "string") {
      errors[field] = [`${field} must be a string`];
      return "";
    }
    return value.trim();
  };

  const data: ContactPayload = {
    name: readString("name"),
    email: readString("email"),
    message: readString("message"),
    recaptchaToken: readString("recaptchaToken"),
  };

  if (!errors.name) {
    if (!data.name) errors.name = ["Name is required"];
    else if (data.name.length > 100) errors.name = ["Name exceeds 100 characters"];
    else if (/[\r\n]/.test(data.name)) errors.name = ["Name contains invalid characters"];
  }
  if (!errors.email) {
    if (!data.email) errors.email = ["Email is required"];
    else if (data.email.length > 254 || !EMAIL_PATTERN.test(data.email)) {
      errors.email = ["Invalid email format"];
    }
  }
  if (!errors.message) {
    if (!data.message) errors.message = ["Message is required"];
    else if (data.message.length > 5000) errors.message = ["Message exceeds 5000 characters"];
  }
  if (!errors.recaptchaToken) {
    if (!data.recaptchaToken) errors.recaptchaToken = ["reCAPTCHA token missing"];
    else if (data.recaptchaToken.length > 4096) {
      errors.recaptchaToken = ["Invalid reCAPTCHA token"];
    }
  }

  return Object.keys(errors).length ? { errors } : { data, errors };
}

export function renderContactEmailHtml({ name, email, message }: ContactPayload): string {
  return `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Message:</strong> ${escapeHtml(message).replace(/\r?\n/g, "<br>")}</p>`;
}

