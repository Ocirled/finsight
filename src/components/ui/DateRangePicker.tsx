"use client";

import { useState, useEffect, useRef } from "react";
import {
  startOfMonth, endOfMonth, startOfDay,
  subMonths, subDays,
  isSameDay, isBefore, isAfter, isWithinInterval,
  getDay, getDaysInMonth,
} from "date-fns";

export interface DateRange {
  start: Date;
  end: Date;
}

const DAYS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatDateRange(start: Date, end: Date): string {
  const sm = start.getMonth(), sy = start.getFullYear();
  const em = end.getMonth(), ey = end.getFullYear();
  if (sy === ey && sm === em)
    return `${start.getDate()} – ${end.getDate()} ${MONTHS_ID[sm]} ${sy}`;
  if (sy === ey)
    return `${start.getDate()} ${MONTHS_ID[sm].slice(0, 3)} – ${end.getDate()} ${MONTHS_ID[em].slice(0, 3)} ${sy}`;
  return `${start.getDate()} ${MONTHS_ID[sm].slice(0, 3)} ${sy} – ${end.getDate()} ${MONTHS_ID[em].slice(0, 3)} ${ey}`;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.end.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.end.getMonth());
  const [selecting, setSelecting] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = startOfDay(new Date());

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelecting(null);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function openPicker() {
    setViewYear(value.end.getFullYear());
    setViewMonth(value.end.getMonth());
    setSelecting(null);
    setHovered(null);
    setOpen((o) => !o);
  }

  function applyPreset(start: Date, end: Date) {
    onChange({ start, end });
    setOpen(false);
    setSelecting(null);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    const next = new Date(viewYear, viewMonth + 1, 1);
    if (next > today) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function handleDayClick(day: Date) {
    if (isAfter(day, today)) return;
    if (!selecting) {
      setSelecting(day);
    } else {
      let start = selecting, end = day;
      if (isBefore(end, start)) [start, end] = [end, start];
      onChange({ start, end });
      setOpen(false);
      setSelecting(null);
      setHovered(null);
    }
  }

  const firstDow = (getDay(new Date(viewYear, viewMonth, 1)) + 6) % 7;
  const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth));
  const cells: Array<Date | null> = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  function getDayClass(day: Date): string {
    const base = "h-7 w-full flex items-center justify-center text-xs transition-colors duration-100 ";
    if (isAfter(day, today)) return base + "cursor-not-allowed" + " text-[#dad4c8]";

    const isCommitStart = isSameDay(day, value.start);
    const isCommitEnd = isSameDay(day, value.end);
    const isSelecting = selecting && isSameDay(day, selecting);

    let inPending = false;
    if (selecting && hovered && !isAfter(hovered, today)) {
      const ps = isBefore(hovered, selecting) ? hovered : selecting;
      const pe = isBefore(hovered, selecting) ? selecting : hovered;
      inPending = isWithinInterval(day, { start: ps, end: pe });
    }

    const inCommitted = !selecting && isWithinInterval(day, { start: value.start, end: value.end });

    if (isSelecting || (!selecting && (isCommitStart || isCommitEnd)))
      return base + "bg-[#078a52] text-white font-semibold rounded-lg cursor-pointer";
    if (inPending || inCommitted)
      return base + "bg-[#078a52]/15 text-[#078a52] cursor-pointer";
    if (isSameDay(day, today))
      return base + "text-[#078a52] font-semibold cursor-pointer hover:bg-[#eee9df] rounded-lg";
    return base + "text-[#55534e] cursor-pointer hover:bg-[#eee9df] hover:text-black rounded-lg";
  }

  const isNextDisabled = new Date(viewYear, viewMonth + 1, 1) > today;

  const presets: Array<{ label: string; fn: () => void }> = [
    { label: "Bulan ini", fn: () => applyPreset(startOfMonth(today), endOfMonth(today)) },
    { label: "Bulan lalu", fn: () => { const d = subMonths(today, 1); applyPreset(startOfMonth(d), endOfMonth(d)); } },
    { label: "7 hari terakhir", fn: () => applyPreset(subDays(today, 6), today) },
    { label: "30 hari terakhir", fn: () => applyPreset(subDays(today, 29), today) },
    { label: "90 hari terakhir", fn: () => applyPreset(subDays(today, 89), today) },
    { label: "3 bulan terakhir", fn: () => applyPreset(startOfMonth(subMonths(today, 2)), endOfMonth(today)) },
    { label: "6 bulan terakhir", fn: () => applyPreset(startOfMonth(subMonths(today, 5)), endOfMonth(today)) },
  ];

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={openPicker}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer hover:bg-[#eee9df]"
        style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#9f9b93" }} className="shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className="whitespace-nowrap">{formatDateRange(value.start, value.end)}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#9f9b93" }} className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 flex overflow-hidden max-w-[calc(100vw-1rem)]"
          style={{
            background: "#ffffff",
            border: "1px solid #dad4c8",
            borderRadius: "16px",
            boxShadow: "rgba(0,0,0,0.12) 0px 8px 24px, rgba(0,0,0,0.04) 0px 1px 2px",
          }}
        >
          {/* Presets */}
          <div className="p-2 flex flex-col gap-0.5 min-w-[148px]" style={{ borderRight: "1px solid #dad4c8" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider px-2 pt-1 pb-1.5" style={{ color: "#9f9b93", letterSpacing: "0.09em" }}>
              Rentang cepat
            </p>
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={p.fn}
                className="px-2.5 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer whitespace-nowrap hover:bg-[#eee9df]"
                style={{ color: "#55534e" }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3 w-64">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={prevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[#eee9df]"
                style={{ color: "#9f9b93" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="text-sm font-semibold">{MONTHS_ID[viewMonth]} {viewYear}</span>
              <button
                onClick={nextMonth}
                disabled={isNextDisabled}
                className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer hover:bg-[#eee9df]"
                style={{ color: "#9f9b93" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_ID.map((d) => (
                <div key={d} className="h-7 flex items-center justify-center text-[10px] font-semibold" style={{ color: "#9f9b93" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="space-y-0.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-0.5">
                  {week.map((day, di) =>
                    !day ? (
                      <div key={di} className="h-7" />
                    ) : (
                      <button
                        key={di}
                        disabled={isAfter(day, today)}
                        onClick={() => handleDayClick(day)}
                        onMouseEnter={() => selecting && setHovered(day)}
                        onMouseLeave={() => setHovered(null)}
                        className={getDayClass(day)}
                      >
                        {day.getDate()}
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>

            {/* Status bar */}
            <div className="mt-3 pt-2.5 min-h-[28px] flex items-center justify-center" style={{ borderTop: "1px solid #dad4c8" }}>
              {selecting ? (
                <p className="text-xs font-medium" style={{ color: "#078a52" }}>Klik tanggal akhir</p>
              ) : (
                <p className="text-xs" style={{ color: "#9f9b93" }}>{formatDateRange(value.start, value.end)}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
