import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/data/site";
import { TERMS_UPDATED, commitment } from "@/data/legal";
import { CANCEL_HOURS } from "@/lib/booking-shared";

export const metadata: Metadata = { title: "Terms of Use", description: "The terms for booking classes and buying packages at Plot Twist Studio." };

export default function TermsPage() {
  return (
    <section className="container page legal">
      <div className="eyebrow">Terms of Use</div>
      <h1 className="h1 h1-page">
        The <em>small print</em>, in plain words
      </h1>
      <p className="lead">
        These terms are an agreement between you and {site.name} (&quot;we&quot;, &quot;us&quot;). They apply when you
        create an account, book a class or buy a package on this website. By ticking the box when you sign up,
        you confirm that you have read and accepted them. Last updated {TERMS_UPDATED}.
      </p>

      <div className="legal-promise">
        <div className="card-title">Our commitment about your data</div>
        <ul>
          {commitment.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <h2 className="h3">1. Who can use this website</h2>
      <p>
        You must be 18 or older to create an account. If you are younger, a parent or guardian must book and
        sign up for you. Please give us true and current details, and keep your password to yourself. You are
        responsible for what happens under your account.
      </p>

      <h2 className="h3">2. Your personal data and your consent</h2>
      <p>
        When you sign up, you agree that {site.name} may collect and use your name, WhatsApp number, email
        address, booking history and purchase history through this website. We use them to:
      </p>
      <ul>
        <li>create and manage your account, bookings, waitlist spots and class credits,</li>
        <li>contact you about your classes by email or WhatsApp (confirmations, waitlist updates, schedule changes, reminders),</li>
        <li>keep payment and accounting records, and</li>
        <li>keep the studio safe and running smoothly.</li>
      </ul>
      <p>
        We will not use your data for anything else, we will not sell it, and we will not share it with
        advertisers. We share it only with the service providers that run this website for us (hosting, database,
        payment and email) and with authorities when the law requires it. Studio news and offers are sent only if
        you tick the separate optional box. You can withdraw your consent, or ask to see, correct or delete your
        data, at any time. Withdrawing consent means we can no longer keep your account. The full details are in
        our <Link href="/privacy" className="text-link">Privacy Policy</Link>, which is part of these terms.
      </p>

      <h2 className="h3">3. Your health and taking part safely</h2>
      <ul>
        <li>Yoga is physical. You take part at your own pace and at your own risk.</li>
        <li>You confirm you are well enough to take part. If you are pregnant, injured, recovering from surgery or have a medical condition, speak to your doctor first and tell your teacher before class.</li>
        <li>You can adjust or skip any pose at any time. Your teacher may suggest changes to keep you safe.</li>
        <li>To the extent the law allows, we are not responsible for injury or loss that results from your taking part, except where it is caused by our own negligence.</li>
      </ul>

      <h2 className="h3">4. Booking classes</h2>
      <ul>
        <li>One booking uses one class credit. You can only book classes that are open on the schedule.</li>
        <li>Every class has a limited number of mats. Spots are given in the order of booking.</li>
        <li><strong>Waitlist:</strong> if a class is full, you can join its waitlist if you have a credit. No credit is used until a spot opens. If a spot opens, the first person on the waitlist who has a valid credit is booked automatically and we tell you. The waitlist closes {CANCEL_HOURS} hours before class.</li>
        <li>If we cancel or change a class, we will tell you. You can move to another class, or we return your credit.</li>
      </ul>

      <h2 className="h3">5. Cancelling</h2>
      <ul>
        <li>You can cancel up to <strong>{CANCEL_HOURS} hours before class</strong> and your credit is returned to your package.</li>
        <li>If you cancel less than {CANCEL_HOURS} hours before class, or you do not come, the credit is used.</li>
        <li>You can leave a waitlist at any time without losing a credit.</li>
      </ul>

      <h2 className="h3">6. Packages, validity and prices</h2>
      <ul>
        <li>A drop-in is valid for 7 days from purchase.</li>
        <li>The 5-class pack is valid for 5 weeks and the 10-class pack for 10 weeks. First Plot 3 is valid for 3 weeks and First Plot 5 for 5 weeks. For all of these, the time starts on the day you make your first booking.</li>
        <li>If you cancel that first booking up to {CANCEL_HOURS} hours before class and have no other booking with the package, the package counts as unused. The time starts again when you next book.</li>
        <li>Unused credits expire at the end of the validity period.</li>
        <li><strong>First Plot</strong> is an opening offer for new members. It can be bought once per person, and only until 7 November 2026.</li>
        <li>Packages are personal and cannot be shared or transferred. Prices are in Indonesian rupiah and may change. A change does not affect packages you have already bought.</li>
      </ul>

      <h2 className="h3">7. Payment and refunds</h2>
      <ul>
        <li>Payments are made through QRIS. A payment is handled by our payment provider, and we never see or store your bank or e-wallet details.</li>
        <li>Your package starts once payment is confirmed. If you chose a class before paying, we book it automatically after payment.</li>
        <li>Payments are not refundable once a package is active, except where the law requires it or where we cancel a class and cannot offer you a fair alternative. If you think a payment was taken by mistake, contact us and we will check it.</li>
      </ul>

      <h2 className="h3">8. Being a good guest</h2>
      <p>
        Please arrive about 10 minutes early, respect the teacher, the other students and the space, and follow
        the team&apos;s instructions. We may refuse entry or close an account if someone is unsafe, abusive or
        misuses the website or the booking system.
      </p>

      <h2 className="h3">9. Using the website</h2>
      <p>
        Please do not try to break, overload or get around the website, or use it to book on behalf of others
        without their knowledge. The name, logo, texts and photos on this site belong to {site.name} or their
        owners, and you may not copy them without our permission.
      </p>

      <h2 className="h3">10. Our responsibility</h2>
      <p>
        We work to keep the website and classes running well, but we cannot promise it will never be interrupted
        or error-free. To the extent the law allows, our total responsibility to you for any one issue is limited
        to the amount you paid for the package involved. This does not limit anything the law does not allow us to
        limit.
      </p>

      <h2 className="h3">11. Changes and ending your account</h2>
      <p>
        We may update these terms. If the change matters, we will update the date above and ask you to confirm
        again. You can ask us to close your account at any time. Unused credits are not refunded when an account
        is closed, unless the law says otherwise.
      </p>

      <h2 className="h3">12. Law and contact</h2>
      <p>
        These terms follow the laws of the Republic of Indonesia. We will always try to solve a problem with you
        directly first. Contact us on Instagram{" "}
        <a href={site.instagramUrl} className="text-link">{site.instagramHandle}</a> or email{" "}
        <a href={site.emailUrl} className="text-link">[studio email]</a>.
      </p>
      <p className="muted small">
        {site.name}, {site.addressLines.join(", ")}.
      </p>
    </section>
  );
}
