import type { Extension } from "@shared-alarm/shared";

interface ExtensionHistoryProps {
  extensions: Extension[];
}

export function ExtensionHistory({ extensions }: ExtensionHistoryProps) {
  if (extensions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        No extensions yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Extension History</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {extensions.map((ext) => (
          <div key={ext.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">{ext.extendedByName}</span>
              <span className="text-blue-600 font-semibold">+{ext.extensionMinutes} min</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(ext.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
