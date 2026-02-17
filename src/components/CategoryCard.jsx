import ScoreRing from "./ScoreRing";

const severityStyles = {
  critical: "bg-red-900/30 text-red-400 border-red-800",
  warning: "bg-yellow-900/20 text-yellow-400 border-yellow-800",
  info: "bg-blue-900/20 text-blue-400 border-blue-800",
};

const severityLabels = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

export default function CategoryCard({ category, data, expanded, onToggle }) {
  if (!data) return null;

  const { issues = [], passes = [], score = 0 } = data;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      {/* Header - clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-lg">{category.icon}</span>
        <span className="flex-1 text-left text-sm font-medium text-gray-200">
          {category.label}
        </span>
        <div className="flex items-center gap-2">
          {issues.length > 0 && (
            <span className="text-xs text-gray-500">
              {issues.length} issue{issues.length !== 1 ? "s" : ""}
            </span>
          )}
          <ScoreRing score={score} size={36} />
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Issues */}
          {issues.map((issue, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded border ${severityStyles[issue.severity]}`}
            >
              <span className="font-medium">{severityLabels[issue.severity]}:</span>{" "}
              {issue.message}
            </div>
          ))}

          {/* Passes */}
          {passes.length > 0 && (
            <div className="space-y-1 mt-2">
              <div className="text-xs text-gray-500 font-medium">Passed</div>
              {passes.map((pass, i) => (
                <div key={i} className="text-xs text-green-500/70 flex items-center gap-1.5">
                  <span>✓</span> {pass}
                </div>
              ))}
            </div>
          )}

          {issues.length === 0 && passes.length === 0 && (
            <p className="text-xs text-gray-500">No issues or checks for this category.</p>
          )}
        </div>
      )}
    </div>
  );
}
