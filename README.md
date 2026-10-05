# Plot Twist Studio website

Next.js (App Router, TypeScript). Design: Option A (beige, warm, hot-pink accent).

## Run

```bash
npm install
cp .env.example .env.local   # then set NEXT_PUBLIC_BOOKING_URL
npm run dev                  # http://localhost:3000
```

Deploy: push to GitHub and import in Vercel. Add `NEXT_PUBLIC_BOOKING_URL` in Vercel's environment variables.

## Where to edit

| What | File |
| --- | --- |
| Address, hours, Instagram, WhatsApp, booking link | `data/site.ts` |
| Price list and packages | `data/packages.ts` |
| Weekly timetable, holidays/closed dates, one-off classes, opening date | `data/schedule.ts` |
| Teachers (names, bios) | `data/teachers.ts` |
| Class descriptions | `data/classTypes.ts` |
| Colours, fonts, spacing | top of `app/globals.css` |
| Logo | `public/logo.png` |

Anything written as `[like this]` is a placeholder still to be filled in.

## Pages

`/` Home, `/schedule`, `/packages`, `/teachers`, `/class-guide`

## Booking (built-in)

Flow: Book / Choose -> sign in or create account -> use a credit, or pick a package and pay with QRIS -> booked (or waitlist if the class is full). See `/book` and `/account`.

### Setup (once)
1. Create a free project at supabase.com.
2. SQL Editor -> paste `supabase/schema.sql` -> Run.
3. Authentication -> Providers -> Email: turn **off** "Confirm email" (simplest for now).
4. Project Settings -> API: copy the URL, anon key and service_role key into `.env.local` (see `.env.example`). Add the same variables in Vercel -> Settings -> Environment Variables, then redeploy.
5. `npm install` (installs `@supabase/supabase-js`) then `npm run dev`.

### Payments
`NEXT_PUBLIC_PAYMENT_MODE=simulate` shows a fake QR and a "Simulate payment" button for testing. For real QRIS connect a gateway (Midtrans / Xendit): create the QR in `app/api/orders/route.ts` and finish the order in `app/api/payments/webhook/route.ts` (see comments). Set the mode to `live` to disable the simulate button.

### TODO values
- `data/schedule.ts`: `CLASS_CAPACITY` = 12 mats per class.
- `lib/booking.ts`: `VALIDITY` rules (days, and whether the clock starts at purchase or at the first booking).
- Waitlist promotions do not send a message yet (marked TODO in `promoteWaitlist`).

## Admin dashboard (/admin)

- Who can open it: set `ADMIN_EMAILS` (comma separated) in `.env.local` and in Vercel. These must be accounts that already exist (create them through normal sign up first).
- Sign in at `/login?next=/admin`.
- Today: classes of a day with mats and waitlist. Roster: check-in, cancel (credit always returns), add a person, move up from the waitlist, copy WhatsApp numbers. Members: search, credits, adjust credits with a reason, history. Orders: all payments, "Mark as paid" for pending ones.
- Run the "Admin dashboard additions" block at the bottom of `supabase/schema.sql` once (adds `email`, `checked_in_at` and the `credit_adjustments` table).
- TODO value: `MANUAL_PACK_DAYS` in `app/api/admin/members/[id]/credits/route.ts` (how long a manually added credit stays valid).
