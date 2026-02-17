export default function ScanButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-8 rounded-lg transition-colors text-sm shadow-lg shadow-blue-600/20"
    >
      🔍 Scan This Page
    </button>
  );
}
