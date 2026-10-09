import { levelInfo, typeInfo } from "@/data/classTypes";

// Explains class types and levels. Pass only what's shown on the page (or nothing for everything).
export default function ClassLegend({ types, levels }: { types?: string[]; levels?: string[] }) {
  const t = Object.keys(typeInfo).filter((k) => !types || types.includes(k));
  const l = Object.keys(levelInfo).filter((k) => !levels || levels.includes(k));
  if (!t.length && !l.length) return null;
  return (
    <div className="legend">
      {t.length > 0 && (
        <div>
          <h2 className="legend-title">Class types</h2>
          <dl className="legend-list">
            {t.map((k) => (
              <div key={k}><dt>{k}</dt><dd>{typeInfo[k]}</dd></div>
            ))}
          </dl>
        </div>
      )}
      {l.length > 0 && (
        <div>
          <h2 className="legend-title">Levels</h2>
          <dl className="legend-list">
            {l.map((k) => (
              <div key={k}><dt>{k}</dt><dd>{levelInfo[k]}</dd></div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
