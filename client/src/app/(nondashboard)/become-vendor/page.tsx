"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(auth)/authProvider";
import { useTheme } from "@/hooks/useTheme";
import api from "@/lib/api";
import { ArrowRight } from "lucide-react";
import { FadeIn, RevealLines } from "@/components/motion/Reveal";

export default function BecomeVendorPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    loading: authLoading,
    refreshUser,
  } = useAuth();
  const { mounted } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    description: "",
    phone: "",
    website: "",
    proofUrl: "",
    yearsOfExperience: "",
  });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/signin");
      } else if (user?.role !== "ADMIN" && user?.isVendor) {
        router.push("/vendor");
      } else if (user?.role === "ADMIN") {
        router.push("/admin/applications");
      } else {
        fetchExistingApplication();
      }
    }
  }, [isAuthenticated, authLoading, user, router]);

  const fetchExistingApplication = async () => {
    try {
      const response = await api.get("/vendor-applications/my-application");
      const appData = response.data;
      setExistingApplication(appData);

      // If application is approved, refresh user to get isVendor flag and redirect
      if (appData?.status === "Approved" && !user?.isVendor) {
        await refreshUser();
        // Force immediate redirect to vendor dashboard
        setTimeout(() => {
          router.push("/vendor");
        }, 500);
      }
    } catch (err: any) {
      // No existing application is fine
    }
  };

  // Poll for application status updates if pending
  useEffect(() => {
    if (existingApplication?.status === "Pending") {
      const interval = setInterval(async () => {
        await fetchExistingApplication();
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [existingApplication?.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Convert yearsOfExperience to number
      const submitData = {
        ...formData,
        yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
      };
      await api.post("/vendor-applications/apply", submitData);
      router.push("/dashboard");
      alert("Application submitted successfully! We'll review it soon.");
    } catch (err: any) {
      console.error("Application submission error:", err);
      setError(err.response?.data?.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-background">

        <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-8">
          <span className="eyebrow">(Vendor) — Application</span>
          <RevealLines
            as="h2"
            immediate
            className="mb-10 mt-5 font-display text-[clamp(3rem,7vw,6rem)] leading-[0.9] tracking-tightest"
            lines={["Your vendor", <span key="b" className="italic text-primary">application</span>]}
          />
          <div className="rounded-[1.75rem] border-[3px] border-forest bg-card shadow-sticker dark:border-lime p-6 sm:p-10">

            <div
              className={`mb-8 rounded-2xl p-5 ${
                existingApplication.status === "Pending"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                  : existingApplication.status === "Approved"
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              <p className="font-semibold mb-2 text-foreground">
                Status:{" "}
                <span
                  className={
                    existingApplication.status === "Pending"
                      ? "text-yellow-700 dark:text-yellow-400"
                      : existingApplication.status === "Approved"
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400"
                  }
                >
                  {existingApplication.status}
                </span>
              </p>
              {existingApplication.status === "Approved" &&
                user?.role !== "VENDOR" && (
                  <p className="text-green-700 dark:text-green-400 text-sm mt-2 animate-pulse">
                    ✓ Updating your account... You'll be redirected to your
                    vendor dashboard shortly.
                  </p>
                )}
              {existingApplication.status === "Pending" && (
                <div className="text-foreground">
                  <p className="mb-2">
                    Your application is under review. We'll notify you once it's
                    processed.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    💡 You'll be notified via your registered email (
                    {user?.email}) once the admin reviews your application.
                  </p>
                </div>
              )}
              {existingApplication.status === "Rejected" && (
                <div>
                  <p className="text-red-700 dark:text-red-400 mb-2">
                    Your application was rejected.
                  </p>
                  {existingApplication.rejectionReason && (
                    <p className="text-foreground">
                      Reason: {existingApplication.rejectionReason}
                    </p>
                  )}
                  <button
                    onClick={() => setExistingApplication(null)}
                    className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Reapply →
                  </button>
                </div>
              )}
            </div>

            <div className="divide-y divide-border [&>div]:py-4">
              <div>
                <p className="eyebrow mb-1">Business Name</p>
                <p className="font-medium text-foreground">
                  {existingApplication.businessName}
                </p>
              </div>
              <div>
                <p className="eyebrow mb-1">Business Type</p>
                <p className="font-medium text-foreground">
                  {existingApplication.businessType}
                </p>
              </div>
              <div>
                <p className="eyebrow mb-1">Description</p>
                <p className="font-medium text-foreground">
                  {existingApplication.description}
                </p>
              </div>
              <div>
                <p className="eyebrow mb-1">
                  Years of Experience
                </p>
                <p className="font-medium text-foreground">
                  {existingApplication.yearsOfExperience} years
                </p>
              </div>
              {existingApplication.proofUrl && (
                <div>
                  <p className="eyebrow mb-1">
                    Proof Document
                  </p>
                  <a
                    href={existingApplication.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    View Document
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="btn-ghost mt-8 w-full"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <span className="eyebrow">(Vendor) — Partner with us</span>
              <RevealLines
                as="h2"
                immediate
                className="mt-5 font-display text-[clamp(3.25rem,7vw,7rem)] leading-[0.88] tracking-tightest text-foreground"
                lines={["Become a", <span key="b" className="italic text-primary">vendor</span>]}
              />
              <FadeIn immediate delay={0.3}>
                <p className="mt-6 max-w-md text-lg text-muted-foreground">
                  Join our platform and start listing your venues to reach thousands
                  of event planners.
                </p>

                <div className="mt-12 border-t border-border pt-6">
                  <h3 className="eyebrow">What happens next?</h3>
                  <ol className="mt-4">
                    {[
                      "Your application will be reviewed by our admin team",
                      "You'll be notified via email once approved",
                      "Once approved, you can start listing your venues",
                      "Review typically takes 1-3 business days",
                    ].map((step, i) => (
                      <li
                        key={step}
                        className="flex items-baseline gap-5 border-b border-border py-4 text-foreground/85"
                      >
                        <span className="font-mono text-xs text-primary">0{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </FadeIn>
            </div>
          </div>

          <FadeIn immediate delay={0.2} className="lg:col-span-7">
            <div className="rounded-[1.75rem] border-[3px] border-forest bg-card shadow-sticker dark:border-lime p-6 sm:p-10">
          {error && (
            <div className="mb-8 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                className="field"
                placeholder="Your company or business name"
              />
            </div>

            <div>
              <label className="field-label">
                Business Type *
              </label>
              <select
                required
                value={formData.businessType}
                onChange={(e) =>
                  setFormData({ ...formData, businessType: e.target.value })
                }
                className="field"
              >
                <option value="">Select a type</option>
                <option value="Conference Center">Conference Center</option>
                <option value="Banquet Hall">Banquet Hall</option>
                <option value="Hotel">Hotel</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Outdoor Venue">Outdoor Venue</option>
                <option value="Art Gallery">Art Gallery</option>
                <option value="Theater">Theater</option>
                <option value="Rooftop Venue">Rooftop Venue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">
                Business Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="field"
                placeholder="Tell us about your business and the venues you offer..."
              />
            </div>

            <div>
              <label className="field-label">
                Business Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="field"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="field-label">
                Website (Optional)
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                className="field"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">
                Proof Document URL *
              </label>
              <input
                type="url"
                required
                value={formData.proofUrl}
                onChange={(e) =>
                  setFormData({ ...formData, proofUrl: e.target.value })
                }
                className="field"
                placeholder="https://drive.google.com/... or https://..."
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Upload your business license, tax registration, or other
                verification documents to Google Drive or similar service and
                paste the public link here.
              </p>
            </div>

            <div>
              <label className="field-label">
                Years of Experience *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.yearsOfExperience}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    yearsOfExperience: e.target.value,
                  })
                }
                className="field"
                placeholder="0"
              />
            </div>

            <div className="flex gap-3 sm:col-span-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="btn-ghost h-14 flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-accent group h-14 flex-1"
              >
                {loading ? "Submitting..." : "Submit Application"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:translate-x-1" />
                )}
              </button>
            </div>
          </form>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
