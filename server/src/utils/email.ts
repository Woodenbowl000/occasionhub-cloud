/**
 * Transactional email via Resend's HTTP API (https://resend.com).
 * Without RESEND_API_KEY the message is logged instead, so password reset
 * still works locally: copy the link from the server console.
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY not set. To: ${to}\n${subject}\n${text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "OccasionHub <onboarding@resend.dev>",
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend error ${response.status}: ${await response.text()}`);
  }
};

/** First CLIENT_URL origin; links in emails point here. */
export const clientUrl = (): string =>
  (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");
