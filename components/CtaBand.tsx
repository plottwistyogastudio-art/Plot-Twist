import Link from "next/link";
import { site } from "@/data/site";

export default function CtaBand({
  title = "Ready for your first twist?",
  text = "Pick a class, book your spot and arrive ten minutes early. We'll take care of the rest.",
  button = "Book a class",
  href = site.bookingUrl,
}: {
  title?: string;
  text?: string;
  button?: string;
  href?: string;
}) {
  return (
    <section className="container section-tight">
      <div className="cta-band">
        <div>
          <h2 className="h2">{title}</h2>
          <p>{text}</p>
        </div>
        {href.startsWith("/") ? (
          <Link href={href} className="btn btn-light">
            {button}
          </Link>
        ) : (
          <a href={href} className="btn btn-light">
            {button}
          </a>
        )}
      </div>
    </section>
  );
}
