// Studio-wide info. Edit here and it updates everywhere.
export const site = {
  name: "Plot Twist Studio",
  shortName: "Plot Twist",
  description:
    "A boutique yoga studio in Lippo Karawaci. Warm, playful and made for every level.",
  // TODO: replace with the real address and hours
  addressLines: ["3rd floor, The Hive Essence no 25", "Lippo Karawaci"],
  hours: "[Opening hours]",
  instagramHandle: "@plottwiststudio.id",
  instagramUrl: "https://instagram.com/plottwiststudio.id",
  // TODO: put the studio's WhatsApp number here, digits only with country code (no + or spaces),
  // e.g. "6281234567890". The WhatsApp links and the floating button turn on by themselves.
  whatsappNumber: "6288801900190",
  whatsappUrl: "#",
  // TODO: replace with the real email
  emailUrl: "#",
  // Every "Book" button uses this. Set NEXT_PUBLIC_BOOKING_URL in .env.local
  bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL ?? "#",
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/packages", label: "Packages" },
  { href: "/teachers", label: "Teachers" },
  { href: "/class-guide", label: "Class Guide" },
];

// Real chat link once a number is set (with a friendly first message)
const waNumber = site.whatsappNumber.replace(/\D/g, "");
if (waNumber) site.whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent("Hi Plot Twist! I have a question.")}`;
