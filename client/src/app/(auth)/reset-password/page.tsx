"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import api from "@/lib/api";
import AuthShell, { FormError } from "@/components/AuthShell";

export default function ResetPasswordPage() {
  const router = useRouter();
  // null until read from the URL on mount, "" when the link has no token
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      router.push("/signin?reset=1");
    } catch (err: any) {
      setError(err.response?.data?.message || "Couldn't reset your password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Reset password"
      title={["Pick a new", <span key="b" className="italic">password.</span>]}
      subtitle="make it a good one"
      image="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=80&auto=format&fit=crop"
      quote="Fresh start,|same great|venues."
    >
      {token === "" ? (
        <div className="space-y-5">
          <FormError>This reset link is incomplete. Request a new one.</FormError>
          <Link href="/forgot-password" className="btn-accent h-14 w-full text-lg">
            Request a new link
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <FormError>{error}</FormError>}
          <div>
            <label htmlFor="password" className="field-label">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="field"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="field-label">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="field"
              placeholder="Type it again"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || token === null}
            className="btn-accent h-14 w-full text-lg"
          >
            {loading ? "Saving..." : "Reset password"}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </button>

          <p className="pt-1 text-center text-sm text-muted-foreground">
            Link expired?{" "}
            <Link href="/forgot-password" className="link-underline font-semibold text-foreground">
              Send a new one
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
