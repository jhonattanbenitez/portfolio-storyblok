"use client";

import CookieConsent from "react-cookie-consent";
import { useTranslation } from "../hooks/useTranslation";
import { useState, useSyncExternalStore } from "react";
import { readAnalyticsConsent, setAnalyticsConsent, subscribeAnalyticsConsent } from "../utils/analytics-consent";

export default function CookieBanner() {
  const { t } = useTranslation();
  const choice = useSyncExternalStore(subscribeAnalyticsConsent, readAnalyticsConsent, () => "unset");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const choose = (value: "granted" | "denied") => {
    setStorageUnavailable(!setAnalyticsConsent(value));
    setPreferencesOpen(false);
  };
  return (
    <>
      <div className="px-4 py-2 text-center text-sm text-muted-foreground">
        <button type="button" onClick={() => setPreferencesOpen(true)}
          className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t("cookieBanner.preferences")}
        </button>
        {storageUnavailable && <p role="status">{t("cookieBanner.storageUnavailable")}</p>}
      </div>
    <CookieConsent
      visible={choice === "unset" || preferencesOpen ? "show" : "hidden"}
      setDeclineCookie={false}
      cookieName="analytics-banner-choice"
      location="bottom"
      buttonText={t("cookieBanner.accept")}
      declineButtonText={t("cookieBanner.decline")}
      ariaAcceptLabel={t("cookieBanner.accept")}
      ariaDeclineLabel={t("cookieBanner.decline")}
      enableDeclineButton
      onAccept={() => choose("granted")}
      onDecline={() => choose("denied")}
      style={{ 
        background: "var(--background)",
        color: "var(--foreground)",
        borderTop: "1px solid var(--border)"
      }}
      buttonStyle={{
        background: "var(--primary)",
        color: "var(--primary-foreground)",
        fontSize: "14px",
        border: "none",
        borderRadius: "6px",
        padding: "8px 16px",
      }}
      declineButtonStyle={{
        background: "var(--secondary)",
        color: "var(--secondary-foreground)",
        fontSize: "14px",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "8px 16px",
      }}
    >
      {t("cookieBanner.description")}
    </CookieConsent>
    </>
  );
}
