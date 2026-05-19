"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Download, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns"
import { es } from "date-fns/locale"
import { downloadCsv } from "@/lib/csv"

type AttendanceType = "NORMAL" | "TARDANZA" | "FALTA" | "VACACIONES" | "PERMISO" | "INCAPACIDAD"

const typeConfig: Record<AttendanceType, { label: string; color: string; bg: string }> = {
  NORMAL:      { label: "Normal",      color: "text-green-700",  bg: "bg-green-100" },
  TARDANZA:    { label: "Tardanza",    color: "text-amber-700",  bg: "bg-amber-100" },
  FALTA:       { label: "Falta",       color: "text-red-700",    bg: "bg-red-100" },
  VACACIONES:  { label: "Vacaciones",  color: "text-blue-700",   bg: "bg-blue-100" },
  PERMISO:     { label: "Permiso",     color: "text-purple-700", bg: "bg-purple-100" },
  INCAPACIDAD: { label: "Incapacidad", color: "text-slate-700",  bg: "bg-slate-100" },
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

export function AsistenciaClient({ records: initial, employees, departments, isAdmin, currentEmployeeId, currentMonth }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>(initial)
  const [month, setMonth] = useState(currentMonth)
  const [search, setSearch] = useState("")
  const [filterDept, setFilterDept] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    employeeId: "", date: new Date().toISOString().slice(0, 10),
    checkIn: "", checkOut: "", type: "NORMAL" as AttendanceType, notes: "",
  })
  const [loading, setLoading] = useState(false)

  const [y, m] = month.split("-").map(Number)
  const daysInMonth = getDaysInMonth(new Date(y, m - 1))

  function prevMonth() {
    const d = new Date(y, m - 2)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  function nextMonth() {
    const d = new Date(y, m)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search && !r.employee.fullName.toLowerCase().includes(search.toLowerCase())) return false
      if (filterDept !== "all" && r.employee.department?.name !== filterDept) return false
      return true
    })
  }, [records, search, filterDept])

  const byEmployee = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {}
    for (const r of filtered) {
      if (!map[r.employeeId]) map[r.employeeId] = []
      map[r.employeeId].push(r)
    }
    return map
  }, [filtered])

  const stats = useMemo(() => {
    const all = Object.values(filtered)
    return {
      normal: all.filter((r) => r.type === "NORMAL").length,
      tardanza: all.filter((r) => r.type === "TARDANZA").length,
      falta: all.filter((r) => r.type === "FALTA").length,
      vacaciones: all.filter((r) => r.type === "VACACIONES").length,
    }
  }, [filtered])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
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
    if (res.ok) {
      const rec = await res.json()
      setRecords((p) => {
        const exists = p.findIndex((r) => r.id === rec.id)
        if (exists >= 0) { const n = [...p]; n[exists] = rec; return n }
        return [rec, ...p]
      })
      setShowForm(false)
      setForm({ employeeId: "", date: new Date().toISOString().slice(0, 10), checkIn: "", checkOut: "", type: "NORMAL", notes: "" })
    }
    setLoading(false)
  }

  function exportCsv() {
    const header = ["Empleado", "Departamento", "Fecha", "Entrada", "Salida", "Tipo", "Notas"]
    const rows = filtered.map((r) => [
      r.employee.fullName,
      r.employee.department?.name ?? "",
      format(new Date(r.date), "yyyy-MM-dd"),
      r.checkIn ? format(new Date(r.checkIn), "HH:mm") : "",
      r.checkOut ? format(new Date(r.checkOut), "HH:mm") : "",
      typeConfig[r.type]?.label ?? r.type,
      r.notes ?? "",
    ])
    downloadCsv([header, ...rows], `asistencia_${month}.csv`)
  }

  const deptNames = [...new Set(filtered.map((r) => r.employee.department?.name).filter(Boolean))]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Control de Asistencia</h1>
          <p className="text-sm text-slate-500 mt-0.5">{format(new Date(y, m - 1), "MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-1.5" />Exportar</Button>
          {isAdmin && <Button size="sm" onClick={() => setShowForm((v) => !v)}><Plus className="w-4 h-4 mr-1.5" />Registrar</Button>}
        </div>
      </div>

      {/* Navegacion de mes */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-medium text-slate-700 capitalize">
          {format(new Date(y, m - 1), "MMMM yyyy", { locale: es })}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
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

      {/* Formulario */}
      {showForm && isAdmin && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Empleado *</Label>
                <Select value={form.employeeId} onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
              <div className="col-span-2 flex gap-2">
                <Button type="submit" size="sm" disabled={loading || (!form.employeeId && !currentEmployeeId)}>
                  {loading ? "Guardando..." : "Registrar"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && (
          <Select value={filterDept} onValueChange={(v) => setFilterDept(v ?? "all")}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-8">Sin registros este mes</p>}
        {filtered.map((r) => {
          const tc = typeConfig[r.type]
          return (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{r.employee.fullName}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(r.date), "EEEE d 'de' MMMM", { locale: es })}
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
    </div>
  )
}
