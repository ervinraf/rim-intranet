"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, CheckCircle2, Circle, UserPlus, ChevronDown, ChevronRight, Trash2, ClipboardList } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface OnboardingItem {
  id: string
  category: string
  label: string
  done: boolean
  doneAt?: string | null
  notes?: string | null
}

interface Onboarding {
  id: string
  startDate: string
  completedAt?: string | null
  notes?: string | null
  employee: {
    id: string
    fullName: string
    position?: string | null
    photoUrl?: string | null
    hireDate?: string | null
    department?: { name: string } | null
  }
  items: OnboardingItem[]
}

interface Props {
  onboardings: Onboarding[]
  availableEmployees: {
    id: string
    fullName: string
    hireDate?: string | null
    department?: { name: string } | null
  }[]
  isAdmin: boolean
}

function progressColor(pct: number) {
  if (pct >= 100) return "bg-green-500"
  if (pct >= 60) return "bg-amber-400"
  return "bg-blue-500"
}

function groupByCategory(items: OnboardingItem[]) {
  const map: Record<string, OnboardingItem[]> = {}
  for (const item of items) {
    if (!map[item.category]) map[item.category] = []
    map[item.category].push(item)
  }
  return map
}

export function NuevoIngresoClient({ onboardings: initial, availableEmployees, isAdmin }: Props) {
  const [onboardings, setOnboardings] = useState<Onboarding[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ employeeId: "", startDate: new Date().toISOString().slice(0, 10), notes: "" })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [togglingItem, setTogglingItem] = useState<string | null>(null)

  const stats = useMemo(() => ({
    total: onboardings.length,
    completos: onboardings.filter((o) => !!o.completedAt).length,
    enProgreso: onboardings.filter((o) => !o.completedAt).length,
  }), [onboardings])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const created = await res.json()
      setOnboardings((p) => [created, ...p])
      setShowForm(false)
      setForm({ employeeId: "", startDate: new Date().toISOString().slice(0, 10), notes: "" })
      setExpandedId(created.id)
    } else {
      const d = await res.json()
      alert(d.error ?? "Error al crear")
    }
    setSaving(false)
  }

  async function toggleItem(onboardingId: string, itemId: string) {
    setTogglingItem(itemId)
    const res = await fetch(`/api/onboarding/${onboardingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    })
    if (res.ok) {
      const updatedItem = await res.json()
      setOnboardings((prev) =>
        prev.map((o) => {
          if (o.id !== onboardingId) return o
          const newItems = o.items.map((it) => it.id === itemId ? { ...it, ...updatedItem } : it)
          const allDone = newItems.every((it) => it.done)
          return { ...o, items: newItems, completedAt: allDone ? new Date().toISOString() : null }
        })
      )
    }
    setTogglingItem(null)
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este proceso de nuevo ingreso?")) return
    const res = await fetch(`/api/onboarding/${id}`, { method: "DELETE" })
    if (res.ok) setOnboardings((p) => p.filter((o) => o.id !== id))
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Nuevo Ingreso</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Checklist de onboarding por empleado
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <UserPlus className="w-4 h-4 mr-1.5" />Nuevo ingreso
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-slate-900" },
          { label: "En progreso", value: stats.enProgreso, color: "text-blue-600" },
          { label: "Completados", value: stats.completos, color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* New onboarding form */}
      {showForm && isAdmin && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Empleado *</Label>
                  <Select value={form.employeeId} onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v ?? "" }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees.length === 0 && (
                        <SelectItem value="__none__" disabled>Todos los empleados ya tienen ingreso</SelectItem>
                      )}
                      {availableEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de inicio *</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Observaciones generales..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving || !form.employeeId}>
                  {saving ? "Creando..." : "Crear checklist"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Onboarding list */}
      {onboardings.length === 0 && (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Sin procesos de nuevo ingreso</p>
          {isAdmin && (
            <p className="text-xs text-slate-400 mt-1">Crea uno con el boton "Nuevo ingreso"</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {onboardings.map((o) => {
          const done = o.items.filter((i) => i.done).length
          const total = o.items.length
          const pct = total > 0 ? Math.round((done / total) * 100) : 0
          const isExpanded = expandedId === o.id
          const byCategory = groupByCategory(o.items)

          return (
            <div key={o.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* Card header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : o.id)}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-900 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {o.employee.photoUrl ? (
                    <img src={o.employee.photoUrl} alt={o.employee.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <>{o.employee.fullName.slice(0, 2).toUpperCase()}</>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 text-sm">{o.employee.fullName}</p>
                    {o.completedAt ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">Completado</Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">En progreso</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {o.employee.department?.name ?? "Sin departamento"} · Inicio:{" "}
                    {format(new Date(o.startDate), "d 'de' MMMM yyyy", { locale: es })}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progressColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">{done}/{total}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(o.id) }}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Checklist (expanded) */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                  {o.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg px-3 py-2">{o.notes}</p>
                  )}
                  {Object.entries(byCategory).map(([cat, items]) => {
                    const catDone = items.filter((i) => i.done).length
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{cat}</p>
                          <span className="text-xs text-slate-400">{catDone}/{items.length}</span>
                        </div>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                                item.done ? "bg-green-50" : "bg-slate-50 hover:bg-slate-100"
                              } ${isAdmin ? "cursor-pointer" : ""}`}
                              onClick={() => isAdmin && togglingItem !== item.id && toggleItem(o.id, item.id)}
                            >
                              {item.done ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${item.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                                  {item.label}
                                </span>
                                {item.doneAt && (
                                  <span className="text-xs text-green-500 ml-2">
                                    {format(new Date(item.doneAt), "d MMM", { locale: es })}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
