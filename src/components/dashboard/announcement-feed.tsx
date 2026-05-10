"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Pin, X, Megaphone, AlertTriangle, GraduationCap, Star, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

const typeConfig = {
  GENERAL:      { label: "General",      icon: Megaphone,     className: "bg-slate-100 text-slate-600" },
  URGENTE:      { label: "Urgente",      icon: AlertTriangle, className: "bg-red-100 text-red-700" },
  CUMPLEANOS:   { label: "Cumpleanos",   icon: Star,          className: "bg-pink-100 text-pink-700" },
  CAPACITACION: { label: "Capacitacion", icon: GraduationCap, className: "bg-blue-100 text-blue-700" },
  FELICITACION: { label: "Felicitacion", icon: Star,          className: "bg-amber-100 text-amber-700" },
  OPERACIONES:  { label: "Operaciones",  icon: Settings,      className: "bg-violet-100 text-violet-700" },
}

interface Announcement {
  id: string
  title: string
  content: string
  type: keyof typeof typeConfig
  isPinned: boolean
  createdAt: string
  targetDepartment?: { name: string } | null
}

interface Props {
  announcements: Announcement[]
  isAdmin: boolean
  onDelete: (id: string) => void
}

export function AnnouncementFeed({ announcements, isAdmin, onDelete }: Props) {
  async function handleDelete(id: string) {
    await fetch(`/api/announcements/${id}`, { method: "DELETE" })
    onDelete(id)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
        Tablero de avisos
      </p>

      {announcements.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-xs text-slate-400">Sin avisos publicados</p>
        </div>
      )}

      {announcements.map((a) => {
        const cfg = typeConfig[a.type] ?? typeConfig.GENERAL
        const Icon = cfg.icon
        return (
          <div
            key={a.id}
            className={`rounded-xl border p-4 ${
              a.type === "URGENTE"
                ? "border-red-200 bg-red-50"
                : a.isPinned
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {a.isPinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${cfg.className}`}>
                  {cfg.label}
                </span>
                {a.targetDepartment && (
                  <span className="text-xs text-slate-400 truncate">
                    → {a.targetDepartment.name}
                  </span>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-sm font-semibold text-slate-900 mb-1">{a.title}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{a.content}</p>
            <p className="text-xs text-slate-400 mt-2">
              {format(new Date(a.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
            </p>
          </div>
        )
      })}
    </div>
  )
}
