"use client"

import { useMemo } from "react"
import { differenceInDays, format, addDays, startOfDay, isWeekend } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  name: string
  startDate: string
  endDate: string
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

const CELL_WIDTH = 36 // px per day
const ROW_HEIGHT = 52

export function GanttChart({
  tasks,
  projectStart,
  projectEnd,
  onProgressChange,
  readOnly = false,
}: GanttChartProps) {
  const start = startOfDay(new Date(projectStart))
  const end = projectEnd
    ? startOfDay(new Date(projectEnd))
    : addDays(
        tasks.reduce(
          (max, t) => {
            const d = new Date(t.endDate)
            return d > max ? d : max
          },
          new Date(projectStart)
        ),
        14
      )

  const totalDays = differenceInDays(end, start) + 1
  const days = Array.from({ length: totalDays }, (_, i) => addDays(start, i))

  // Group days by month for header
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

  function getTaskStyle(task: Task) {
    const taskStart = startOfDay(new Date(task.startDate))
    const taskEnd = startOfDay(new Date(task.endDate))
    const left = differenceInDays(taskStart, start) * CELL_WIDTH
    const width = Math.max((differenceInDays(taskEnd, taskStart) + 1) * CELL_WIDTH, CELL_WIDTH)
    return { left, width }
  }

  const totalWidth = totalDays * CELL_WIDTH

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

        {/* Task rows */}
        {tasks.map((task, idx) => {
          const { left, width } = getTaskStyle(task)
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
                    <p className="text-xs text-slate-400">{task.progress}%</p>
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

                {/* Task bar */}
                <div
                  className="absolute top-3 rounded-md overflow-hidden shadow-sm"
                  style={{ left, width, height: ROW_HEIGHT - 24 }}
                >
                  {/* Background */}
                  <div className={cn("w-full h-full opacity-20", colorClass)} />
                  {/* Progress fill */}
                  <div
                    className={cn("absolute top-0 left-0 h-full transition-all duration-500", colorClass)}
                    style={{ width: `${task.progress}%`, opacity: 0.85 }}
                  />
                  {/* Label */}
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-white text-xs font-medium drop-shadow truncate">
                      {task.name}
                    </span>
                  </div>
                </div>

                {/* Progress slider — solo en modo edicion */}
                {!readOnly && onProgressChange && (
                  <div
                    className="absolute bottom-1"
                    style={{ left: left, width }}
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
