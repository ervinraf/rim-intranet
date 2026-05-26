"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Download, Search, ChevronLeft, ChevronRight, BarChart2, Users, FileSpreadsheet } from "lucide-react"
import { ImportAttendanceModal } from "@/components/attendance/import-attendance-modal"
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
} from "date-fns"
import { es } from "date-fns/locale"
import { downloadCsv } from "@/lib/csv"

type AttendanceType = "NORMAL" | "TARDANZA" | "FALTA" | "VACACIONES" | "PERMISO" | "INCAPACIDAD"
type ViewMode = "dia" | "semana" | "mes"

const typeConfig: Record<AttendanceType, { label: string; color: string; bg: string; chart: string }> = {
  NORMAL:      { label: "Normal",      color: "text-green-700",  bg: "bg-green-100",  chart: "#16a34a" },
  TARDANZA:    { label: "Tardanza",    color: "text-amber-700",  bg: "bg-amber-100",  chart: "#d97706" },
  FALTA:       { label: "Falta",       color: "text-red-700",    bg: "bg-red-100",    chart: "#dc2626" },
  VACACIONES:  { label: "Vacaciones",  color: "text-blue-700",   bg: "bg-blue-100",   chart: "#2563eb" },
  PERMISO:     { label: "Permiso",     color: "text-purple-700", bg: "bg-purple-100", chart: "#7c3aed" },
  INCAPACIDAD: { label: "Incapacidad", color: "text-slate-700",  bg: "bg-slate-100",  chart: "#64748b" },
}

interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn?: string | null
  checkOut?: string | null
  type: AttendanceType
  notes?: string | null
  employee: { fullName: string; position?: string | null; department?: { name: string } | null }
}

interface Props {
  records: AttendanceRecord[]
  employees: { id: string; fullName: string; departmentId?: string | null; department?: { name: string } | null }[]
  departments: { id: string; name: string }[]
  isAdmin: boolean
  currentEmployeeId: string | null
  currentMonth: string
}

// Mini bar chart per employee
function EmployeeChart({ data }: { data: { normal: number; tardanza: number; falta: number; total: number }[] }) {
  const labels: AttendanceType[] = ["NORMAL", "TARDANZA", "FALTA"]
  const values = [data[0]?.normal ?? 0, data[0]?.tardanza ?? 0, data[0]?.falta ?? 0]
  const max = Math.max(...values, 1)
  const barH = 48
  const barW = 28

  return (
    <div className="flex items-end gap-2">
      {labels.map((t, i) => (
        <div key={t} className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold" style={{ color: typeConfig[t].chart }}>{values[i]}</span>
          <div
            className="rounded-t"
            style={{
              width: barW,
              height: Math.max(4, (values[i] / max) * barH),
              background: typeConfig[t].chart,
              opacity: 0.85,
            }}
          />
          <span className="text-[10px] text-slate-400">{typeConfig[t].label}</span>
        </div>
      ))}
    </div>
  )
}

