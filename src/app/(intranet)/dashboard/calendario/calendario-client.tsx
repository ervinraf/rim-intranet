"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, getDaysInMonth, startOfMonth, getDay, isSameMonth, parseISO } from "date-fns"
import { es } from "date-fns/locale"

const statusColor: Record<string, string> = {
  NUEVO:         "bg-blue-500",
  EN_DESARROLLO: "bg-amber-500",
  CERRADO:       "bg-green-500",
}

interface Project {
  id: string
  name: string
  clientName: string
  status: string
  startDate: string
  endDate?: string | null
  progress: number
}

export function CalendarioClient({ projects }: { projects: Project[] }) {
  const [current, setCurrent] = useState(new Date())

  const year = current.getFullYear()
  const month = current.getMonth()

  const firstDay = getDay(startOfMonth(current)) // 0=domingo
  const daysInMonth = getDaysInMonth(current)

  function prevMonth() { setCurrent(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrent(new Date(year, month + 1, 1)) }

  function projectsForDay(day: number): Project[] {
    const date = new Date(year, month, day)
    return projects.filter((p) => {
      const start = parseISO(p.startDate)
      const end = p.endDate ? parseISO(p.endDate) : null
      if (end) return date >= start && date <= end
      return date.getFullYear() === start.getFullYear() && date.getMonth() === start.getMonth() && date.getDate() === start.getDate()
    })
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Calendario de Proyectos</h1>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-medium text-slate-700 capitalize w-40 text-center">
            {format(current, "MMMM yyyy", { locale: es })}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-slate-500">
        {Object.entries({ NUEVO: "Nuevo", EN_DESARROLLO: "En desarrollo", CERRADO: "Cerrado" }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColor[k]}`} />
            {v}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Cabecera dias */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-slate-500">{d}</div>
          ))}
        </div>

        {/* Dias */}
        <div className="grid grid-cols-7">
          {blanks.map((b) => (
            <div key={`blank-${b}`} className="min-h-20 border-b border-r border-slate-100 bg-slate-50" />
          ))}
          {days.map((day) => {
            const dayProjects = projectsForDay(day)
            const isToday =
              new Date().getDate() === day &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year

            return (
              <div
                key={day}
                className={`min-h-20 border-b border-r border-slate-100 p-1.5 ${
                  isToday ? "bg-amber-50" : ""
                }`}
              >
                <p className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? "bg-amber-500 text-white" : "text-slate-600"
                }`}>
                  {day}
                </p>
                <div className="space-y-0.5">
                  {dayProjects.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/proyectos/${p.id}`}
                      className={`block px-1.5 py-0.5 rounded text-white text-xs truncate ${statusColor[p.status]} opacity-90 hover:opacity-100`}
                    >
                      {p.name}
                    </Link>
                  ))}
                  {dayProjects.length > 3 && (
                    <p className="text-xs text-slate-400 pl-1">+{dayProjects.length - 3} mas</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lista del mes */}
      {projects.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Proyectos activos este mes</p>
          <div className="space-y-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/proyectos/${p.id}`}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor[p.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.clientName} ·{" "}
                    {format(parseISO(p.startDate), "d MMM", { locale: es })}
                    {p.endDate && ` → ${format(parseISO(p.endDate), "d MMM yyyy", { locale: es })}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">{p.progress}%</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
