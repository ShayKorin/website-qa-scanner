import { useState } from "react";
import ScanButton from "./components/ScanButton";
import Report from "./components/Report";
import Header from "./components/Header";

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

      // Inject content script if needed and send scan message
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-script.js"],
      });

      const response = await chrome.tabs.sendMessage(tab.id, { action: "scan" });
      if (response) {
        setReport(response);
      } else {
        throw new Error("No response from content script");
      }
    } catch (err) {
      setError(err.message || "Failed to scan page");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="w-[420px] min-h-[500px] max-h-[600px] overflow-y-auto bg-gray-950 text-gray-100">
      <Header />
      {!report && !scanning && (
        <div className="p-6 flex flex-col items-center gap-4">
          <p className="text-gray-400 text-center text-sm">
            Scan the current page for SEO, accessibility, performance, security, and more.
          </p>
          <ScanButton onClick={handleScan} />
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm w-full">
              {error}
            </div>
          )}
        </div>
      )}
      {scanning && (
        <div className="p-6 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Scanning page...</p>
        </div>
      )}
      {report && <Report report={report} onRescan={handleScan} />}
    </div>
  );
}
