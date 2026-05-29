"use client"

import { useMemo } from "react"
import { differenceInDays, format, addDays, startOfDay, isWeekend } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  name: string
  description?: string | null
  startDate: string
  endDate: string
  actualStartDate?: string | null
  actualEndDate?: string | null
  progress: number
  color?: string | null
}

interface GanttChartProps {
  tasks: Task[]
  projectStart: string
  projectEnd?: string | null
  onProgressChange?: (taskId: string, progress: number) => void
  readOnly?: boolean
}

// Parsea fechas ISO como fecha local (no UTC) para evitar el desfase de timezone
function pd(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

const TASK_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-teal-500",
]

const CELL_WIDTH = 36
const ROW_HEIGHT = 64

export function GanttChart({
  tasks,
  projectStart,
  projectEnd,
  onProgressChange,
  readOnly = false,
}: GanttChartProps) {
  const start = startOfDay(pd(projectStart))
  const end = projectEnd
    ? startOfDay(pd(projectEnd))
    : addDays(
        tasks.reduce(
          (max, t) => {
            const dates = [pd(t.endDate)]
            if (t.actualEndDate) dates.push(pd(t.actualEndDate))
            const latest = dates.reduce((a, b) => (b > a ? b : a))
            return latest > max ? latest : max
          },
          pd(projectStart)
        ),
        14
      )

  const totalDays = differenceInDays(end, start) + 1
  const days = Array.from({ length: totalDays }, (_, i) => addDays(start, i))

  const months = useMemo(() => {
    const map: { label: string; count: number }[] = []
    let current = ""
    let count = 0
    for (const d of days) {
      const label = format(d, "MMMM yyyy", { locale: es })
      if (label !== current) {
        if (current) map.push({ label: current, count })
        current = label
        count = 1
      } else {
        count++
      }
    }
    if (current) map.push({ label: current, count })
    return map
  }, [days])

  const today = startOfDay(new Date())
  const todayOffset = differenceInDays(today, start)
  const totalWidth = totalDays * CELL_WIDTH

  function getBarStyle(dateStart: string, dateEnd: string) {
    const s = startOfDay(pd(dateStart))
    const e = startOfDay(pd(dateEnd))
    const left = differenceInDays(s, start) * CELL_WIDTH
    const width = Math.max((differenceInDays(e, s) + 1) * CELL_WIDTH, CELL_WIDTH)
    return { left, width }
  }

  function getActualColor(task: Task) {
    if (!task.actualEndDate) return "bg-slate-400"
    const plannedEnd = startOfDay(pd(task.endDate))
    const actualEnd = startOfDay(pd(task.actualEndDate))
    const actualStart = task.actualStartDate ? startOfDay(pd(task.actualStartDate)) : null
    const plannedStart = startOfDay(pd(task.startDate))

    if (actualStart && actualStart < plannedStart) return "bg-yellow-400"
    if (actualEnd <= plannedEnd) return "bg-emerald-500"
    return "bg-red-500"
  }

  function getActualLabel(task: Task) {
    if (!task.actualEndDate) return null
    const plannedEnd = startOfDay(pd(task.endDate))
    const actualEnd = startOfDay(pd(task.actualEndDate))
    const diff = differenceInDays(actualEnd, plannedEnd)
    if (diff === 0) return "A tiempo"
    if (diff > 0) return `+${diff}d`
    return `${diff}d`
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div style={{ minWidth: totalWidth + 220 }}>
        {/* Header row 1 — months */}
        <div className="flex border-b border-slate-200">
          <div className="w-52 flex-shrink-0 border-r border-slate-200" />
          <div className="flex">
            {months.map((m, i) => (
              <div
                key={i}
                className="text-xs font-medium text-slate-600 px-2 py-2 border-r border-slate-100 capitalize"
                style={{ width: m.count * CELL_WIDTH }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Header row 2 — days */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="w-52 flex-shrink-0 border-r border-slate-200 px-3 py-1.5">
            <span className="text-xs font-medium text-slate-500">Actividad</span>
          </div>
          <div className="flex">
            {days.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "text-center border-r border-slate-100 py-1",
                  isWeekend(d) ? "bg-slate-100" : "",
                  format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
                    ? "bg-amber-100 text-amber-700 font-semibold"
                    : "text-slate-400"
                )}
                style={{ width: CELL_WIDTH, fontSize: 10 }}
              >
                {format(d, "d")}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-400">Leyenda:</span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-3 h-2 rounded-sm bg-slate-200 border border-slate-300 inline-block" /> Plan
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" /> A tiempo
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-3 h-2 rounded-sm bg-red-500 inline-block" /> Tarde
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-3 h-2 rounded-sm bg-yellow-400 inline-block" /> Adelantado
          </span>
        </div>

        {/* Task rows */}
        {tasks.map((task, idx) => {
          const planStyle = getBarStyle(task.startDate, task.endDate)
          const hasActual = !!(task.actualStartDate || task.actualEndDate)
          const actualStyle = hasActual
            ? getBarStyle(
                task.actualStartDate ?? task.startDate,
                task.actualEndDate ?? task.endDate
              )
            : null
          const actualColor = getActualColor(task)
          const actualLabel = getActualLabel(task)
          const colorClass = task.color ?? TASK_COLORS[idx % TASK_COLORS.length]

          return (
            <div
              key={task.id}
              className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors"
              style={{ height: ROW_HEIGHT }}
            >
              {/* Task name */}
              <div className="w-52 flex-shrink-0 border-r border-slate-200 px-3 flex items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", colorClass)} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{task.name}</p>
                    {task.description && (
                      <p className="text-xs text-slate-500 truncate leading-tight">{task.description}</p>
                    )}
                    <p className="text-xs text-slate-400">{task.progress}%</p>
                    {hasActual && actualLabel && (
                      <p className={cn(
                        "text-xs font-medium",
                        actualLabel === "A tiempo" ? "text-emerald-600" :
                        actualLabel.startsWith("+") ? "text-red-500" : "text-yellow-600"
                      )}>
                        Real: {actualLabel}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline area */}
              <div className="relative flex-1" style={{ width: totalWidth }}>
                {/* Weekend shading */}
                {days.map((d, i) =>
                  isWeekend(d) ? (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 bg-slate-50"
                      style={{ left: i * CELL_WIDTH, width: CELL_WIDTH }}
                    />
                  ) : null
                )}

                {/* Today line */}
                {todayOffset >= 0 && todayOffset < totalDays && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-amber-400 z-10"
                    style={{ left: todayOffset * CELL_WIDTH + CELL_WIDTH / 2 }}
                  />
                )}

                {/* Plan bar */}
                <div
                  className="absolute rounded-md overflow-hidden"
                  title={task.description ?? undefined}
                  style={{
                    left: planStyle.left,
                    width: planStyle.width,
                    top: 8,
                    height: 20,
                  }}
                >
                  <div className="w-full h-full bg-slate-200 border border-slate-300 rounded-md" />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-slate-500 text-xs truncate" style={{ fontSize: 9 }}>
                      PLAN
                    </span>
                  </div>
                </div>

                {/* Real bar */}
                {actualStyle ? (
                  <div
                    className={cn("absolute rounded-md overflow-hidden shadow-sm", actualColor)}
                    style={{
                      left: actualStyle.left,
                      width: actualStyle.width,
                      top: 34,
                      height: 20,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-white text-xs font-medium truncate" style={{ fontSize: 9 }}>
                        REAL
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Progress bar mode when no actual dates */
                  !hasActual && (
                    <div
                      className="absolute rounded-md overflow-hidden shadow-sm"
                      style={{
                        left: planStyle.left,
                        width: planStyle.width,
                        top: 34,
                        height: 20,
                      }}
                    >
                      <div className={cn("w-full h-full opacity-20", colorClass)} />
                      <div
                        className={cn("absolute top-0 left-0 h-full transition-all duration-500", colorClass)}
                        style={{ width: `${task.progress}%`, opacity: 0.85 }}
                      />
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-white text-xs font-medium drop-shadow truncate" style={{ fontSize: 9 }}>
                          {task.progress}%
                        </span>
                      </div>
                    </div>
                  )
                )}

                {/* Progress slider — solo en modo edicion sin fechas reales */}
                {!readOnly && onProgressChange && !hasActual && (
                  <div
                    className="absolute bottom-1"
                    style={{ left: planStyle.left, width: planStyle.width }}
                  >
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={task.progress}
                      onChange={(e) => onProgressChange(task.id, parseInt(e.target.value))}
                      className="w-full h-1 accent-amber-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
