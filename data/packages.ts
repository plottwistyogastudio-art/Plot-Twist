export type Pkg = {
  id: string;
  tag: string;
  name: string;
  classes: number;
  price: number; // in IDR
  desc: string;
  validity: string;
  featured?: boolean;
  regularPrice?: number; // shown struck through, for deals
  oncePerPerson?: boolean; // deal can only be bought once
};

// Regular price list. Edit prices here.
export const packages: Pkg[] = [
  {
    id: "drop-in",
    tag: "Try one",
    name: "Drop-in",
    classes: 1,
    price: 120000,
    desc: "A single class, whenever you feel like it.",
    validity: "7 days from purchase",
  },
  {
    id: "pack-5",
    tag: "Flexible",
    name: "5 Class Pack",
    classes: 5,
    price: 560000,
    desc: "Five classes to use at your own pace.",
    validity: "5 weeks from your first booking",
  },
  {
    id: "pack-10",
    tag: "Best value per class",
    name: "10 Class Pack",
    classes: 10,
    price: 1040000,
    desc: "Ten classes for a steady weekly practice.",
    validity: "10 weeks from your first booking",
    featured: true,
  },
];

// Opening deal: new members only, one per person.
// IDR 98.000 per class (3) and IDR 93.000 per class (5).
export const firstPlotWindow = "Until 7 November 2026";
// First Plot cannot be bought after this moment (end of 7 Nov 2026, Jakarta time)
export const FIRST_PLOT_ENDS_AT = "2026-11-07T23:59:59+07:00";
export const firstPlotOpen = () => Date.now() <= new Date(FIRST_PLOT_ENDS_AT).getTime();

export const firstPlot: Pkg[] = [
  {
    id: "first-plot-3",
    tag: "Opening deal",
    name: "First Plot 3",
    classes: 3,
    price: 294000,
    regularPrice: 360000, // 3 x drop-in
    desc: "Three classes to start your story.",
    validity: "3 weeks from your first booking",
    oncePerPerson: true,
  },
  {
    id: "first-plot-5",
    tag: "Opening deal",
    name: "First Plot 5",
    classes: 5,
    price: 465000,
    regularPrice: 560000, // regular 5 Class Pack
    desc: "Five classes to settle into your practice.",
    validity: "5 weeks from your first booking",
    oncePerPerson: true,
  },
];

// 1040000 -> "IDR 1.040.000"
export function formatIDR(n: number) {
  return "IDR " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function perClass(p: Pkg) {
  return Math.round(p.price / p.classes);
}
