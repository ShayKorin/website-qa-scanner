import { useState } from "react";
import ScoreRing from "./ScoreRing";
import CategoryCard from "./CategoryCard";

const CATEGORIES = [
  { key: "seo", label: "SEO", icon: "🔎" },
  { key: "accessibility", label: "Accessibility", icon: "♿" },
  { key: "performance", label: "Performance", icon: "⚡" },
  { key: "security", label: "Security", icon: "🔒" },
  { key: "content", label: "Content", icon: "📝" },
  { key: "mobile", label: "Mobile", icon: "📱" },
  { key: "bestPractices", label: "Best Practices", icon: "✅" },
];

export default function Report({ report, onRescan }) {
  const [expanded, setExpanded] = useState(null);

  const scores = CATEGORIES.map((c) => report[c.key]?.score || 0);
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  const totalIssues = CATEGORIES.reduce(
    (sum, c) => sum + (report[c.key]?.issues?.length || 0),
    0
  );
  const criticalIssues = CATEGORIES.reduce(
    (sum, c) =>
      sum + (report[c.key]?.issues?.filter((i) => i.severity === "critical")?.length || 0),
    0
  );

  return (
    <div className="p-4 space-y-4">
      {/* Overall score */}
      <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl">
        <ScoreRing score={overallScore} size={72} />
        <div className="flex-1">
          <div className="text-sm text-gray-400">Overall Score</div>
          <div className="text-xs text-gray-500 mt-1 truncate max-w-[260px]">{report.url}</div>
          <div className="flex gap-3 mt-2">
            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-300">
              {totalIssues} issues
            </span>
            {criticalIssues > 0 && (
              <span className="text-xs px-2 py-0.5 bg-red-900/40 rounded text-red-400">
                {criticalIssues} critical
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category cards */}
      <div className="space-y-2">
        {CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.key}
            category={cat}
            data={report[cat.key]}
            expanded={expanded === cat.key}
            onToggle={() => setExpanded(expanded === cat.key ? null : cat.key)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onRescan}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2.5 rounded-lg transition-colors"
        >
          🔄 Rescan
        </button>
      </div>
    </div>
  );
}
