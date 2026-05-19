"use client"

import { useMemo, useState } from "react"
import { differenceInDays, format, addDays, startOfDay, isWeekend } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Project {
  id: string
  name: string
  clientName: string
  status: "NUEVO" | "EN_DESARROLLO" | "CERRADO"
  startDate: string
  endDate: string | null
  progress: number
}

interface GanttGlobalClientProps {
  projects: Project[]
}

const STATUS_COLORS: Record<string, string> = {
  NUEVO: "bg-blue-500",
  EN_DESARROLLO: "bg-amber-500",
  CERRADO: "bg-emerald-500",
}

const STATUS_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  EN_DESARROLLO: "En desarrollo",
  CERRADO: "Cerrado",
}

const CELL_WIDTH = 32
const ROW_HEIGHT = 56
const NAME_COL = 220

export function GanttGlobalClient({ projects }: GanttGlobalClientProps) {
  const [search, setSearch] = useState("")
  const router = useRouter()

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase())
  )

  const { start, end, days, months, today, todayOffset, totalDays } = useMemo(() => {
    if (!filtered.length) {
      const now = new Date()
      const s = startOfDay(addDays(now, -30))
      const e = startOfDay(addDays(now, 60))
      const totalDays = differenceInDays(e, s) + 1
      const days = Array.from({ length: totalDays }, (_, i) => addDays(s, i))
      return { start: s, end: e, days, months: [], today: startOfDay(now), todayOffset: 30, totalDays }
    }

    const dates = filtered.flatMap((p) => [
      new Date(p.startDate),
      p.endDate ? new Date(p.endDate) : addDays(new Date(p.startDate), 30),
    ])
    const minDate = startOfDay(addDays(new Date(Math.min(...dates.map((d) => d.getTime()))), -7))
    const maxDate = startOfDay(addDays(new Date(Math.max(...dates.map((d) => d.getTime()))), 14))
    const totalDays = differenceInDays(maxDate, minDate) + 1
    const days = Array.from({ length: totalDays }, (_, i) => addDays(minDate, i))
    const today = startOfDay(new Date())
    const todayOffset = differenceInDays(today, minDate)

    const months: { label: string; count: number }[] = []
    let current = ""
    let count = 0
    for (const d of days) {
      const label = format(d, "MMMM yyyy", { locale: es })
      if (label !== current) {
        if (current) months.push({ label: current, count })
        current = label
        count = 1
      } else {
        count++
      }
    }
    if (current) months.push({ label: current, count })

    return { start: minDate, end: maxDate, days, months, today, todayOffset, totalDays }
  }, [filtered])

  function getBarStyle(project: Project) {
    const s = startOfDay(new Date(project.startDate))
    const e = project.endDate
      ? startOfDay(new Date(project.endDate))
      : addDays(s, 30)
    const left = Math.max(differenceInDays(s, start), 0) * CELL_WIDTH
    const width = Math.max((differenceInDays(e, s) + 1) * CELL_WIDTH, CELL_WIDTH * 2)
    return { left, width }
  }

  const totalWidth = totalDays * CELL_WIDTH

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Vista Gantt global</h1>
          <p className="text-slate-500 text-sm mt-1">Todos los proyectos en una linea de tiempo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Nuevo
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block ml-2" /> En desarrollo
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block ml-2" /> Cerrado
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9 max-w-xs"
          placeholder="Buscar proyecto o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">Sin proyectos</p>
          <p className="text-sm mt-1">No hay proyectos que coincidan con la busqueda</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div style={{ minWidth: totalWidth + NAME_COL }}>
            {/* Header meses */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <div className="flex-shrink-0 border-r border-slate-200" style={{ width: NAME_COL }} />
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

            {/* Header dias */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <div
                className="flex-shrink-0 border-r border-slate-200 px-3 py-1.5"
                style={{ width: NAME_COL }}
              >
                <span className="text-xs font-medium text-slate-500">Proyecto</span>
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

            {/* Filas de proyectos */}
            {filtered.map((project) => {
              const { left, width } = getBarStyle(project)
              const colorClass = STATUS_COLORS[project.status]

              return (
                <div
                  key={project.id}
                  className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => router.push(`/dashboard/proyectos/${project.id}`)}
                >
                  {/* Nombre */}
                  <div
                    className="flex-shrink-0 border-r border-slate-200 px-3 flex items-center"
                    style={{ width: NAME_COL }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{project.name}</p>
                      <p className="text-xs text-slate-400 truncate">{project.clientName}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative flex-1" style={{ width: totalWidth }}>
                    {/* Sombreado fines de semana */}
                    {days.map((d, i) =>
                      isWeekend(d) ? (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 bg-slate-50"
                          style={{ left: i * CELL_WIDTH, width: CELL_WIDTH }}
                        />
                      ) : null
                    )}

                    {/* Linea de hoy */}
                    {todayOffset >= 0 && todayOffset < totalDays && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-amber-400 z-10"
                        style={{ left: todayOffset * CELL_WIDTH + CELL_WIDTH / 2 }}
                      />
                    )}

                    {/* Barra del proyecto */}
                    <div
                      className="absolute top-4 rounded-md overflow-hidden shadow-sm"
                      style={{ left, width, height: ROW_HEIGHT - 32 }}
                    >
                      <div className={cn("w-full h-full opacity-20", colorClass)} />
                      <div
                        className={cn("absolute top-0 left-0 h-full transition-all duration-500", colorClass)}
                        style={{ width: `${project.progress}%`, opacity: 0.85 }}
                      />
                      <div className="absolute inset-0 flex items-center px-2 gap-2">
                        <span className="text-white text-xs font-semibold drop-shadow truncate">
                          {project.progress}%
                        </span>
                        {width > 80 && (
                          <span className="text-white text-xs drop-shadow truncate opacity-90">
                            {project.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
