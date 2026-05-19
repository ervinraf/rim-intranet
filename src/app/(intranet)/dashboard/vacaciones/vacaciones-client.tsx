"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, CheckCircle, X, Palmtree, Clock, CalendarCheck, CalendarClock, Users } from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { format, differenceInCalendarDays, isAfter, isBefore, startOfYear, endOfYear } from "date-fns"
import { es } from "date-fns/locale"

type VacationStatus = "PENDIENTE" | "APROBADO" | "RECHAZADO" | "CANCELADO"

const statusConfig: Record<VacationStatus, { label: string; color: string }> = {
  PENDIENTE:  { label: "Pendiente",  color: "bg-amber-100 text-amber-700" },
  APROBADO:   { label: "Aprobado",   color: "bg-green-100 text-green-700" },
  RECHAZADO:  { label: "Rechazado",  color: "bg-red-100 text-red-700" },
  CANCELADO:  { label: "Cancelado",  color: "bg-slate-100 text-slate-500" },
}

interface VacationRequest {
  id: string
  dateFrom: string
  dateTo: string
  daysRequested: number
  reason?: string | null
  status: VacationStatus
  rejectionReason?: string | null
  employee: { fullName: string; department?: { name: string } | null }
  approvedBy?: { fullName: string } | null
  createdAt: string
}

