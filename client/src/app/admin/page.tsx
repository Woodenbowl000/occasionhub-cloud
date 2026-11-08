"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/app/(auth)/authProvider";
import api from "@/lib/api";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import gsap from "gsap";

interface DashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalBookings: number;
  activeVenues: number;
  totalUsers: number;
  pendingApplications: number;
  revenueGrowth: number;
  bookingsGrowth: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  bookings: number;
}

interface VenueRevenue {
  venueName: string;
  revenue: number;
  bookings: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [venueRevenue, setVenueRevenue] = useState<VenueRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardData(true); // Initial load with loading screen
    // Set up real-time polling for dashboard updates (silent refresh)
    const interval = setInterval(() => fetchDashboardData(false), 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, [loading]);

  const fetchDashboardData = async (isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load, not on refresh
      if (isInitialLoad) setLoading(true);

      // Fetch all dashboard data
      const [statsRes, revenueRes, venueRevenueRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/revenue/monthly"),
        api.get("/admin/revenue/by-venue"),
      ]);
      setStats(statsRes.data);
      setRevenueData(revenueRes.data);
      setVenueRevenue(venueRevenueRes.data);
      setLastUpdated(new Date());
      setVenueRevenue(venueRevenueRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      const response = await api.get(`/admin/search`, {
        params: {
          query: searchTerm,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const exportToCSV = () => {
    if (!stats || !revenueData.length) return;

    const csvData = [
      ["Admin Dashboard Report"],
      ["Generated:", new Date().toLocaleString()],
      [""],
      ["Summary"],
      ["Metric", "Value"],
      ["Total Admin Earnings (15%)", `Rs ${stats.totalRevenue}`],
      ["Monthly Earnings", `Rs ${stats.monthlyRevenue}`],
      ["Total Bookings", stats.totalBookings],
      ["Active Venues", stats.activeVenues],
      ["Total Users", stats.totalUsers],
      [""],
      ["Monthly Revenue Breakdown"],
      ["Month", "Revenue", "Bookings"],
      ...revenueData.map((r) => [r.month, r.revenue, r.bookings]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen" ref={containerRef}>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || "Admin"}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Revenue & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by venue, user, or booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Admin Earnings (15%)
                </p>
                <p className="text-3xl font-bold text-foreground">
                  Rs {stats?.totalRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  +{stats?.revenueGrowth}% from last month
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Monthly Earnings (15%)
                </p>
                <p className="text-3xl font-bold text-foreground">
                  Rs {stats?.monthlyRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-blue-600 mt-1">Current month</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats?.totalBookings}
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  +{stats?.bookingsGrowth}% growth
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Venues</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats?.activeVenues}
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  {stats?.pendingApplications} pending
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <Building2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/applications"
              className="flex flex-col items-center p-4 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full mb-2">
                <svg
                  className="w-6 h-6 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-foreground">
                Review Apps
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {stats?.pendingApplications} pending
              </span>
            </Link>

            <Link
              href="/admin/users"
              className="flex flex-col items-center p-4 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-2">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Manage Users
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {stats?.totalUsers} total
              </span>
            </Link>

            <Link
              href="/admin/vendors"
              className="flex flex-col items-center p-4 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full mb-2">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Vendors
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                View all
              </span>
            </Link>

            <Link
              href="/admin/venues"
              className="flex flex-col items-center p-4 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full mb-2">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-foreground">
                All Venues
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {stats?.activeVenues} active
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Earnings (15% Commission) & Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (Rs)" />
                <Bar dataKey="bookings" fill="#8b5cf6" name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Earnings Trend (15%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Revenue (Rs)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Venues */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top Performing Venues (Admin's 15% Earnings)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Venue
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Admin Earnings (15%)
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Bookings
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Avg. per Booking
                  </th>
                </tr>
              </thead>
              <tbody>
                {venueRevenue.map((venue, index) => (
                  <tr
                    key={index}
                    className="border-b border-border hover:bg-accent"
                  >
                    <td className="py-3 px-4 text-foreground">
                      {venue.venueName}
                    </td>
                    <td className="py-3 px-4 text-foreground font-semibold">
                      Rs {venue.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {venue.bookings}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      Rs{" "}
                      {Math.round(
                        venue.revenue / venue.bookings
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* System Health & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Platform Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">
                Average Booking Value
              </span>
              <span className="font-semibold text-foreground">
                Rs{" "}
                {stats?.totalRevenue && stats?.totalBookings
                  ? Math.round(
                      stats.totalRevenue / stats.totalBookings / 0.15
                    ).toLocaleString()
                  : "0"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">
                Venues per Vendor
              </span>
              <span className="font-semibold text-foreground">
                {stats?.activeVenues && stats?.totalUsers
                  ? (
                      stats.activeVenues /
                      Math.max(1, Math.floor(stats.totalUsers * 0.2))
                    ).toFixed(1)
                  : "0"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">
                Admin Commission Rate
              </span>
              <span className="font-semibold text-green-600">15%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Platform Status
              </span>
              <span className="flex items-center gap-2 font-semibold text-green-600">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Online
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/applications"
              className="flex items-center justify-between p-3 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded">
                  <svg
                    className="w-4 h-4 text-orange-600 dark:text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Vendor Applications
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.pendingApplications} pending review
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>

            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    System Updates
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All systems operational
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
