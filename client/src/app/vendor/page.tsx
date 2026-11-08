"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../(auth)/authProvider";
import Link from "next/link";
import {
  DollarSign,
  Building2,
  Calendar,
  TrendingUp,
  Eye,
  Edit,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { API_URL } from "@/lib/api";

interface VendorStats {
  totalVenues: number;
  totalBookings: number;
  totalRevenue: number;
  totalViews: number;
  pendingBookings: number;
  confirmedBookings: number;
  recentBookings: any[];
  chartData: Array<{ date: string; bookings: number; revenue: number }>;
  viewsChartData: Array<{ date: string; views: number }>;
  venues: Array<{ id: number; name: string }>;
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<string>("all");

  useEffect(() => {
    fetchStats(true);
    const interval = setInterval(() => fetchStats(false), 30000);
    return () => clearInterval(interval);
  }, [selectedVenue]);

  const fetchStats = async (isInitialLoad: boolean) => {
    try {
      if (isInitialLoad) setLoading(true);
      const token = localStorage.getItem("token");
      const url =
        selectedVenue === "all"
          ? `${API_URL}/vendor/stats`
          : `${API_URL}/vendor/stats?venueId=${selectedVenue}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Stats API error:", response.status, errorText);
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      console.log("Vendor stats data:", data);
      console.log("Chart data:", data.chartData);
      setStats(data);
      setError("");
    } catch (err: any) {
      console.error("Fetch stats error:", err);
      setError(err.message);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-background min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Vendor Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}! Manage your venues and bookings.
          </p>
        </div>

        {/* Venue Selector */}
        {stats && stats.venues && stats.venues.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="venue-select"
              className="text-sm font-medium text-foreground"
            >
              Filter by Venue:
            </label>
            <select
              id="venue-select"
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Venues</option>
              {stats.venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Venues</p>
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {stats?.totalVenues || 0}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Views</p>
            <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.totalViews || 0}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Bookings</p>
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {stats?.totalBookings || 0}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            Rs {stats?.totalRevenue?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Pending Bookings</p>
            <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {stats?.pendingBookings || 0}
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bookings Trend */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Bookings Trend (Last 30 Days)
          </h3>
          {stats?.chartData && stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Bookings"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">
                {stats?.totalVenues === 0
                  ? "Add a venue to start receiving bookings"
                  : "No bookings yet. Booking trends will appear here."}
              </p>
            </div>
          )}
        </div>

        {/* Revenue Trend */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Revenue Trend (Last 30 Days)
          </h3>
          {stats?.chartData && stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value) => `Rs ${value.toLocaleString()}`}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill="hsl(142.1 76.2% 36.3%)"
                  name="Revenue (Rs)"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">
                {stats?.totalVenues === 0
                  ? "Add a venue to start earning revenue"
                  : "No revenue data yet. Revenue trends will appear here."}
              </p>
            </div>
          )}
        </div>

        {/* Views Trend */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Venue Views Trend (Last 30 Days)
          </h3>
          {stats?.viewsChartData && stats.viewsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.viewsChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(217.2 91.2% 59.8%)"
                  strokeWidth={2}
                  name="Daily Views"
                  dot={{ fill: "hsl(217.2 91.2% 59.8%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-center">
              <Eye className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">
                {stats?.totalVenues === 0
                  ? "Add a venue to start tracking views"
                  : "No view data yet. View trends will appear here."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          href="/vendor/venues"
          className="bg-card border border-border rounded-lg p-6 shadow-sm hover:bg-accent transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">My Venues</h3>
            <Building2 className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-muted-foreground">
            Manage your venues, add new venues, and update venue information.
          </p>
        </Link>

        <Link
          href="/vendor/bookings"
          className="bg-card border border-border rounded-lg p-6 shadow-sm hover:bg-accent transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">
              Manage Bookings
            </h3>
            <Calendar className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-muted-foreground">
            View and manage bookings for your venues, approve or decline
            requests.
          </p>
        </Link>
      </div>

      {/* Recent Bookings */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Recent Bookings
          </h2>
        </div>
        <div className="p-6">
          {stats?.recentBookings && stats.recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-accent">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {stats.recentBookings.map((booking: any) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-accent transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {booking.user.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {booking.venue.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {new Date(booking.startDateTime).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.status === "Confirmed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : booking.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-foreground font-medium mb-1">
                No recent bookings
              </p>
              <p className="text-muted-foreground text-sm">
                Bookings for your venues will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
