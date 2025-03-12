"use client";

import { useState, useEffect } from "react";
import CookieConsent from "react-cookie-consent";

export default function CookieBanner() {
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
      buttonText="Accept"
      declineButtonText="Decline"
      enableDeclineButton
      onAccept={() => {
        localStorage.setItem("cookieConsent", "true");
        setHasConsent(true);
      }}
      onDecline={() => {
        localStorage.setItem("cookieConsent", "false");
        setHasConsent(false);
      }}
      style={{ background: "#222", color: "#fff" }}
      buttonStyle={{
        background: "#0F316D",
        color: "#fff",
        fontSize: "14px",
      }}
      declineButtonStyle={{
        background: "#bbb",
        color: "#222",
        fontSize: "14px",
      }}
    >
      This website uses cookies to enhance user experience.
    </CookieConsent>
  );
}
