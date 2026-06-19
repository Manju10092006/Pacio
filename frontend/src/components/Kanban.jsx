import React from "react";
import { ArrowRight, Briefcase, Calendar } from "lucide-react";
import { Badge } from "./Primitives";

export function Kanban({
  items = [],
  columns = ["Applied", "Shortlisted", "Assessment", "Interview", "Selected", "Rejected"],
  onStageChange,
  onItemClick,
}) {
  // Group items by their stage/status
  const groupedItems = React.useMemo(() => {
    const groups = {};
    columns.forEach(col => {
      groups[col] = [];
    });
    items.forEach(item => {
      const stage = item.stage || item.status || "Applied";
      if (groups[stage]) {
        groups[stage].push(item);
      } else {
        // Fallback matching
        const matched = columns.find(col => col.toLowerCase() === stage.toLowerCase());
        if (matched) groups[matched].push(item);
        else if (groups["Applied"]) groups["Applied"].push(item);
      }
    });
    return groups;
  }, [items, columns]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
      {columns.map(col => {
        const colItems = groupedItems[col] || [];
        return (
          <div key={col} className="command-shell p-3 min-w-[220px] flex flex-col min-h-[480px]">
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-line-strong pb-2 mb-3">
              <span className="font-mono text-xs font-bold tracking-widest uppercase text-ink/75">{col}</span>
              <span className="font-mono text-[10px] bg-[var(--signal-soft)] text-[var(--signal)] border border-[rgba(0,167,167,.25)] rounded-full px-2 py-0.5">{colItems.length}</span>
            </div>

            {/* Column Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {colItems.map(item => (
                <div
                  key={item._id || item.id}
                  onClick={() => onItemClick && onItemClick(item)}
                  className="editorial p-4 hover:border-accent cursor-pointer transition-all bg-paper group relative"
                >
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-1">
                      <div className="font-display text-sm font-semibold tracking-tight uppercase group-hover:text-accent transition-colors truncate">
                        {item.student_name || item.name || "Student"}
                      </div>
                      <Badge variant="outline" className="text-[8px] px-1 py-0.2 shrink-0">
                        {item.role || item.department || "CSE"}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-ink-500 font-serif flex items-center gap-1">
                      <Briefcase size={10} className="opacity-40" /> {item.job_title || item.company || "Job Drive"}
                    </div>

                    {item.scheduled_at && (
                      <div className="font-mono text-[9px] text-ink/50 flex items-center gap-1 pt-1 border-t border-line">
                        <Calendar size={10} /> {new Date(item.scheduled_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Stage Move Controls */}
                  {onStageChange && (
                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-line justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] font-mono text-ink/40 mr-auto uppercase">MOVE STATE</span>
                      {columns
                        .filter(c => c !== col)
                        .slice(0, 2) // show next 2 potential moves
                        .map(nextCol => (
                          <button
                            key={nextCol}
                            onClick={e => {
                              e.stopPropagation();
                              onStageChange(item, nextCol);
                            }}
                            className="p-1 rounded-[6px] hover:bg-bone-200 border border-line-strong hover:border-ink text-[8px] font-mono uppercase tracking-wider flex items-center gap-0.5"
                          >
                            {nextCol.slice(0, 3)} <ArrowRight size={8} />
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              {colItems.length === 0 && (
                <div className="text-[10px] font-mono text-ink/35 text-center py-12 border border-dashed border-line rounded-[8px] bg-white/35">
                  DRAG OR UPDATE ITEMS HERE
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
