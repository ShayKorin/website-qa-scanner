import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Search } from "lucide-react";

export default function App() {
  const [report, setReport] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setReport(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab found");

      // Inject content script into the page
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-script.js"],
      });

      // Wait a moment for injection then send scan message
      await new Promise(r => setTimeout(r, 100));
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: "scan" });
      if (response) {
        setReport(response);
      } else {
        throw new Error("Scan failed - no response from page");
      }
    } catch (err) {
      console.error("Scan error:", err);
      setError(err.message || "Failed to scan page. Try refreshing the page first.");
    } finally {
      setScanning(false);
    }
  };

  // Calculate overall score
  const categories = ["seo", "accessibility", "performance", "security", "content", "mobile", "bestPractices"];
  const scores = categories.map(c => report?.[c]?.score || 0);
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  const totalIssues = categories.reduce((sum, c) => sum + (report[c]?.issues?.length || 0), 0);
  const criticalCount = categories.reduce((sum, c) => 
    sum + (report[c]?.issues?.filter(i => i.severity === "critical")?.length || 0), 0);

  return (
    <div className="w-[400px] min-h-[520px] bg-background text-foreground">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Search className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">Website QA Scanner</h1>
            <p className="text-xs text-muted-foreground">Base44</p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md font-medium disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Scan"}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="m-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-destructive font-medium">Scan failed</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {scanning && (
        <div className="p-8 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Analyzing page...</p>
        </div>
      )}

      {/* Empty state */}
      {!report && !scanning && !error && (
        <div className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">Scan any webpage</p>
            <p className="text-xs text-muted-foreground mt-1">
              Get instant analysis for SEO, accessibility, performance, security, and more
            </p>
          </div>
        </div>
      )}

      {/* Report */}
      {report && !scanning && (
        <div className="p-3 space-y-2">
          {/* Overall score card */}
          <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ 
                backgroundColor: overallScore >= 80 ? '#dcfce7' : overallScore >= 50 ? '#fef9c3' : '#fee2e2',
                color: overallScore >= 80 ? '#166534' : overallScore >= 50 ? '#854d0e' : '#991b1b'
              }}
            >
              {overallScore}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Overall Score</p>
              <p className="text-xs text-muted-foreground truncate">{report.url}</p>
              <div className="flex gap-2 mt-1">
                {totalIssues > 0 && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {totalIssues} issues
                  </span>
                )}
                {criticalCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                    {criticalCount} critical
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Category accordion */}
          <div className="space-y-1">
            {categories.map((cat) => (
              <CategorySection 
                key={cat} 
                category={cat} 
                data={report[cat]} 
              />
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={handleScan}
            className="w-full mt-2 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Scan Again
          </button>
        </div>
      )}
    </div>
  );
}

function CategorySection({ category, data }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!data) return null;
  
  const { issues = [], passes = [], score = 0 } = data;
  
  const categoryLabels = {
    seo: { label: "SEO", icon: "🔍" },
    accessibility: { label: "Accessibility", icon: "♿" },
    performance: { label: "Performance", icon: "⚡" },
    security: { label: "Security", icon: "🔒" },
    content: { label: "Content", icon: "📝" },
    mobile: { label: "Mobile", icon: "📱" },
    bestPractices: { label: "Best Practices", icon: "✅" },
  };
  
  const { label, icon } = categoryLabels[category];
  
  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-left text-sm font-medium">{label}</span>
        <span className={`text-sm font-semibold ${scoreColor}`}>{score}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      
      {isOpen && (
        <div className="px-3 pb-3 border-t pt-2 space-y-2">
          {/* Issues */}
          {issues.map((issue, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded flex items-start gap-2 ${
                issue.severity === "critical" 
                  ? "bg-red-50 text-red-700 border border-red-200" 
                  : issue.severity === "warning"
                  ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{issue.message}</span>
            </div>
          ))}
          
          {/* Passed checks */}
          {passes.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Passed</p>
              {passes.map((pass, i) => (
                <div key={i} className="text-xs text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {pass}
                </div>
              ))}
            </div>
          )}
          
          {issues.length === 0 && passes.length === 0 && (
            <p className="text-xs text-muted-foreground">No checks for this category.</p>
          )}
        </div>
      )}
    </div>
  );
}