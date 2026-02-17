export default function Header() {
  return (
    <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
        QA
      </div>
      <div>
        <h1 className="text-base font-semibold text-white">Website QA Scanner</h1>
        <p className="text-xs text-gray-500">Powered by Base44</p>
      </div>
    </div>
  );
}
