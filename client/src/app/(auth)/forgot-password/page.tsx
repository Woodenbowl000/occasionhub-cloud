"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import api from "@/lib/api";
import AuthShell, { FormError, FormNotice } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSent(data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Reset password"
      title={["Forgot your", <span key="b" className="italic">password?</span>]}
      subtitle="we'll email you a reset link"
      image="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=80&auto=format&fit=crop"
      quote="Happens to|the best of|us."
    >
      {sent ? (
        <div className="space-y-5">
          <FormNotice>
            {sent} Check your inbox (and spam folder). The link works for 1 hour.
          </FormNotice>
          <Link href="/signin" className="btn-accent h-14 w-full text-lg">
            Back to sign in
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <FormError>{error}</FormError>}
          <div>
            <label htmlFor="email" className="field-label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-accent h-14 w-full text-lg">
            {loading ? "Sending..." : "Send reset link"}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </button>

          <p className="pt-1 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/signin" className="link-underline font-semibold text-foreground">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
