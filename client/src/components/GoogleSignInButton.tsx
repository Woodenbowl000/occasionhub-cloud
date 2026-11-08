"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleSignInButtonProps {
  /** Receives the Google ID token to send to POST /auth/google */
  onCredential: (credential: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}

/**
 * "Continue with Google" via Google Identity Services, with an "or" divider
 * above it. Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset.
 */
export default function GoogleSignInButton({
  onCredential,
  text = "continue_with",
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // GIS keeps the callback from initialize(); route it to the latest prop
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID || !scriptReady || !buttonRef.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response: { credential: string }) =>
        onCredentialRef.current(response.credential),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text,
      // GIS takes a pixel width, max 400
      width: Math.min(400, buttonRef.current.offsetWidth),
    });
  }, [scriptReady, text]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.12em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <div ref={buttonRef} className="flex min-h-[44px] w-full justify-center" />
    </>
  );
}
