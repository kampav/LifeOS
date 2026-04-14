"use client";
/**
 * CoachResponse — renders structured CoachResponse JSON from the supervisor.
 * Falls back to plain text if the message is not valid JSON.
 * Uses framer-motion → must be loaded with dynamic(ssr:false).
 */
import dynamic from "next/dynamic";

export interface MetricTile {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
  unit?: string;
}

export interface CoachSection {
  type: "insight" | "data" | "list" | "question" | "warning" | "success";
  title?: string;
  content: string;
  items?: string[];
  metrics?: MetricTile[];
}

export interface QuickAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface CoachResponseType {
  sections: CoachSection[];
  quick_actions?: QuickAction[];
  created_items?: Record<string, unknown>[];
  domain?: string;
  model_used?: string;
}

interface Props {
  message: string;
  onQuickAction?: (action: QuickAction) => void;
}

const SECTION_STYLES: Record<string, string> = {
  insight: "border-l-4 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
  data: "border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-950/30",
  list: "border-l-4 border-purple-400 bg-purple-50 dark:bg-purple-950/30",
  question: "border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30",
  warning: "border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-sm",
  success: "border-l-4 border-green-400 bg-green-50 dark:bg-green-950/30",
};

const TREND_ICONS: Record<string, string> = { up: "↑", down: "↓", flat: "→" };

function SectionBlock({ section }: { section: CoachSection }) {
  const cls = SECTION_STYLES[section.type] || SECTION_STYLES.insight;
  return (
    <div className={`rounded-r-lg p-3 mb-2 ${cls}`}>
      {section.title && (
        <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
          {section.title}
        </p>
      )}
      <p className="text-sm whitespace-pre-wrap">{section.content}</p>
      {section.items && section.items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {section.items.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="mt-1 text-xs">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {section.metrics && section.metrics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {section.metrics.map((m, i) => (
            <div key={i} className="bg-white/60 dark:bg-white/10 rounded px-2 py-1 text-xs">
              <span className="font-semibold">{m.value}{m.unit}</span>
              {m.trend && <span className="ml-1 opacity-60">{TREND_ICONS[m.trend]}</span>}
              <span className="ml-1 opacity-60">{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActionsBar({ actions, onAction }: { actions: QuickAction[]; onAction?: (a: QuickAction) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => onAction?.(a)}
          className="text-xs px-3 py-1 rounded-full border border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-950 transition"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

function CreatedItemsBanner({ items }: { items: Record<string, unknown>[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 bg-green-50 dark:bg-green-950/30 rounded p-2 text-xs text-green-700 dark:text-green-300">
      ✓ Created: {items.map((it) => String((it as { title?: string }).title || "item")).join(", ")}
    </div>
  );
}

function CoachResponseInner({ message, onQuickAction }: Props) {
  let parsed: CoachResponseType | null = null;
  try {
    const data = JSON.parse(message);
    if (data.sections && Array.isArray(data.sections)) {
      parsed = data as CoachResponseType;
    }
  } catch {
    // plain text
  }

  if (!parsed) {
    return <p className="text-sm whitespace-pre-wrap">{message}</p>;
  }

  return (
    <div>
      {parsed.sections.map((s, i) => (
        <SectionBlock key={i} section={s} />
      ))}
      {parsed.quick_actions && parsed.quick_actions.length > 0 && (
        <QuickActionsBar actions={parsed.quick_actions} onAction={onQuickAction} />
      )}
      {parsed.created_items && parsed.created_items.length > 0 && (
        <CreatedItemsBanner items={parsed.created_items} />
      )}
    </div>
  );
}

// Export as dynamic(ssr:false) — uses framer-motion indirectly via parent
export default dynamic(() => Promise.resolve(CoachResponseInner), { ssr: false });
