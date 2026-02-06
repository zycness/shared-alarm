import type { Extension } from "@shared-alarm/shared";
import { t } from "../i18n";

interface ExtensionHistoryProps {
  extensions: Extension[];
}

export function ExtensionHistory({ extensions }: ExtensionHistoryProps) {
  if (extensions.length === 0) {
    return (
      <div className="text-center py-4 text-white/20 text-sm">
        {t("noExtensionsYet")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-indigo-300/60 uppercase tracking-widest">
        {t("extensionHistory")}
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {extensions.map((ext) => {
          const isReduction = ext.extensionMinutes < 0;
          return (
            <div key={ext.id} className="glass-light rounded-xl p-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-white/80 text-sm">{ext.extendedByName}</span>
                <span className={`font-bold text-sm ${isReduction ? "text-rose-400" : "text-emerald-400"}`}>
                  {ext.extensionMinutes > 0 ? "+" : ""}{ext.extensionMinutes} {t("minUnit")}
                </span>
              </div>
              <div className="text-xs text-white/25 mt-1">
                {new Date(ext.createdAt).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
