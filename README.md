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
