import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/data/site";
import { PRIVACY_UPDATED, commitment } from "@/data/legal";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Plot Twist Studio collects, uses and protects your personal data." };

export default function PrivacyPage() {
  return (
    <section className="container page legal">
      <div className="eyebrow">Privacy Policy</div>
      <h1 className="h1 h1-page">
        Your data, <em>our promise</em>
      </h1>
      <p className="lead">
        When you create an account, you trust {site.name} with some personal details. This page explains what we
        keep, why, and the promises we make about it. Last updated {PRIVACY_UPDATED}.
      </p>

      <div className="legal-promise">
        <div className="card-title">Our commitment</div>
        <ul>
          {commitment.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <h2 className="h3">What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, WhatsApp number, email address and password. Your password is stored in scrambled form and is not readable by us.</li>
        <li><strong>Booking and purchase history:</strong> the classes you book, cancel or wait for, the packages you buy, your remaining credits and when they expire.</li>
        <li><strong>Payment status:</strong> whether an order was paid. Payments are handled by our payment provider. We never see or store your bank, e-wallet or card details.</li>
        <li><strong>Your consent:</strong> when you agreed to this policy, and which version.</li>
      </ul>

      <h2 className="h3">Why we use it</h2>
      <ul>
        <li>To create and manage your account, bookings, waitlist spots and class credits.</li>
        <li>To contact you about your classes by email or WhatsApp: confirmations, waitlist updates, schedule changes and reminders.</li>
        <li>To keep records of payments, as required for our accounting and by law.</li>
        <li>To keep the studio safe and running smoothly, for example knowing who is on the mat list.</li>
      </ul>

      <h2 className="h3">Who can see it</h2>
      <ul>
        <li>Our own team, limited to what each person needs.</li>
        <li>Service providers who help us run the website: our hosting and database providers, our payment provider and our email provider. They may only process your data for us and under our instructions. Some of them store data on servers outside Indonesia.</li>
        <li>Authorities, only when the law requires us to.</li>
      </ul>

      <h2 className="h3">How we protect it</h2>
      <p>
        Your data is stored in a protected database. The connection to this website is encrypted, access is
        limited to authorised team members, and we review who has access. No system is perfectly secure. If
        something goes wrong that affects your data, we will tell you promptly and explain what happened.
      </p>

      <h2 className="h3">How long we keep it</h2>
      <p>
        We keep your details while your account is active. If you ask us to delete your account, we delete or
        anonymise your personal details. We may keep payment records for as long as the law requires for
        accounting and tax.
      </p>

      <h2 className="h3">Your rights</h2>
      <p>Under Indonesia&apos;s Personal Data Protection Law, you have the right to:</p>
      <ul>
        <li>know what data we hold about you and receive a copy,</li>
        <li>correct anything that is wrong or out of date,</li>
        <li>withdraw your consent and ask us to delete your data,</li>
        <li>object to how your data is used, and</li>
        <li>make a complaint if you feel we have not kept our promises.</li>
      </ul>
      <p>
        To use any of these rights, message us on Instagram{" "}
        <a href={site.instagramUrl} className="text-link">{site.instagramHandle}</a> or email{" "}
        <a href={site.emailUrl} className="text-link">[studio email]</a>. Withdrawing consent means we can no
        longer keep your account, because we cannot book classes without these details.
      </p>

      <h2 className="h3">Changes to this policy</h2>
      <p>
        If we change this policy in a way that matters, we will update the date at the top and ask you to
        confirm again.
      </p>

      <h2 className="h3">Terms of use</h2>
      <p>
        The rules for using the website and booking classes are in our{" "}
        <Link href="/terms" className="text-link">Terms of Use</Link>.
      </p>

      <h2 className="h3">Who we are</h2>
      <p>
        {site.name}, {site.addressLines.join(", ")}.
      </p>
    </section>
  );
}
