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
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
      {columns.map(col => {
        const colItems = groupedItems[col] || [];
        return (
          <div key={col} className="rounded-[26px] bg-white/62 border border-line p-3 min-w-[220px] flex flex-col min-h-[480px] shadow-[0_18px_45px_-35px_rgba(23,25,28,0.45)]">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3">
              <span className="text-sm font-semibold text-ink/75">{col}</span>
              <span className="rounded-full bg-bone-200 border border-line px-2.5 py-1 text-[11px] font-semibold">{colItems.length}</span>
            </div>

            {/* Column Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {colItems.map(item => (
                <div
                  key={item._id || item.id}
                  onClick={() => onItemClick && onItemClick(item)}
                  className="dashboard-card p-4 hover:border-ink hover:shadow-sm cursor-pointer transition-all bg-white group relative"
                >
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-1">
                      <div className="font-display text-lg leading-tight group-hover:text-accent transition-colors truncate">
                        {item.student_name || item.name || "Student"}
                      </div>
                      <Badge variant="outline" className="text-[8px] px-1 py-0.2 shrink-0">
                        {item.role || item.department || "CSE"}
                      </Badge>
                    </div>

                    <div className="text-[12px] text-ink-500 flex items-center gap-1">
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
                        className="rounded-full px-2 py-1 hover:bg-bone-200 border border-line-strong hover:border-ink text-[10px] font-medium flex items-center gap-0.5"
                          >
                            {nextCol.slice(0, 3)} <ArrowRight size={8} />
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              {colItems.length === 0 && (
                <div className="rounded-[20px] text-[11px] font-medium text-ink/30 text-center py-12 border border-dashed border-line">
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
