"use client";

import { useState, useEffect } from "react";
import CookieConsent from "react-cookie-consent";
import { useTranslation } from "../hooks/useTranslation";

export default function CookieBanner() {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);


  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (consent !== null) {
      setHasConsent(consent === "true");
    }
  }, []);

  return (
    <CookieConsent
      location="bottom"
      buttonText={t("cookieBanner.accept")}
      declineButtonText={t("cookieBanner.decline")}
      enableDeclineButton
      onAccept={() => {
        localStorage.setItem("cookieConsent", "true");
        setHasConsent(true);
      }}
      onDecline={() => {
        localStorage.setItem("cookieConsent", "false");
        setHasConsent(false);
      }}
      style={{ 
        background: "hsl(var(--background))", 
        color: "hsl(var(--foreground))",
        borderTop: "1px solid hsl(var(--border))"
      }}
      buttonStyle={{
        background: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        fontSize: "14px",
        border: "none",
        borderRadius: "6px",
        padding: "8px 16px",
      }}
      declineButtonStyle={{
        background: "hsl(var(--secondary))",
        color: "hsl(var(--secondary-foreground))",
        fontSize: "14px",
        border: "1px solid hsl(var(--border))",
        borderRadius: "6px",
        padding: "8px 16px",
      }}
    >
      {t("cookieBanner.description")}
    </CookieConsent>
  );
}
