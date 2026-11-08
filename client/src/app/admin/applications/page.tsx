"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/(auth)/authProvider";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface VendorApplication {
  id: number;
  businessName: string;
  businessType: string;
  description: string;
  phone: string;
  website?: string;
  proofUrl?: string;
  yearsOfExperience: number;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export default function VendorApplicationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "All" | "Pending" | "Approved" | "Rejected"
  >("Pending");
  const [selectedApp, setSelectedApp] = useState<VendorApplication | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== "ADMIN") {
        router.push("/signin");
      } else {
        fetchApplications(true); // Initial load with loading screen
        // Set up real-time polling (silent refresh)
        const interval = setInterval(() => fetchApplications(false), 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
      }
    }
  }, [isAuthenticated, authLoading, user, router, filter]);

  const fetchApplications = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true);
      const params = filter !== "All" ? { status: filter } : {};
      const response = await api.get("/vendor-applications/all", { params });
      setApplications(response.data);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const handleApprove = async (applicationId: number) => {
    if (!confirm("Are you sure you want to approve this application?")) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await api.post(
        `/vendor-applications/${applicationId}/approve`
      );
      alert(
        response.data.message ||
          "Application approved! User role updated to VENDOR."
      );
      fetchApplications();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to approve application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/vendor-applications/${selectedApp.id}/reject`, {
        reason: rejectReason,
      });
      alert("Application rejected");
      setShowRejectModal(false);
      setRejectReason("");
      setSelectedApp(null);
      fetchApplications();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to reject application");
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Vendor Applications
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and manage vendor applications
        </p>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {(["All", "Pending", "Approved", "Rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === tab
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-input"
              }`}
            >
              {tab}
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-muted">
                {
                  applications.filter((a) => tab === "All" || a.status === tab)
                    .length
                }
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Applications list */}
      {applications.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">No applications found</p>
        </div>
      ) : (
        <div className="bg-card shadow-md rounded-lg overflow-hidden border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Proof
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-muted">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {app.user.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {app.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {app.businessName}
                    </div>
                    <div className="text-sm text-muted-foreground">{app.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {app.businessType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {app.yearsOfExperience} years
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {app.proofUrl ? (
                      <a
                        href={app.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No proof</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        app.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : app.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {app.status === "Pending" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(app.id)}
                          disabled={actionLoading}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setShowRejectModal(true);
                          }}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {app.status === "Rejected" && app.rejectionReason && (
                      <button
                        onClick={() => alert(app.rejectionReason)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        View Reason
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Reject Application</h3>
            <p className="text-muted-foreground mb-4">
              Rejecting application from{" "}
              <strong>{selectedApp.user.name}</strong> for{" "}
              <strong>{selectedApp.businessName}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Provide a reason for rejection..."
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
            />
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                  setSelectedApp(null);
                }}
                className="flex-1 py-2 border border-input text-foreground rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
