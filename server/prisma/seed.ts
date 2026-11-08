import {
  PrismaClient,
  UserRole,
  VenueType,
  BookingStatus,
  ApplicationStatus,
  User,
  Venue,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Safe to re-run: every record is looked up by a stable key (email, venue
// name, booking message) and only created when missing.

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1400&q=80&auto=format&fit=crop`;

/** Full-day booking window `offset` days from today, local time (matches the booking form). */
const day = (offset: number) => {
  const start = new Date();
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

async function ensureUser(
  email: string,
  password: string,
  data: { name: string; phone: string; role?: UserRole; isVendor?: boolean }
): Promise<User> {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: await bcrypt.hash(password, 10),
      role: UserRole.USER,
      ...data,
    },
  });
}

interface VenueSeed {
  name: string;
  description: string;
  pricePerDay: number;
  capacity: number;
  photoUrls: string[];
  amenities: string[];
  venueType: VenueType;
  rating: number;
  numberOfReviews: number;
  isApproved?: boolean;
  location: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  };
}

async function ensureVenue(vendor: User, seed: VenueSeed): Promise<Venue> {
  const existing = await prisma.venue.findFirst({ where: { name: seed.name } });
  if (existing) return existing;

  const { location, isApproved = true, ...venueInfo } = seed;

  // Location goes in via raw SQL because of the PostGIS Unsupported type
  const [createdLocation] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
    VALUES (
      ${location.address},
      ${location.city},
      ${location.state},
      ${"Pakistan"},
      ${location.postalCode},
      ST_GeogFromText(${`POINT(${location.longitude} ${location.latitude})`})
    )
    RETURNING id
  `;

  const venue = await prisma.venue.create({
    data: {
      ...venueInfo,
      isApproved,
      locationId: createdLocation.id,
      vendorId: vendor.id,
    },
  });
  console.log(`Created venue: ${venue.name}${isApproved ? "" : " (pending approval)"}`);
  return venue;
}

interface BookingSeed {
  venue: Venue;
  customer: User;
  /** Also the booking's identity for re-runs, so keep it unique */
  message: string;
  offset: number;
  status: BookingStatus;
  negotiatedPrice?: number;
  paid?: boolean;
  /** Chat thread; `from` is "customer" or "vendor", `at` is hours ago */
  thread?: { from: "customer" | "vendor"; text: string; at: number; read?: boolean }[];
}

async function ensureBooking(seed: BookingSeed) {
  const { venue, customer, message } = seed;
  const existing = await prisma.booking.findFirst({
    where: { venueId: venue.id, userId: customer.id, message },
  });
  if (existing) return existing;

  const { start, end } = day(seed.offset);
  const amount = seed.negotiatedPrice ?? venue.pricePerDay;
  const booking = await prisma.booking.create({
    data: {
      venueId: venue.id,
      userId: customer.id,
      startDateTime: start,
      endDateTime: end,
      totalPrice: venue.pricePerDay,
      negotiatedPrice: seed.negotiatedPrice,
      status: seed.status,
      message,
      paymentStatus: seed.paid ? "paid" : "unpaid",
      ...(seed.paid && {
        paidAmount: amount,
        platformFee: amount * 0.15, // 15% platform fee
        vendorPayout: amount * 0.85, // 85% to vendor
        paidAt: seed.offset < 0 ? day(seed.offset - 7).start : hoursAgo(30),
      }),
    },
  });

  for (const msg of seed.thread ?? []) {
    await prisma.bookingMessage.create({
      data: {
        bookingId: booking.id,
        senderId: msg.from === "customer" ? customer.id : venue.vendorId,
        message: msg.text,
        createdAt: hoursAgo(msg.at),
        isRead: msg.read ?? true,
      },
    });
  }
  console.log(`Created ${seed.status.toLowerCase()} booking: ${customer.name} @ ${venue.name}`);
  return booking;
}

async function ensureFavorite(user: User, venue: Venue) {
  await prisma.favorite.upsert({
    where: { userId_venueId: { userId: user.id, venueId: venue.id } },
    update: {},
    create: { userId: user.id, venueId: venue.id },
  });
}

/** Spreads `count` views over the last 30 days for the vendor dashboard charts. */
async function ensureViews(venue: Venue, count: number) {
  const seeded = await prisma.venueView.count({
    where: { venueId: venue.id, ipAddress: "seed" },
  });
  if (seeded > 0) return;

  // Deterministic spread so re-seeding a fresh database gives the same charts
  let x = venue.id * 9301 + 49297;
  const next = () => (x = (x * 9301 + 49297) % 233280) / 233280;

  await prisma.venueView.createMany({
    data: Array.from({ length: count }, () => ({
      venueId: venue.id,
      viewedAt: hoursAgo(next() * 30 * 24),
      ipAddress: "seed",
    })),
  });
  await prisma.venue.update({
    where: { id: venue.id },
    data: { views: { increment: count } },
  });
}

async function main() {
  console.log("Starting seed...");

  // ---------------------------------------------------------------- users
  const admin = await ensureUser("admin@occasionhub.com", "admin123", {
    name: "Admin User",
    phone: "+923001234567",
    role: UserRole.ADMIN,
  });

  // Vendors come in two shapes, both of which the app must handle:
  // seeded with role VENDOR, or approved applicants who keep role USER.
  const vendor = await ensureUser("vendor@occasionhub.com", "vendor123", {
    name: "Venue Vendor",
    phone: "+923009876543",
    role: UserRole.VENDOR,
    isVendor: true,
  });
  const sara = await ensureUser("sara.events@occasionhub.com", "password123", {
    name: "Sara Malik",
    phone: "+923214567890",
    isVendor: true,
  });
  const bilal = await ensureUser("bilal.venues@occasionhub.com", "password123", {
    name: "Bilal Ahmed",
    phone: "+923335551234",
    role: UserRole.VENDOR,
    isVendor: true,
  });

  const john = await ensureUser("john@example.com", "user123", {
    name: "John Doe",
    phone: "+923331234567",
  });
  const ayesha = await ensureUser("ayesha@example.com", "password123", {
    name: "Ayesha Khan",
    phone: "+923001112233",
  });
  const hamza = await ensureUser("hamza@example.com", "password123", {
    name: "Hamza Siddiqui",
    phone: "+923452223344",
  });
  const fatima = await ensureUser("fatima@example.com", "password123", {
    name: "Fatima Raza",
    phone: "+923123334455",
  });
  const usman = await ensureUser("usman@example.com", "password123", {
    name: "Usman Tariq",
    phone: "+923064445566",
  });
  // Customers with vendor applications for the admin to review
  const zainab = await ensureUser("zainab@example.com", "password123", {
    name: "Zainab Hussain",
    phone: "+923015556677",
  });
  const omar = await ensureUser("omar@example.com", "password123", {
    name: "Omar Farooq",
    phone: "+923216667788",
  });
  console.log("Users ready");

  // --------------------------------------------------- vendor applications
  const applications = [
    {
      user: sara,
      businessName: "Malik Events Lahore",
      businessType: "Event Venues",
      description: "Family-run events company operating banquet halls and rooftops across Lahore since 2014.",
      phone: sara.phone!,
      website: "https://example.com/malik-events",
      yearsOfExperience: 10,
      status: ApplicationStatus.Approved,
    },
    {
      user: zainab,
      businessName: "Hussain Garden Marquees",
      businessType: "Outdoor Venues",
      description: "Two garden marquees in Hyderabad for weddings and mehndi functions, up to 500 guests.",
      phone: zainab.phone!,
      yearsOfExperience: 4,
      status: ApplicationStatus.Pending,
    },
    {
      user: omar,
      businessName: "Farooq Studios",
      businessType: "Photography Studio",
      description: "Photo studio available for small shoots and product launches.",
      phone: omar.phone!,
      yearsOfExperience: 1,
      status: ApplicationStatus.Rejected,
      rejectionReason: "A photography studio isn't an event venue. Please reapply once you list a bookable space.",
    },
  ];
  for (const { user, status, ...app } of applications) {
    await prisma.vendorApplication.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        ...app,
        status,
        userId: user.id,
        ...(status !== ApplicationStatus.Pending && {
          reviewedAt: hoursAgo(24 * 20),
          reviewedBy: admin.id,
        }),
      },
    });
  }
  console.log("Vendor applications ready");

  // --------------------------------------------------------------- venues
  // Original five Karachi venues (Venue Vendor)
  const pearl = await ensureVenue(vendor, {
    name: "Pearl Continental Grand Ballroom",
    description:
      "Luxurious ballroom in Clifton, perfect for grand weddings, corporate galas, and high-profile events. Features stunning chandeliers, marble flooring, and state-of-the-art audio-visual equipment.",
    pricePerDay: 180000,
    capacity: 400,
    photoUrls: [photo("1511795409834-ef04bbd61622"), photo("1511578314322-379afb476865")],
    amenities: ["WiFi", "Valet Parking", "Catering Kitchen", "AV Equipment", "Bar Area", "Stage", "Air Conditioning"],
    venueType: VenueType.BanquetHall,
    rating: 4.8,
    numberOfReviews: 126,
    location: { address: "Club Road, Clifton", city: "Karachi", state: "Sindh", postalCode: "75600", latitude: 24.8138, longitude: 67.0273 },
  });
  const portGrand = await ensureVenue(vendor, {
    name: "Rooftop at Port Grand",
    description:
      "Stunning waterfront rooftop venue with panoramic views of Karachi harbor. Ideal for cocktail evenings, corporate events, and outdoor celebrations. Features open-air deck with modern lighting.",
    pricePerDay: 140000,
    capacity: 180,
    photoUrls: [photo("1517457373958-b7bdd4587205"), photo("1478147427282-58a87a120781")],
    amenities: ["WiFi", "Parking", "Bar Area", "AV Equipment", "Outdoor Space", "Harbor Views", "Stage"],
    venueType: VenueType.Rooftop,
    rating: 4.6,
    numberOfReviews: 84,
    location: { address: "Native Jetty Bridge, Keamari", city: "Karachi", state: "Sindh", postalCode: "75620", latitude: 24.8103, longitude: 66.9824 },
  });
  const pavilion = await ensureVenue(vendor, {
    name: "The Pavilion at Frere Hall",
    description:
      "Historic garden pavilion surrounded by lush greenery in the heart of Karachi. Perfect for daytime weddings, garden parties, and cultural events. Features colonial architecture and beautiful landscaping.",
    pricePerDay: 100000,
    capacity: 150,
    photoUrls: [photo("1464366400600-7168b8af9bc3"), photo("1519225421980-715cb0215aed")],
    amenities: ["Outdoor Space", "Parking", "Garden", "Gazebo", "WiFi", "Catering Area", "Historic Architecture"],
    venueType: VenueType.OutdoorSpace,
    rating: 4.7,
    numberOfReviews: 58,
    location: { address: "Fatima Jinnah Road", city: "Karachi", state: "Sindh", postalCode: "75530", latitude: 24.848, longitude: 67.0281 },
  });
  const bahria = await ensureVenue(vendor, {
    name: "Bahria Town Convention Center",
    description:
      "State-of-the-art conference facility with multiple halls and modern amenities. Perfect for corporate conferences, trade shows, and large-scale seminars. Fully equipped with latest technology.",
    pricePerDay: 220000,
    capacity: 600,
    photoUrls: [photo("1505373877841-8d25f7d46678"), photo("1587825140708-dfaf72ae4b04")],
    amenities: ["WiFi", "Ample Parking", "AV Equipment", "Breakout Rooms", "Catering Kitchen", "Stage", "Conference Tables", "Air Conditioning"],
    venueType: VenueType.ConferenceCenter,
    rating: 4.5,
    numberOfReviews: 47,
    location: { address: "Bahria Town", city: "Karachi", state: "Sindh", postalCode: "75340", latitude: 24.9262, longitude: 67.1852 },
  });
  const canvas = await ensureVenue(vendor, {
    name: "Canvas Gallery DHA",
    description:
      "Contemporary art gallery in Defence with minimalist design and excellent natural lighting. Ideal for art exhibitions, fashion shows, product launches, and intimate gatherings. Features white walls and polished floors.",
    pricePerDay: 120000,
    capacity: 120,
    photoUrls: [photo("1513161455079-7dc1de15ef3e"), photo("1531058020387-3be344556be6")],
    amenities: ["WiFi", "Natural Light", "High Ceilings", "AV Equipment", "Parking", "Display Walls", "Air Conditioning"],
    venueType: VenueType.Gallery,
    rating: 4.4,
    numberOfReviews: 31,
    location: { address: "Khayaban-e-Sehar, Phase 6, DHA", city: "Karachi", state: "Sindh", postalCode: "75500", latitude: 24.809, longitude: 67.063 },
  });

  // More Karachi (Venue Vendor)
  const seaView = await ensureVenue(vendor, {
    name: "Sea View Marquee",
    description:
      "Beachside marquee a few steps from the Arabian Sea. Built for mehndi nights, beach weddings and sunset receptions, with fairy-light canopies and a sea-facing stage.",
    pricePerDay: 160000,
    capacity: 350,
    photoUrls: [photo("1469371670807-013ccf25f16a"), photo("1520854221256-17451cc331bf")],
    amenities: ["Outdoor Space", "Sea Views", "Stage", "Generator Backup", "Parking", "Catering Area"],
    venueType: VenueType.OutdoorSpace,
    rating: 4.3,
    numberOfReviews: 39,
    location: { address: "Sea View, Phase 5, DHA", city: "Karachi", state: "Sindh", postalCode: "75500", latitude: 24.798, longitude: 67.04 },
  });
  const saddar = await ensureVenue(vendor, {
    name: "Saddar Heritage Hotel Hall",
    description:
      "Restored 1930s hotel hall with high ceilings, arched windows and teak floors. Suits nikkah ceremonies, book launches and formal dinners with in-house catering.",
    pricePerDay: 90000,
    capacity: 200,
    photoUrls: [photo("1566073771259-6a8506099945"), photo("1542314831-068cd1dbfeeb")],
    amenities: ["WiFi", "In-house Catering", "Air Conditioning", "Valet Parking", "Bridal Room"],
    venueType: VenueType.Hotel,
    rating: 4.2,
    numberOfReviews: 22,
    location: { address: "Abdullah Haroon Road, Saddar", city: "Karachi", state: "Sindh", postalCode: "74400", latitude: 24.856, longitude: 67.029 },
  });

  // Lahore (Sara Malik)
  const gulberg = await ensureVenue(sara, {
    name: "Gulberg Grand Banquet",
    description:
      "Two-level banquet hall in the heart of Gulberg with a 40-foot stage, LED walls and a dedicated bridal suite. A favourite for walima receptions and large family weddings.",
    pricePerDay: 250000,
    capacity: 700,
    photoUrls: [photo("1519167758481-83f550bb49b3"), photo("1464207687429-7505649dae38")],
    amenities: ["WiFi", "Valet Parking", "LED Walls", "Bridal Suite", "Stage", "Air Conditioning", "Catering Kitchen"],
    venueType: VenueType.BanquetHall,
    rating: 4.7,
    numberOfReviews: 212,
    location: { address: "Main Boulevard, Gulberg III", city: "Lahore", state: "Punjab", postalCode: "54660", latitude: 31.512, longitude: 74.344 },
  });
  const liberty = await ensureVenue(sara, {
    name: "Liberty Rooftop Lounge",
    description:
      "Open-air rooftop overlooking Liberty Market with string lights, lounge seating and a cocktail bar. Great for engagement parties, birthdays and corporate mixers.",
    pricePerDay: 150000,
    capacity: 160,
    photoUrls: [photo("1533174072545-7a4b6ad7a6c3"), photo("1505236858219-8359eb29e329")],
    amenities: ["Outdoor Space", "Bar Area", "Sound System", "Lounge Seating", "City Views", "WiFi"],
    venueType: VenueType.Rooftop,
    rating: 4.6,
    numberOfReviews: 95,
    location: { address: "Liberty Market, Gulberg III", city: "Lahore", state: "Punjab", postalCode: "54660", latitude: 31.5106, longitude: 74.341 },
  });
  const mallRoad = await ensureVenue(sara, {
    name: "Mall Road Heritage Hotel Hall",
    description:
      "Grand colonial-era hall on Mall Road with crystal chandeliers and a sweeping staircase entrance. Ideal for formal dinners, award nights and traditional weddings.",
    pricePerDay: 200000,
    capacity: 300,
    photoUrls: [photo("1551882547-ff40c63fe5fa"), photo("1478146896981-b80fe463b330")],
    amenities: ["WiFi", "In-house Catering", "Valet Parking", "Air Conditioning", "Bridal Room", "Stage"],
    venueType: VenueType.Hotel,
    rating: 4.5,
    numberOfReviews: 73,
    location: { address: "The Mall", city: "Lahore", state: "Punjab", postalCode: "54000", latitude: 31.56, longitude: 74.316 },
  });
  const playhouse = await ensureVenue(sara, {
    name: "Lahore Playhouse Theater",
    description:
      "Intimate 250-seat theater with tiered seating, professional lighting rig and green rooms. Hosts plays, recitals, talks and film screenings.",
    pricePerDay: 110000,
    capacity: 250,
    photoUrls: [photo("1503095396549-807759245b35"), photo("1507676184212-d03ab07a01bf")],
    amenities: ["Tiered Seating", "Lighting Rig", "Sound System", "Green Rooms", "Projector", "Air Conditioning"],
    venueType: VenueType.Theater,
    rating: 4.4,
    numberOfReviews: 41,
    location: { address: "Shahrah-e-Quaid-e-Azam", city: "Lahore", state: "Punjab", postalCode: "54000", latitude: 31.5546, longitude: 74.3272 },
  });
  await ensureVenue(sara, {
    name: "Johar Town Community Hall",
    description:
      "Simple, affordable hall for aqeeqahs, birthday parties and community meetings. Folding tables and chairs included.",
    pricePerDay: 45000,
    capacity: 120,
    photoUrls: [photo("1514525253161-7a46d19cd819")],
    amenities: ["Parking", "Tables & Chairs", "Kitchenette"],
    venueType: VenueType.BanquetHall,
    rating: 0,
    numberOfReviews: 0,
    isApproved: false,
    location: { address: "Block G, Johar Town", city: "Lahore", state: "Punjab", postalCode: "54782", latitude: 31.4697, longitude: 74.2728 },
  });

  // Islamabad (Bilal Ahmed)
  const margalla = await ensureVenue(bilal, {
    name: "Margalla View Gardens",
    description:
      "Landscaped lawns at the foot of the Margalla Hills with a covered pavilion for rainy days. Popular for garden weddings, mehndis and corporate family days.",
    pricePerDay: 110000,
    capacity: 400,
    photoUrls: [photo("1469371670807-013ccf25f16a"), photo("1464366400600-7168b8af9bc3")],
    amenities: ["Outdoor Space", "Covered Pavilion", "Mountain Views", "Parking", "Catering Area", "Generator Backup"],
    venueType: VenueType.OutdoorSpace,
    rating: 4.8,
    numberOfReviews: 88,
    location: { address: "Margalla Road, F-6", city: "Islamabad", state: "Islamabad Capital Territory", postalCode: "44000", latitude: 33.738, longitude: 73.075 },
  });
  const blueArea = await ensureVenue(bilal, {
    name: "Blue Area Conference Hall",
    description:
      "Corporate conference floor in Blue Area with a 300-seat main hall, three breakout rooms and simultaneous-translation booths.",
    pricePerDay: 180000,
    capacity: 300,
    photoUrls: [photo("1540575467063-178a50c2df87"), photo("1475721027785-f74eccf877e2")],
    amenities: ["WiFi", "AV Equipment", "Breakout Rooms", "Translation Booths", "Parking", "Air Conditioning"],
    venueType: VenueType.ConferenceCenter,
    rating: 4.5,
    numberOfReviews: 36,
    location: { address: "Jinnah Avenue, Blue Area", city: "Islamabad", state: "Islamabad Capital Territory", postalCode: "44000", latitude: 33.71, longitude: 73.06 },
  });
  const f7Bistro = await ensureVenue(bilal, {
    name: "F-7 Bistro Private Dining",
    description:
      "Private dining room and terrace at a popular F-7 bistro. Set menus for birthdays, anniversaries and small business dinners up to 60 guests.",
    pricePerDay: 60000,
    capacity: 60,
    photoUrls: [photo("1414235077428-338989a2e8c0"), photo("1517248135467-4c7edcad34c4")],
    amenities: ["Set Menus", "Terrace", "WiFi", "Sound System", "Air Conditioning"],
    venueType: VenueType.Restaurant,
    rating: 4.6,
    numberOfReviews: 64,
    location: { address: "Jinnah Super Market, F-7", city: "Islamabad", state: "Islamabad Capital Territory", postalCode: "44000", latitude: 33.7215, longitude: 73.056 },
  });
  const terrace = await ensureVenue(bilal, {
    name: "Hillside Terrace Islamabad",
    description:
      "Restaurant terrace on the hillside road with sweeping city views at night. Best for sunset engagements and intimate receptions.",
    pricePerDay: 95000,
    capacity: 100,
    photoUrls: [photo("1555396273-367ea4eb4db5"), photo("1559339352-11d035aa65de")],
    amenities: ["City Views", "Outdoor Space", "Set Menus", "Parking", "Heaters"],
    venueType: VenueType.Restaurant,
    rating: 4.7,
    numberOfReviews: 52,
    location: { address: "Pir Sohawa Road", city: "Islamabad", state: "Islamabad Capital Territory", postalCode: "44000", latitude: 33.755, longitude: 73.09 },
  });
  await ensureVenue(bilal, {
    name: "E-11 Courtyard Venue",
    description:
      "New courtyard venue with a retractable canopy, opening this season. Suitable for dholkis and small receptions.",
    pricePerDay: 70000,
    capacity: 150,
    photoUrls: [photo("1505236858219-8359eb29e329")],
    amenities: ["Outdoor Space", "Retractable Canopy", "Parking"],
    venueType: VenueType.OutdoorSpace,
    rating: 0,
    numberOfReviews: 0,
    isApproved: false,
    location: { address: "Main Double Road, E-11/2", city: "Islamabad", state: "Islamabad Capital Territory", postalCode: "44000", latitude: 33.699, longitude: 72.98 },
  });

  // ------------------------------------------------------------- bookings
  // The original two bookings for John (fixed December dates)
  for (const b of [
    { venue: pearl, message: "Company annual party - Grand celebration", date: "2025-12-15", paid: true },
    { venue: portGrand, message: "Birthday celebration at rooftop", date: "2025-12-20", paid: false },
  ]) {
    const exists = await prisma.booking.findFirst({
      where: { venueId: b.venue.id, userId: john.id, message: b.message },
    });
    if (!exists) {
      await prisma.booking.create({
        data: {
          venueId: b.venue.id,
          userId: john.id,
          startDateTime: new Date(`${b.date}T10:00:00`),
          endDateTime: new Date(`${b.date}T23:00:00`),
          totalPrice: b.venue.pricePerDay,
          status: BookingStatus.Confirmed,
          message: b.message,
          paymentStatus: b.paid ? "paid" : "unpaid",
          ...(b.paid && {
            paidAmount: b.venue.pricePerDay,
            platformFee: b.venue.pricePerDay * 0.15,
            vendorPayout: b.venue.pricePerDay * 0.85,
            paidAt: new Date(),
          }),
        },
      });
    }
  }

  // Negotiations in progress
  await ensureBooking({
    venue: gulberg,
    customer: ayesha,
    message: "Walima reception for about 550 guests, hoping for a family discount.",
    offset: 21,
    status: BookingStatus.Pending,
    negotiatedPrice: 200000,
    thread: [
      { from: "customer", text: "Assalam o Alaikum! We love the hall. Our budget is a bit tight, could you do Rs 200,000 for the day?", at: 52 },
      { from: "vendor", text: "Walaikum Assalam Ayesha, thank you! Rs 200,000 is hard on a Saturday. I could do Rs 230,000 with the LED walls included.", at: 49 },
      { from: "customer", text: "That's helpful. Would Rs 215,000 work if we skip the LED walls?", at: 26 },
      { from: "vendor", text: "Let me check with the team and get back to you by tomorrow.", at: 3, read: false },
    ],
  });
  await ensureBooking({
    venue: margalla,
    customer: hamza,
    message: "Office family day, around 250 people, daytime only.",
    offset: 30,
    status: BookingStatus.Pending,
    negotiatedPrice: 85000,
    thread: [
      { from: "customer", text: "Hi, it's a daytime event (10am to 5pm). Could the price be lower than a full evening booking?", at: 20 },
      { from: "vendor", text: "Hi Hamza, daytime is quieter for us, so yes. Send me your best offer.", at: 18, read: false },
    ],
  });
  await ensureBooking({
    venue: canvas,
    customer: fatima,
    message: "Bridal couture exhibition, 3 designers, need the space from 9am.",
    offset: 14,
    status: BookingStatus.Pending,
    negotiatedPrice: 108000,
    thread: [
      { from: "customer", text: "Hello! We're showcasing three designers. Would you accept Rs 95,000?", at: 40 },
      { from: "vendor", text: "Hi Fatima, lovely event! Lowest I can go is Rs 108,000, and that includes the extra display lighting.", at: 30 },
      { from: "customer", text: "Okay, that sounds fair. Let me confirm with the designers tonight.", at: 6, read: false },
    ],
  });
  await ensureBooking({
    venue: seaView,
    customer: usman,
    message: "Mehndi night for my sister, roughly 300 guests. Is the stage big enough for a dhol group?",
    offset: 40,
    status: BookingStatus.Pending,
  });

  // Agreed price, waiting for payment
  await ensureBooking({
    venue: liberty,
    customer: john,
    message: "Engagement party on the rooftop, 120 guests, evening.",
    offset: 25,
    status: BookingStatus.Confirmed,
    negotiatedPrice: 130000,
    thread: [
      { from: "customer", text: "Hi Sara, could you do Rs 120,000 for the evening?", at: 120 },
      { from: "vendor", text: "Hi John! Rs 120,000 is a bit low. I can do Rs 135,000 including the bar setup.", at: 110 },
      { from: "customer", text: "Meet in the middle at Rs 130,000?", at: 100 },
      { from: "vendor", text: "Deal! I've confirmed the booking at Rs 130,000. Please complete the payment to lock the date.", at: 96 },
    ],
  });

  // Confirmed and paid, upcoming
  await ensureBooking({
    venue: bahria,
    customer: ayesha,
    message: "Annual tech conference, 500 attendees, need breakout rooms.",
    offset: 50,
    status: BookingStatus.Confirmed,
    paid: true,
  });

  // Completed, in the past
  await ensureBooking({
    venue: blueArea,
    customer: hamza,
    message: "Quarterly sales kickoff with remote dial-in.",
    offset: -20,
    status: BookingStatus.Completed,
    paid: true,
  });
  await ensureBooking({
    venue: mallRoad,
    customer: fatima,
    message: "Nikkah ceremony and dinner for 220 guests.",
    offset: -45,
    status: BookingStatus.Completed,
    negotiatedPrice: 185000,
    paid: true,
    thread: [
      { from: "customer", text: "Would you consider Rs 180,000 since it's a weekday?", at: 24 * 70 },
      { from: "vendor", text: "For a weekday I can do Rs 185,000. Mubarak in advance!", at: 24 * 69 },
    ],
  });
  await ensureBooking({
    venue: f7Bistro,
    customer: john,
    message: "Parents' 30th anniversary dinner, 40 guests, set menu B.",
    offset: -10,
    status: BookingStatus.Completed,
    paid: true,
  });

  // Cancelled
  await ensureBooking({
    venue: pearl,
    customer: usman,
    message: "Corporate gala (cancelled, event moved to next year).",
    offset: 35,
    status: BookingStatus.Cancelled,
  });

  // ------------------------------------------------------------ favorites
  for (const [user, venue] of [
    [john, pearl],
    [john, liberty],
    [ayesha, gulberg],
    [ayesha, liberty],
    [ayesha, terrace],
    [hamza, margalla],
    [fatima, canvas],
    [fatima, pavilion],
    [usman, seaView],
  ] as const) {
    await ensureFavorite(user, venue);
  }
  console.log("Favorites ready");

  // --------------------------------------------- views for vendor charts
  const viewCounts: [Venue, number][] = [
    [pearl, 64], [portGrand, 41], [pavilion, 37], [bahria, 29], [canvas, 33],
    [seaView, 26], [saddar, 14], [gulberg, 88], [liberty, 57], [mallRoad, 35],
    [playhouse, 19], [margalla, 46], [blueArea, 24], [f7Bistro, 31], [terrace, 28],
  ];
  for (const [venue, count] of viewCounts) await ensureViews(venue, count);
  console.log("Venue views ready");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
