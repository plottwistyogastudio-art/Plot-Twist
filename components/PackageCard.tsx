import { formatIDR, perClass, type Pkg } from "@/data/packages";

export default function PackageCard({ pkg, compact = false }: { pkg: Pkg; compact?: boolean }) {
  return (
    <div className={`card package-card ${pkg.featured ? "is-featured" : ""}`}>
      <div className="eyebrow">{pkg.tag}</div>
      <h3 className="card-title">{pkg.name}</h3>
      <p className="muted grow">{pkg.desc}</p>
      <div className="price">{formatIDR(pkg.price)}</div>
      {pkg.regularPrice && (
        <div className="muted small">
          Regular <s>{formatIDR(pkg.regularPrice)}</s>
        </div>
      )}
      {pkg.classes > 1 && <div className="muted small">{formatIDR(perClass(pkg))} per class</div>}
      {!compact && <div className="muted small">Valid for {pkg.validity}</div>}
      {pkg.oncePerPerson && <div className="small strong deep">New members only · one per person</div>}
      <a href={`/book?package=${pkg.id}`} className="btn btn-dark btn-block">
        {pkg.oncePerPerson ? "Get " + pkg.name : "Choose"}
      </a>
    </div>
  );
}
