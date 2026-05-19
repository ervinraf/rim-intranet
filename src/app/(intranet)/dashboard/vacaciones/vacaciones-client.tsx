"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, CheckCircle, X, Palmtree } from "lucide-react"
import { format, differenceInCalendarDays } from "date-fns"
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

export function VacacionesClient({ requests: initial, isAdmin, hasEmployee }: Props) {
  const [requests, setRequests] = useState<VacationRequest[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ dateFrom: "", dateTo: "", reason: "" })
  const [loading, setLoading] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const pendingCount = requests.filter((r) => r.status === "PENDIENTE").length

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vacaciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pendingCount > 0 ? `${pendingCount} solicitud(es) pendiente(s)` : "Sin solicitudes pendientes"}
          </p>
        </div>
        {hasEmployee && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-1.5" />Solicitar vacaciones
          </Button>
        )}
      </div>

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
        {requests.length === 0 && (
          <div className="text-center py-12">
            <Palmtree className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Sin solicitudes de vacaciones</p>
          </div>
        )}
        {requests.map((r) => {
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
