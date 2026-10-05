import Link from "next/link";
import { nav, site } from "@/data/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">{site.shortName}</div>
          <p className="footer-text">{site.description}</p>
        </div>
        <div className="footer-col">
          {nav.slice(1).map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="footer-col">
          <a href={site.instagramUrl}>Instagram</a>
          <a href={site.whatsappUrl}>WhatsApp</a>
          <a href={site.emailUrl}>Email</a>
          <Link href="/terms">Terms of Use</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
        <div className="footer-text">
          {site.addressLines.map((l) => (
            <div key={l}>{l}</div>
          ))}
          <div>{site.instagramHandle}</div>
        </div>
      </div>
    </footer>
  );
}
