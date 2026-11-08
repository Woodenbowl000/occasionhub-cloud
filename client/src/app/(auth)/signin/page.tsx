"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../authProvider";
import AuthShell, { FormError, FormNotice } from "@/components/AuthShell";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const { signin, googleSignin } = useAuth();

  // /reset-password sends people here with ?reset=1 once it succeeds
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      setNotice("Your password has been reset. Sign in with your new password.");
    }
  }, []);

  const handleGoogle = async (credential: string) => {
    setError("");
    setLoading(true);
    try {
      await googleSignin(credential);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signin(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      title={["Good to see", <span key="b" className="italic">you again.</span>]}
      subtitle="sign in to your account"
      image="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=80&auto=format&fit=crop"
      quote="The right room|changes the|whole night."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {notice && !error && <FormNotice>{notice}</FormNotice>}
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
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="link-underline text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading} className="btn-accent h-14 w-full text-lg">
          {loading ? "Signing in..." : "Sign in"}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </button>

        <GoogleSignInButton text="signin_with" onCredential={handleGoogle} />

        <p className="pt-1 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="link-underline font-semibold text-foreground">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
