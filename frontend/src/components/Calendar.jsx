import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Video, User } from "lucide-react";
import { Button, cn } from "./Primitives";

export function Calendar({ events = [], onEventClick }) {
  const [view, setView] = useState("month"); // 'month' | 'week' | 'agenda'
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Helper to format date
  const formattedMonthYear = useMemo(() => {
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [currentDate]);

  // Generate Month Grid Dates
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const grid = [];
    // Previous Month's trailing days
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false,
      });
    }

    // Current Month days
    for (let i = 1; i <= totalDays; i++) {
      grid.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next Month's leading days to complete grid (multiples of 7)
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      grid.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return grid;
  }, [currentDate]);

  // Generate Week Grid Dates (Sunday to Saturday around current date)
  const weekGrid = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day); // move to Sunday

    const grid = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      grid.push(date);
    }
    return grid;
  }, [currentDate]);

  // Filter events matching specific day
  const getEventsForDate = (date) => {
    return events.filter(e => {
      const eDate = new Date(e.date || e.time || e.scheduled_at);
      return (
        eDate.getDate() === date.getDate() &&
        eDate.getMonth() === date.getMonth() &&
        eDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (view === "month") next.setMonth(next.getMonth() - 1);
    else if (view === "week") next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (view === "month") next.setMonth(next.getMonth() + 1);
    else if (view === "week") next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  return (
    <div className="border border-line-strong bg-paper p-6 shadow-sm space-y-4">
      {/* Calendar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="flex border border-line-strong font-mono">
            <button
              onClick={() => setView("month")}
              className={cn("px-3 py-1.5 text-xs hover:bg-bone-200 uppercase", view === "month" && "bg-ink text-bone hover:bg-ink")}
            >
              Month
            </button>
            <button
              onClick={() => setView("week")}
              className={cn("px-3 py-1.5 text-xs border-l border-line-strong hover:bg-bone-200 uppercase", view === "week" && "bg-ink text-bone hover:bg-ink")}
            >
              Week
            </button>
            <button
              onClick={() => setView("agenda")}
              className={cn("px-3 py-1.5 text-xs border-l border-line-strong hover:bg-bone-200 uppercase", view === "agenda" && "bg-ink text-bone hover:bg-ink")}
            >
              Agenda
            </button>
          </div>
          <span className="font-display text-lg tracking-tight uppercase">{formattedMonthYear}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="p-2 h-9 w-9 justify-center" onClick={handlePrev}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" className="h-9 text-xs font-mono" onClick={() => setCurrentDate(new Date())}>
            TODAY
          </Button>
          <Button variant="outline" className="p-2 h-9 w-9 justify-center" onClick={handleNext}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* 1. Month View */}
      {view === "month" && (
        <div className="grid grid-cols-7 border-t border-l border-line-strong">
          {/* Days Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="p-3 text-center border-r border-b border-line-strong bg-bone-100 font-mono text-[10px] text-ink/60 uppercase tracking-widest">
              {d}
            </div>
          ))}
          {/* Calendar Grid */}
          {monthGrid.map(({ date, isCurrentMonth }, i) => {
            const dayEvents = getEventsForDate(date);
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[100px] p-2 border-r border-b border-line-strong bg-paper flex flex-col justify-between transition-colors",
                  !isCurrentMonth && "bg-bone-50/50 text-ink/30",
                  isToday && "bg-accent/[0.02]"
                )}
              >
                <span className={cn("font-mono text-xs font-semibold px-1.5 py-0.5 rounded", isToday && "bg-accent text-bone")}>
                  {date.getDate()}
                </span>
                <div className="space-y-1 mt-2 flex-1 overflow-y-auto max-h-[70px]">
                  {dayEvents.map((e, idx) => (
                    <div
                      key={idx}
                      onClick={() => onEventClick && onEventClick(e)}
                      className="text-[9px] font-mono p-1 border border-line-strong bg-bone truncate cursor-pointer hover:bg-accent hover:text-bone hover:border-accent transition-colors uppercase tracking-tight"
                      title={e.title || e.company}
                    >
                      {e.time ? `${e.time.split(" ")[0]} ` : ""}{e.title || e.company}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Week View */}
      {view === "week" && (
        <div className="grid grid-cols-7 border-t border-l border-line-strong">
          {weekGrid.map((date, i) => {
            const dayEvents = getEventsForDate(date);
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[300px] border-r border-b border-line-strong p-3 flex flex-col bg-paper",
                  isToday && "bg-accent/[0.01]"
                )}
              >
                <div className="text-center pb-2 border-b border-line font-mono">
                  <div className="text-[10px] text-ink/50 uppercase tracking-widest">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <span className={cn("inline-block text-sm font-bold mt-1 px-2 py-0.5 rounded", isToday && "bg-accent text-bone")}>
                    {date.getDate()}
                  </span>
                </div>
                <div className="space-y-2 mt-3 flex-1 overflow-y-auto">
                  {dayEvents.map((e, idx) => (
                    <div
                      key={idx}
                      onClick={() => onEventClick && onEventClick(e)}
                      className="border border-line-strong p-2.5 bg-bone hover:bg-ink hover:text-bone hover:border-ink transition-colors cursor-pointer group"
                    >
                      <div className="font-display text-[11px] leading-tight uppercase font-semibold">
                        {e.title || e.company}
                      </div>
                      <div className="font-mono text-[9px] opacity-70 flex items-center gap-1 mt-1.5">
                        <Clock size={10} /> {e.time || e.scheduled_at?.split("T")[1]?.slice(0, 5) || "ALL DAY"}
                      </div>
                      {e.meeting_link && (
                        <div className="font-mono text-[9px] text-accent group-hover:text-bone flex items-center gap-1 mt-1">
                          <Video size={10} /> LINK ATTACHED
                        </div>
                      )}
                    </div>
                  ))}
                  {dayEvents.length === 0 && (
                    <div className="text-[10px] font-mono text-ink/30 text-center pt-8">
                      NO EVENTS
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Agenda View */}
      {view === "agenda" && (
        <div className="border border-line-strong divide-y divide-line-strong bg-paper">
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-ink/40">
              NO SCHEDULED EVENTS FOUND.
            </div>
          ) : (
            [...events]
              .sort((a, b) => new Date(a.date || a.scheduled_at) - new Date(b.date || b.scheduled_at))
              .map((e, idx) => {
                const date = new Date(e.date || e.scheduled_at);
                return (
                  <div
                    key={idx}
                    onClick={() => onEventClick && onEventClick(e)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-bone-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-bone-200 border border-line-strong p-3 text-center min-w-[70px] font-mono">
                        <div className="text-[10px] text-ink/50 uppercase tracking-widest">
                          {date.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div className="text-xl font-bold tracking-tight mt-0.5">
                          {date.getDate()}
                        </div>
                        <div className="text-[9px] text-ink/60 uppercase">
                          {date.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-display text-base tracking-tight uppercase font-semibold">
                          {e.title || e.company}
                        </div>
                        <div className="text-xs text-ink-500 font-serif flex items-center gap-1.5">
                          <User size={12} className="text-ink/40" /> {e.student_name || e.interviewer || "Campus Round"}
                        </div>
                        <div className="font-mono text-[10px] text-ink/60 flex items-center gap-1">
                          <Clock size={11} className="text-ink/40" /> {e.time || e.scheduled_at?.split("T")[1]?.slice(0, 5) || "ALL DAY"}
                        </div>
                      </div>
                    </div>
                    {e.meeting_link && (
                      <a
                        href={e.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="self-start md:self-center inline-flex items-center gap-2 border border-accent bg-accent/5 hover:bg-accent hover:text-bone px-3 py-1.5 font-mono text-[10px] text-accent tracking-wider uppercase transition-colors"
                      >
                        <Video size={12} /> ENTER MEETING ROOM
                      </a>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
