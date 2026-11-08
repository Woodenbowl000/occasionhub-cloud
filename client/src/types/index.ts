export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: "USER" | "VENDOR" | "ADMIN";
  isVendor?: boolean;
  /** False for Google-only accounts that never set a password */
  hasPassword?: boolean;
  hasGoogle?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: any;
}

export interface Venue {
  id: number;
  name: string;
  description: string;
  pricePerDay: number;
  capacity: number;
  photoUrls: string[];
  amenities: string[];
  venueType: string;
  isAvailable: boolean;
  rating?: number;
  numberOfReviews?: number;
  postedDate: string;
  location: Location;
  vendor?: {
    id: number;
    name: string;
    email: string;
  };
  admin?: {
    id: number;
    name: string;
    email: string;
  };
  distance?: number;
}

export interface Booking {
  id: number;
  startDateTime: string;
  endDateTime: string;
  totalPrice: number;
  status: "Pending" | "Confirmed" | "Cancelled" | "Completed";
  message?: string;
  createdAt: string;
  venue: Venue;
  user: User;
  negotiatedPrice?: number;
  paymentStatus?: string;
  stripeSessionId?: string;
  paidAmount?: number;
  platformFee?: number;
  vendorPayout?: number;
  paidAt?: string;
}

export interface Favorite {
  id: number;
  createdAt: string;
  venue: Venue;
}

export interface AuthResponse {
  user: User;
  token: string;
}
