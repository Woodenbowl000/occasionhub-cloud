"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../authProvider";
import AuthShell, { FormError } from "@/components/AuthShell";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, googleSignin } = useAuth();

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
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(email, password, name, phone || undefined);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Sign up"
      title={["Let's plan", <span key="b" className="italic">something good.</span>]}
      subtitle="create your account"
      image="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=80&auto=format&fit=crop"
      quote="Every great|party starts|with a yes."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <FormError>{error}</FormError>}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="field-label">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="field"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="phone" className="field-label">
              Phone (Optional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className="field"
              placeholder="+92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
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
          <div className="sm:col-span-2">
            <label htmlFor="password" className="field-label">
              Password
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
        </div>

        <button type="submit" disabled={loading} className="btn-accent h-14 w-full text-lg">
          {loading ? "Creating account..." : "Sign up"}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </button>

        <GoogleSignInButton text="signup_with" onCredential={handleGoogle} />

        <p className="pt-1 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="link-underline font-semibold text-foreground">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
