"use client";

import { useAuth } from "@/app/(auth)/authProvider";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Calendar,
  CheckCircle,
  Heart,
  TrendingUp,
  Search,
  User,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalBookings: number;
  totalSpent: number;
  upcomingBookings: number;
  completedBookings: number;
  favoriteVenues: number;
  monthlySpending: { month: string; amount: number }[];
  recentBookings: any[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalSpent: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    favoriteVenues: 0,
    monthlySpending: [],
    recentBookings: [],
  });
  const [loading, setLoading] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (!loading) {
      const tl = gsap.timeline();

      tl.fromTo(
        headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      )
        .fromTo(
          statsRef.current?.children || [],
          { opacity: 0, y: 30, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: "back.out(1.7)",
          },
          "-=0.3"
        )
        .fromTo(
          chartsRef.current?.children || [],
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: "power3.out",
          },
          "-=0.4"
        );
    }
  }, [loading]);

  const fetchDashboardStats = async () => {
    try {
      const [bookingsRes, favoritesRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/favorites"),
      ]);

      const bookings = bookingsRes.data?.bookings || bookingsRes.data || [];
      const favorites = favoritesRes.data || [];

      // Calculate statistics
      const totalSpent = bookings.reduce(
        (sum: number, b: any) =>
          b.status === "Confirmed" || b.status === "Completed"
            ? sum + b.totalPrice
            : sum,
        0
      );

      const upcomingBookings = bookings.filter(
        (b: any) =>
          b.status === "Confirmed" && new Date(b.startDateTime) > new Date()
      ).length;

      const completedBookings = bookings.filter(
        (b: any) => b.status === "Completed"
      ).length;

      // Calculate monthly spending for the last 6 months
      const monthlySpending = calculateMonthlySpending(bookings);

      // Get recent bookings (last 5)
      const recentBookings = bookings.slice(0, 5);

      setStats({
        totalBookings: bookings.length,
        totalSpent,
        upcomingBookings,
        completedBookings,
        favoriteVenues: favorites.length,
        monthlySpending,
        recentBookings,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlySpending = (bookings: any[]) => {
    const last6Months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("en-US", { month: "short" });

      const spending = bookings
        .filter((b: any) => {
          const bookingDate = new Date(b.createdAt);
          return (
            bookingDate.getMonth() === date.getMonth() &&
            bookingDate.getFullYear() === date.getFullYear() &&
            (b.status === "Confirmed" || b.status === "Completed")
          );
        })
        .reduce((sum: number, b: any) => sum + b.totalPrice, 0);

      last6Months.push({ month: monthName, amount: spending });
    }

    return last6Months;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Section */}
      <div ref={headerRef} className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-muted-foreground">
          Here's your booking activity and spending overview.
        </p>
      </div>

      {/* Overview Stats */}
      <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              Rs {stats.totalSpent.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime spending
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Events
            </CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.upcomingBookings}</div>
            <Link
              href="/dashboard/bookings"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              View bookings →
            </Link>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bookings
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedBookings} completed
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Favorite Venues
            </CardTitle>
            <Heart className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.favoriteVenues}</div>
            <Link
              href="/dashboard/favorites"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              View favorites →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlySpending}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => `Rs ${value.toFixed(2)}`}
                />
                <Bar
                  dataKey="amount"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Bookings</CardTitle>
              <Link
                href="/dashboard/bookings"
                className="text-sm text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">No bookings yet</p>
                <Link
                  href="/venues"
                  className="text-primary hover:underline text-sm"
                >
                  Browse venues →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentBookings.map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex items-start space-x-4 pb-4 border-b last:border-0"
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        booking.status === "Confirmed" &&
                          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        booking.status === "Pending" &&
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                        booking.status !== "Confirmed" &&
                          booking.status !== "Pending" &&
                          "bg-secondary"
                      )}
                    >
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {booking.venue?.name || "Venue"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.startDateTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        Rs {booking.totalPrice.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/venues"
              className="flex items-center p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors"
            >
              <Search className="w-6 h-6 text-primary mr-3" />
              <div>
                <p className="font-medium">Browse Venues</p>
                <p className="text-sm text-muted-foreground">
                  Find your next event space
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/bookings"
              className="flex items-center p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors"
            >
              <Calendar className="w-6 h-6 text-primary mr-3" />
              <div>
                <p className="font-medium">My Bookings</p>
                <p className="text-sm text-muted-foreground">
                  Manage reservations
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex items-center p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors"
            >
              <User className="w-6 h-6 text-primary mr-3" />
              <div>
                <p className="font-medium">Profile Settings</p>
                <p className="text-sm text-muted-foreground">
                  Update your information
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