interface Props {
  requests: VacationRequest[]
  isAdmin: boolean
  hasEmployee: boolean
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: number | string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 leading-tight">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function VacacionesClient({ requests: initial, isAdmin, hasEmployee }: Props) {
  const [requests, setRequests] = useState<VacationRequest[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ dateFrom: "", dateTo: "", reason: "" })
  const [loading, setLoading] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all")

  const today = new Date()
  const yearStart = startOfYear(today)
  const yearEnd = endOfYear(today)

  // Stats globales (admin) o propias (empleado)
  const stats = {
    pendientesDisfrutar: requests
      .filter((r) => r.status === "APROBADO" && isAfter(new Date(r.dateFrom), today))
      .reduce((s, r) => s + r.daysRequested, 0),
    disfrutadosAnio: requests
      .filter((r) => r.status === "APROBADO" && isBefore(new Date(r.dateTo), today) && new Date(r.dateTo) >= yearStart)
      .reduce((s, r) => s + r.daysRequested, 0),
    enEspera: requests
      .filter((r) => r.status === "PENDIENTE")
      .reduce((s, r) => s + r.daysRequested, 0),
    totalAnio: requests
      .filter((r) => r.status === "APROBADO" && new Date(r.dateFrom) >= yearStart && new Date(r.dateFrom) <= yearEnd)
      .reduce((s, r) => s + r.daysRequested, 0),
  }

  // Resumen por empleado (solo admin)
  const byEmployee = isAdmin
    ? Array.from(
        requests.reduce((map, r) => {
          const key = r.employee.fullName
          const dept = r.employee.department?.name ?? "Sin depto"
          if (!map.has(key)) map.set(key, { name: key, dept, pendientes: 0, disfrutados: 0, enEspera: 0 })
          const e = map.get(key)!
          if (r.status === "APROBADO" && isAfter(new Date(r.dateFrom), today)) e.pendientes += r.daysRequested
          if (r.status === "APROBADO" && isBefore(new Date(r.dateTo), today)) e.disfrutados += r.daysRequested
          if (r.status === "PENDIENTE") e.enEspera += r.daysRequested
          return map
        }, new Map<string, { name: string; dept: string; pendientes: number; disfrutados: number; enEspera: number }>())
      ).sort((a, b) => a[1].name.localeCompare(b[1].name))
    : []

  const pendingCount = requests.filter((r) => r.status === "PENDIENTE").length

  const filteredRequests = isAdmin && selectedEmployee !== "all"
    ? requests.filter((r) => r.employee.fullName === selectedEmployee)
    : requests

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/vacations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const req = await res.json()
      setRequests((p) => [req, ...p])
      setShowForm(false)
      setForm({ dateFrom: "", dateTo: "", reason: "" })
    }
    setLoading(false)
  }

  async function handleStatus(id: string, status: "APROBADO" | "RECHAZADO", rejectionReason?: string) {
    const res = await fetch(`/api/vacations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRequests((p) => p.map((r) => r.id === id ? updated : r))
      setRejectingId(null)
      setRejectReason("")
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/vacations/${id}`, { method: "DELETE" })
    if (res.ok) setRequests((p) => p.filter((r) => r.id !== id))
  }

  const days = form.dateFrom && form.dateTo
    ? differenceInCalendarDays(new Date(form.dateTo), new Date(form.dateFrom)) + 1
    : 0

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vacaciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pendingCount > 0 ? `${pendingCount} solicitud(es) pendiente(s)` : "Sin solicitudes pendientes"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector de empleado (solo admin) */}
          {isAdmin && byEmployee.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <Select value={selectedEmployee} onValueChange={(v) => setSelectedEmployee(v ?? "all")}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos los empleados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {byEmployee.map(([, e]) => (
                    <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {hasEmployee && (
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1.5" />Solicitar vacaciones
            </Button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Pendientes de disfrutar"
          value={stats.pendientesDisfrutar}
          sub="dias aprobados proximos"
          icon={CalendarClock}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Disfrutados este ano"
          value={stats.disfrutadosAnio}
          sub="dias tomados en el ano"
          icon={CalendarCheck}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="En espera"
          value={stats.enEspera}
          sub="dias pendientes de aprobar"
          icon={Clock}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Total aprobado este ano"
          value={stats.totalAnio}
          sub="dias aprobados en el ano"
          icon={Palmtree}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Resumen por empleado (solo admin) */}
      {isAdmin && byEmployee.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700">Resumen por empleado</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Empleado</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Departamento</th>
                  <th className="text-right px-4 py-2.5 text-blue-500 font-medium">Pend. disfrutar</th>
                  <th className="text-right px-4 py-2.5 text-green-500 font-medium">Disfrutados</th>
                  <th className="text-right px-4 py-2.5 text-amber-500 font-medium">En espera</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byEmployee.map(([, e]) => (
                  <tr
                    key={e.name}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedEmployee === e.name ? "bg-slate-50" : ""}`}
                    onClick={() => setSelectedEmployee(selectedEmployee === e.name ? "all" : e.name)}
                  >
                    <td className="px-4 py-2.5 text-slate-800 font-medium">{e.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{e.dept}</td>
                    <td className="px-4 py-2.5 text-right text-blue-600 font-medium">{e.pendientes}</td>
                    <td className="px-4 py-2.5 text-right text-green-600 font-medium">{e.disfrutados}</td>
                    <td className="px-4 py-2.5 text-right text-amber-600 font-medium">{e.enEspera}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedEmployee !== "all" && (
            <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-2">
              <span className="text-xs text-slate-500">Mostrando solicitudes de: <strong>{selectedEmployee}</strong></span>
              <button type="button" className="text-xs text-slate-400 hover:text-slate-600 underline" onClick={() => setSelectedEmployee("all")}>
                Ver todos
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Fecha de inicio *</Label>
                  <Input type="date" value={form.dateFrom} onChange={(e) => setForm((p) => ({ ...p, dateFrom: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de regreso *</Label>
                  <Input type="date" value={form.dateTo} min={form.dateFrom} onChange={(e) => setForm((p) => ({ ...p, dateTo: e.target.value }))} required />
                </div>
              </div>
              {days > 0 && (
                <p className="text-sm text-slate-600 font-medium">{days} dia(s) solicitado(s)</p>
              )}
              <div className="space-y-1.5">
                <Label>Motivo (opcional)</Label>
                <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading || days <= 0}>
                  {loading ? "Enviando..." : "Enviar solicitud"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <Palmtree className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Sin solicitudes de vacaciones</p>
          </div>
        )}
        {filteredRequests.map((r) => {
          const sc = statusConfig[r.status]
          return (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  {isAdmin && (
                    <p className="text-sm font-medium text-slate-900">{r.employee.fullName}</p>
                  )}
                  <p className="text-sm text-slate-700">
                    {format(new Date(r.dateFrom), "d 'de' MMMM", { locale: es })} →{" "}
                    {format(new Date(r.dateTo), "d 'de' MMMM yyyy", { locale: es })}
                    <span className="text-slate-500 ml-2">({r.daysRequested} dia{r.daysRequested !== 1 ? "s" : ""})</span>
                  </p>
                  {r.reason && <p className="text-xs text-slate-500 mt-0.5">{r.reason}</p>}
                  {r.rejectionReason && <p className="text-xs text-red-500 mt-0.5">Motivo: {r.rejectionReason}</p>}
                  {r.approvedBy && <p className="text-xs text-slate-400 mt-0.5">Por: {r.approvedBy.fullName}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-xs border-0 ${sc.color}`}>{sc.label}</Badge>

                  {isAdmin && r.status === "PENDIENTE" && (
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatus(r.id, "APROBADO")}>
                        <CheckCircle className="w-3 h-3 mr-1" />Aprobar
                      </Button>
                      {rejectingId === r.id ? (
                        <div className="flex gap-1.5 items-center">
                          <Input
                            placeholder="Motivo..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="h-7 text-xs w-36"
                          />
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleStatus(r.id, "RECHAZADO", rejectReason)}>
                            OK
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRejectingId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRejectingId(r.id)}>
                          <X className="w-3 h-3 mr-1" />Rechazar
                        </Button>
                      )}
                    </div>
                  )}

                  {r.status === "PENDIENTE" && !isAdmin && (
                    <button type="button" className="text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(r.id)}>
                      Cancelar solicitud
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