export function AsistenciaClient({
  records: initial, employees, departments, isAdmin, currentEmployeeId, currentMonth,
}: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>(initial)
  const [viewMode, setViewMode] = useState<ViewMode>("mes")
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const [y, m] = currentMonth.split("-").map(Number)
    return new Date(y, m - 1, 1)
  })
  const [search, setSearch] = useState("")
  const [filterDept, setFilterDept] = useState("all")
  const [filterEmployee, setFilterEmployee] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState({
    employeeId: "", date: new Date().toISOString().slice(0, 10),
    checkIn: "", checkOut: "", type: "NORMAL" as AttendanceType, notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  // Date range based on view mode
  const { rangeStart, rangeEnd, periodLabel } = useMemo(() => {
    if (viewMode === "mes") {
      return {
        rangeStart: startOfMonth(currentDate),
        rangeEnd: endOfMonth(currentDate),
        periodLabel: format(currentDate, "MMMM yyyy", { locale: es }),
      }
    }
    if (viewMode === "semana") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
      const we = endOfWeek(currentDate, { weekStartsOn: 1 })
      return {
        rangeStart: ws,
        rangeEnd: we,
        periodLabel: `${format(ws, "d MMM", { locale: es })} – ${format(we, "d MMM yyyy", { locale: es })}`,
      }
    }
    return {
      rangeStart: currentDate,
      rangeEnd: currentDate,
      periodLabel: format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es }),
    }
  }, [viewMode, currentDate])

  function navigate(dir: 1 | -1) {
    if (viewMode === "mes") setCurrentDate((d) => dir === 1 ? addMonths(d, 1) : subMonths(d, 1))
    if (viewMode === "semana") setCurrentDate((d) => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1))
    if (viewMode === "dia") setCurrentDate((d) => dir === 1 ? addDays(d, 1) : subDays(d, 1))
  }

  const filtered = useMemo(() => {
    const startStr = format(rangeStart, "yyyy-MM-dd")
    const endStr = format(rangeEnd, "yyyy-MM-dd")
    return records.filter((r) => {
      const d = r.date.slice(0, 10)
      if (d < startStr || d > endStr) return false
      if (search && !r.employee.fullName.toLowerCase().includes(search.toLowerCase())) return false
      if (filterDept !== "all" && r.employee.department?.name !== filterDept) return false
      if (filterEmployee !== "all" && r.employeeId !== filterEmployee) return false
      return true
    })
  }, [records, rangeStart, rangeEnd, search, filterDept, filterEmployee])

  const stats = useMemo(() => ({
    normal: filtered.filter((r) => r.type === "NORMAL").length,
    tardanza: filtered.filter((r) => r.type === "TARDANZA").length,
    falta: filtered.filter((r) => r.type === "FALTA").length,
    vacaciones: filtered.filter((r) => r.type === "VACACIONES").length,
  }), [filtered])

  // Per-employee stats for chart
  const chartData = useMemo(() => {
    if (!isAdmin) return []
    const map = new Map<string, { name: string; dept: string; normal: number; tardanza: number; falta: number; vacaciones: number; total: number }>()
    for (const r of filtered) {
      const key = r.employeeId
      if (!map.has(key)) map.set(key, { name: r.employee.fullName, dept: r.employee.department?.name ?? "", normal: 0, tardanza: 0, falta: 0, vacaciones: 0, total: 0 })
      const e = map.get(key)!
      e.total++
      if (r.type === "NORMAL") e.normal++
      if (r.type === "TARDANZA") e.tardanza++
      if (r.type === "FALTA") e.falta++
      if (r.type === "VACACIONES") e.vacaciones++
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filtered, isAdmin])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    setFormSuccess(false)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId || currentEmployeeId,
          date: form.date,
          checkIn: form.checkIn || null,
          checkOut: form.checkOut || null,
          type: form.type,
          notes: form.notes || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setRecords((p) => {
          const exists = p.findIndex((r) => r.id === data.id)
          if (exists >= 0) { const n = [...p]; n[exists] = data; return n }
          return [data, ...p]
        })
        setFormSuccess(true)
        setTimeout(() => {
          setShowForm(false)
          setFormSuccess(false)
          setForm({ employeeId: "", date: new Date().toISOString().slice(0, 10), checkIn: "", checkOut: "", type: "NORMAL", notes: "" })
        }, 1200)
      } else {
        const msg = typeof data.error === "string" ? data.error : JSON.stringify(data.error)
        setFormError(msg || "Error al guardar el registro")
      }
    } catch (err: any) {
      setFormError("Error de conexion: " + err.message)
    }
    setLoading(false)
  }

  function exportCsv() {
    const header = ["Empleado", "Departamento", "Fecha", "Entrada", "Salida", "Tipo", "Notas"]
    const rows = filtered.map((r) => [
      r.employee.fullName,
      r.employee.department?.name ?? "",
      r.date.slice(0, 10),
      r.checkIn ? format(new Date(r.checkIn), "HH:mm") : "",
      r.checkOut ? format(new Date(r.checkOut), "HH:mm") : "",
      typeConfig[r.type]?.label ?? r.type,
      r.notes ?? "",
    ])
    downloadCsv([header, ...rows], `asistencia_${format(currentDate, "yyyy-MM")}.csv`)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Control de Asistencia</h1>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">{periodLabel}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChart((v) => !v)}
              className={showChart ? "bg-slate-100" : ""}
            >
              <BarChart2 className="w-4 h-4 mr-1.5" />Grafica
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />Importar Excel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1.5" />Exportar
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-1.5" />
            {isAdmin ? "Registrar" : "Mi asistencia"}
          </Button>
        </div>
      </div>

      {/* View mode + navigation */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm bg-white">
          {(["dia", "semana", "mes"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 capitalize transition-colors ${viewMode === v ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Period navigation */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="p-1 rounded hover:bg-slate-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-700 capitalize min-w-[160px] text-center">
            {periodLabel}
          </span>
          <button type="button" onClick={() => navigate(1)} className="p-1 rounded hover:bg-slate-100">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Normal", value: stats.normal, color: "text-green-600" },
          { label: "Tardanza", value: stats.tardanza, color: "text-amber-600" },
          { label: "Falta", value: stats.falta, color: "text-red-600" },
          { label: "Vacaciones", value: stats.vacaciones, color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart por empleado */}
      {isAdmin && showChart && chartData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-slate-700 mb-4">Asistencia por empleado</p>
          <div className="overflow-x-auto">
            <div className="flex gap-6 min-w-max pb-2">
              {chartData.map((emp) => {
                const max = Math.max(emp.normal, emp.tardanza, emp.falta, 1)
                const barH = 80
                const bars: { type: AttendanceType; val: number }[] = [
                  { type: "NORMAL", val: emp.normal },
                  { type: "TARDANZA", val: emp.tardanza },
                  { type: "FALTA", val: emp.falta },
                ]
                return (
                  <div key={emp.name} className="flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1.5">
                      {bars.map(({ type, val }) => (
                        <div key={type} className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-semibold" style={{ color: typeConfig[type].chart }}>
                            {val}
                          </span>
                          <div
                            className="w-5 rounded-t transition-all"
                            style={{
                              height: Math.max(3, (val / max) * barH),
                              background: typeConfig[type].chart,
                              opacity: 0.8,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-center max-w-[72px]">
                      <p className="text-[10px] font-medium text-slate-700 leading-tight truncate">{emp.name.split(" ")[0]}</p>
                      <p className="text-[9px] text-slate-400 truncate">{emp.name.split(" ")[1] ?? ""}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex gap-4 mt-3 flex-wrap">
            {(["NORMAL", "TARDANZA", "FALTA"] as AttendanceType[]).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: typeConfig[t].chart }} />
                <span className="text-xs text-slate-500">{typeConfig[t].label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              {isAdmin && (
                <div className="space-y-1.5">
                  <Label>Empleado *</Label>
                  <Select value={form.employeeId} onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v ?? "" }))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: (v ?? "NORMAL") as AttendanceType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(typeConfig) as AttendanceType[]).map((t) => (
                      <SelectItem key={t} value={t}>{typeConfig[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Entrada</Label>
                <Input type="time" value={form.checkIn} onChange={(e) => setForm((p) => ({ ...p, checkIn: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Salida</Label>
                <Input type="time" value={form.checkOut} onChange={(e) => setForm((p) => ({ ...p, checkOut: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Observaciones..." />
              </div>
              {formError && (
                <div className="col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="col-span-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  Registro guardado correctamente
                </div>
              )}
              <div className="col-span-2 flex gap-2">
                <Button type="submit" size="sm" disabled={loading || (isAdmin && !form.employeeId && !currentEmployeeId) || (!isAdmin && !currentEmployeeId)}>
                  {loading ? "Guardando..." : "Registrar"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setFormError(null) }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && (
          <>
            <Select value={filterEmployee} onValueChange={(v) => setFilterEmployee(v ?? "all")}>
              <SelectTrigger className="w-52">
                <Users className="w-4 h-4 text-slate-400 mr-1.5 flex-shrink-0" />
                <SelectValue placeholder="Todos los empleados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={(v) => setFilterDept(v ?? "all")}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Records list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">Sin registros en este periodo</p>
        )}
        {filtered.map((r) => {
          const tc = typeConfig[r.type]
          return (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{r.employee.fullName}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(r.date.slice(0, 10) + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                  {r.checkIn && ` · Entrada: ${format(new Date(r.checkIn), "HH:mm")}`}
                  {r.checkOut && ` · Salida: ${format(new Date(r.checkOut), "HH:mm")}`}
                  {r.employee.department && ` · ${r.employee.department.name}`}
                </p>
                {r.notes && <p className="text-xs text-slate-400 mt-0.5">{r.notes}</p>}
              </div>
              <Badge className={`${tc.bg} ${tc.color} text-xs border-0`}>{tc.label}</Badge>
            </div>
          )
        })}
      </div>

      {showImport && (
        <ImportAttendanceModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
