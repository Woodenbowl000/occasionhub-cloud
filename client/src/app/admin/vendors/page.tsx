"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Building2,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Vendor {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
  isActive: boolean;
  _count: {
    venues: number;
  };
  venues: Array<{
    id: number;
    name: string;
    venueType: string;
    pricePerDay: number;
    isActive: boolean;
    _count: {
      bookings: number;
    };
  }>;
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVenuesModal, setShowVenuesModal] = useState(false);

  useEffect(() => {
    fetchVendors(true); // Initial load with loading screen
    // Set up polling for real-time updates (silent refresh)
    const interval = setInterval(() => fetchVendors(false), 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchVendors = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true);
      const response = await api.get("/admin/vendors");
      setVendors(response.data);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const handleDeleteVendor = async (vendorId: number, vendorName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete vendor "${vendorName}"? This will also delete all their venues! This action cannot be undone!`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/vendors/${vendorId}`);
      await fetchVendors(); // Refresh data
      alert("Vendor deleted successfully");
    } catch (error) {
      alert("Failed to delete vendor");
    }
  };

  const handleToggleVenueStatus = async (
    venueId: number,
    currentStatus: boolean
  ) => {
    if (
      !confirm(
        `Are you sure you want to ${
          currentStatus ? "deactivate" : "activate"
        } this venue?`
      )
    ) {
      return;
    }

    try {
      await api.patch(`/admin/venues/${venueId}/toggle-status`);
      await fetchVendors(); // Refresh data
    } catch (error) {
      alert("Failed to update venue status");
    }
  };

  const handleDeleteVenue = async (venueId: number, venueName: string) => {
    if (
      !confirm(
        `Are you sure you want to DELETE "${venueName}"? This action cannot be undone!`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/venues/${venueId}`);
      await fetchVendors(); // Refresh data
      alert("Venue deleted successfully");
    } catch (error) {
      alert("Failed to delete venue");
    }
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVenues = vendors.reduce((sum, v) => sum + v._count.venues, 0);
  const activeVendors = vendors.filter((v) => v.isActive).length;
  const totalBookings = vendors.reduce(
    (sum, v) =>
      sum + v.venues.reduce((vSum, venue) => vSum + venue._count.bookings, 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <h1 className="text-4xl font-bold text-foreground mb-8">
        Vendor Management
      </h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vendors</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {vendors.length}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Vendors</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {activeVendors}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Venues</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {totalVenues}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {totalBookings}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              placeholder="Search vendors by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vendors List */}
      <div className="space-y-6">
        {filteredVendors.map((vendor) => (
          <Card key={vendor.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-xl">
                      {vendor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-xl">{vendor.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {vendor.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                  >
                    Delete Vendor
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVendor(vendor);
                      setShowVenuesModal(true);
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Venues ({vendor._count.venues})
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium text-foreground">
                    {vendor.phone || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Venues</p>
                  <p className="font-medium text-foreground">
                    {vendor._count.venues}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium text-foreground">
                    {new Date(vendor.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Venues Modal */}
      {showVenuesModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {selectedVendor.name}'s Venues
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage all venues for this vendor
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowVenuesModal(false);
                    setSelectedVendor(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {selectedVendor.venues.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No venues yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedVendor.venues.map((venue) => (
                    <div
                      key={venue.id}
                      className="border border-border rounded-lg p-4 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground">
                            {venue.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-muted-foreground">
                              Type:{" "}
                              <span className="text-foreground">
                                {venue.venueType}
                              </span>
                            </span>
                            <span className="text-muted-foreground">
                              Price:{" "}
                              <span className="text-foreground">
                                Rs {venue.pricePerDay}/day
                              </span>
                            </span>
                            <span className="text-muted-foreground">
                              Bookings:{" "}
                              <span className="text-foreground">
                                {venue._count.bookings}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              venue.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {venue.isActive ? "Active" : "Inactive"}
                          </span>
                          <button
                            onClick={() =>
                              (window.location.href = `/venues/${venue.id}`)
                            }
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              handleToggleVenueStatus(venue.id, venue.isActive)
                            }
                            className={`px-3 py-1 rounded-md text-sm ${
                              venue.isActive
                                ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                                : "bg-green-100 text-green-800 hover:bg-green-200"
                            }`}
                          >
                            {venue.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteVenue(venue.id, venue.name)
                            }
                            className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
