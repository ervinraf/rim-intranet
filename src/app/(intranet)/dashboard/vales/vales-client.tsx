"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Plus, Search, Fuel, Wallet, Plane, Wrench,
  CheckCircle, X, ChevronDown, ChevronUp, Paperclip, FileText, Image, Download, BarChart2,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { downloadCsv } from "@/lib/csv"

type ValeType = "COMBUSTIBLE" | "CAJA_CHICA" | "VIATICOS" | "HERRAMIENTA"
type ValeStatus = "PENDIENTE" | "APROBADO" | "RECHAZADO"

const typeConfig: Record<ValeType, { label: string; icon: any; color: string }> = {
  COMBUSTIBLE: { label: "Combustible", icon: Fuel,   color: "bg-blue-100 text-blue-700" },
  CAJA_CHICA:  { label: "Caja chica",  icon: Wallet, color: "bg-amber-100 text-amber-700" },
  VIATICOS:    { label: "Viaticos",    icon: Plane,  color: "bg-purple-100 text-purple-700" },
  HERRAMIENTA: { label: "Herramienta", icon: Wrench, color: "bg-slate-100 text-slate-700" },
}

const statusConfig: Record<ValeStatus, { label: string; color: string }> = {
  PENDIENTE: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  APROBADO:  { label: "Aprobado",  color: "bg-green-100 text-green-700" },
  RECHAZADO: { label: "Rechazado", color: "bg-red-100 text-red-700" },
}

interface Vale {
  id: string
  type: ValeType
  status: ValeStatus
  concept: string
  vehicle?: string | null
  liters?: number | null
  amount?: number | null
  vendor?: string | null
  date: string
  notes?: string | null
  rejectionReason?: string | null
  receiptUrl?: string | null
  employee: { fullName: string; department?: { name: string } | null }
  project?: { name: string } | null
  approvedBy?: { fullName: string } | null
  approvedAt?: string | null
}

interface FormState {
  type: ValeType
  employeeId: string
  projectId: string
  concept: string
  vehicle: string
  liters: string
  amount: string
  vendor: string
  date: string
  notes: string
}

const emptyForm = (): FormState => ({
  type: "COMBUSTIBLE",
  employeeId: "",
  projectId: "",
  concept: "",
  vehicle: "",
  liters: "",
  amount: "",
  vendor: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
})

interface Props {
  vales: Vale[]
  employees: { id: string; fullName: string }[]
  projects: { id: string; name: string }[]
  currentEmployeeId: string | null
  isAdmin: boolean
}

export function ValesClient({ vales: initial, employees, projects, currentEmployeeId, isAdmin }: Props) {
  const [vales, setVales] = useState<Vale[]>(initial)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectionInput, setRejectionInput] = useState("")
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  const filtered = useMemo(() => {
    return vales.filter((v) => {
      if (filterType !== "all" && v.type !== filterType) return false
      if (filterStatus !== "all" && v.status !== filterStatus) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !v.concept.toLowerCase().includes(q) &&
          !v.employee.fullName.toLowerCase().includes(q) &&
          !(v.project?.name.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [vales, search, filterType, filterStatus])

  const [showReport, setShowReport] = useState(false)

  const totals = useMemo(() => {
    const aprobados = filtered.filter((v) => v.status === "APROBADO")
    return {
      pendientes: filtered.filter((v) => v.status === "PENDIENTE").length,
      monto: aprobados.reduce((s, v) => s + (v.amount ? Number(v.amount) : 0), 0),
      litros: aprobados.filter((v) => v.type === "COMBUSTIBLE").reduce((s, v) => s + (v.liters ? Number(v.liters) : 0), 0),
    }
  }, [filtered])

  const reportByCategory = useMemo(() => {
    return (Object.keys(typeConfig) as ValeType[]).map((type) => {
      const group = filtered.filter((v) => v.type === type)
      const aprobados = group.filter((v) => v.status === "APROBADO")
      return {
        type,
        label: typeConfig[type].label,
        color: typeConfig[type].color,
        total: group.length,
        pendientes: group.filter((v) => v.status === "PENDIENTE").length,
        aprobados: aprobados.length,
        rechazados: group.filter((v) => v.status === "RECHAZADO").length,
        monto: aprobados.reduce((s, v) => s + (v.amount ? Number(v.amount) : 0), 0),
        litros: type === "COMBUSTIBLE" ? aprobados.reduce((s, v) => s + (v.liters ? Number(v.liters) : 0), 0) : null,
      }
    }).filter((r) => r.total > 0)
  }, [filtered])

  function exportCsv() {
    const header = ["Tipo", "Fecha", "Empleado", "Proyecto", "Concepto", "Vehiculo", "Litros", "Monto", "Proveedor", "Estado"]
    const rows = filtered.map((v) => [
      typeConfig[v.type]?.label ?? v.type,
      v.date.slice(0, 10),
      v.employee.fullName,
      v.project?.name ?? "",
      v.concept,
      v.vehicle ?? "",
      v.liters != null ? String(v.liters) : "",
      v.amount != null ? String(v.amount) : "",
      v.vendor ?? "",
      statusConfig[v.status]?.label ?? v.status,
    ])
    downloadCsv([header, ...rows], `vales_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload: any = {
      type: form.type,
      employeeId: isAdmin ? form.employeeId || currentEmployeeId : currentEmployeeId,
      projectId: form.projectId || null,
      concept: form.concept,
      date: form.date,
      vehicle: form.vehicle || null,
      liters: form.liters ? parseFloat(form.liters) : null,
      amount: form.amount ? parseFloat(form.amount) : null,
      vendor: form.vendor || null,
      notes: form.notes || null,
    }
    const res = await fetch("/api/vales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const vale = await res.json()
      setVales((p) => [vale, ...p])
      setShowForm(false)
      setForm(emptyForm())
    }
    setLoading(false)
  }

  async function handleStatus(id: string, status: "APROBADO" | "RECHAZADO", rejectionReason?: string) {
    const res = await fetch(`/api/vales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason: rejectionReason || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setVales((p) => p.map((v) => (v.id === id ? updated : v)))
      setRejectingId(null)
      setRejectionInput("")
    }
  }

  async function handleUploadReceipt(id: string, file: File) {
    setUploadingId(id)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch(`/api/vales/${id}/receipt`, { method: "POST", body: fd })
    if (res.ok) {
      const { url } = await res.json()
      setVales((p) => p.map((v) => v.id === id ? { ...v, receiptUrl: url } : v))
    }
    setUploadingId(null)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/vales/${id}`, { method: "DELETE" })
    if (res.ok) setVales((p) => p.filter((v) => v.id !== id))
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vales</h1>
          <p className="text-sm text-slate-500 mt-0.5">Combustible, caja chica, viaticos y herramientas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowReport((v) => !v)} className={showReport ? "bg-slate-100" : ""}>
            <BarChart2 className="w-4 h-4 mr-1.5" />
            Por categoria
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button onClick={() => setShowForm((v) => !v)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo vale
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pendientes</p>
          <p className="text-2xl font-semibold text-amber-600">{totals.pendientes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Monto aprobado</p>
          <p className="text-2xl font-semibold text-green-600">
            ${totals.monto.toFixed(2)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Litros (combustible aprobado)</p>
          <p className="text-2xl font-semibold text-blue-600">{totals.litros.toFixed(1)} L</p>
        </div>
      </div>

      {/* Reporte por categoria */}
      {showReport && reportByCategory.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Reporte por categoria</p>
            <p className="text-xs text-slate-400">{filtered.length} vales en el filtro actual</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Categoria</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Total</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-amber-600">Pendientes</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-green-600">Aprobados</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-red-500">Rechazados</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500">Monto aprobado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportByCategory.map((r) => (
                  <tr key={r.type} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${r.color}`}>
                        {r.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{r.total}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{r.pendientes || "—"}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{r.aprobados || "—"}</td>
                    <td className="px-4 py-3 text-right text-red-500">{r.rechazados || "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">
                      {r.monto > 0 ? (
                        <span>
                          ${r.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          {r.litros != null && r.litros > 0 && (
                            <span className="ml-2 text-xs text-blue-600 font-normal">{r.litros.toFixed(1)} L</span>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-5 py-2.5 text-xs font-semibold text-slate-600">Total</td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">{filtered.length}</td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold text-amber-600">{totals.pendientes || "—"}</td>
                  <td colSpan={2} />
                  <td className="px-5 py-2.5 text-right text-xs font-semibold text-slate-800">
                    ${totals.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as ValeType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(typeConfig) as ValeType[]).map((t) => (
                        <SelectItem key={t} value={t}>{typeConfig[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div className="space-y-1.5">
                    <Label>Empleado *</Label>
                    <Select value={form.employeeId} onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v ?? "" }))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Fecha *</Label>
                  <Input type="date" value={form.date} onChange={set("date")} required />
                </div>

                <div className="space-y-1.5">
                  <Label>Proyecto</Label>
                  <Select value={form.projectId} onValueChange={(v) => setForm((p) => ({ ...p, projectId: v ?? "" }))}>
                    <SelectTrigger><SelectValue placeholder="Sin proyecto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin proyecto</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label>Concepto *</Label>
                  <Input value={form.concept} onChange={set("concept")} required placeholder="Describe el gasto..." />
                </div>

                {form.type === "COMBUSTIBLE" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Vehiculo</Label>
                      <Input value={form.vehicle} onChange={set("vehicle")} placeholder="Placas o descripcion" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Litros</Label>
                      <Input type="number" step="0.01" value={form.liters} onChange={set("liters")} placeholder="40.5" />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label>Monto ($)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={set("amount")} placeholder="0.00" />
                </div>

                <div className="space-y-1.5">
                  <Label>Proveedor / Gasolinera</Label>
                  <Input value={form.vendor} onChange={set("vendor")} placeholder="OXXO Gas, etc." />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label>Notas</Label>
                  <Textarea value={form.notes} onChange={set("notes")} rows={2} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Guardando..." : "Registrar vale"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {(Object.keys(typeConfig) as ValeType[]).map((t) => (
              <SelectItem key={t} value={t}>{typeConfig[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="APROBADO">Aprobado</SelectItem>
            <SelectItem value="RECHAZADO">Rechazado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">Sin resultados</p>
        )}
        {filtered.map((vale) => {
          const tc = typeConfig[vale.type]
          const sc = statusConfig[vale.status]
          const TypeIcon = tc.icon
          const isExpanded = expandedId === vale.id

          return (
            <div key={vale.id} className="bg-white border border-slate-200 rounded-xl">
              <button
                type="button"
                className="w-full text-left px-4 py-3 flex items-center gap-3"
                onClick={() => setExpandedId(isExpanded ? null : vale.id)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                  <TypeIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900 truncate">{vale.concept}</p>
                    <Badge className={`text-xs ${tc.color}`}>{tc.label}</Badge>
                    <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {vale.employee.fullName}
                    {vale.project && ` · ${vale.project.name}`}
                    {" · "}
                    {format(new Date(vale.date), "d MMM yyyy", { locale: es })}
                    {vale.amount && ` · $${Number(vale.amount).toFixed(2)}`}
                    {vale.liters && ` · ${Number(vale.liters).toFixed(1)} L`}
                  </p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {vale.vehicle && <p><span className="text-slate-500">Vehiculo:</span> {vale.vehicle}</p>}
                    {vale.vendor && <p><span className="text-slate-500">Proveedor:</span> {vale.vendor}</p>}
                    {vale.employee.department && <p><span className="text-slate-500">Departamento:</span> {vale.employee.department.name}</p>}
                    {vale.approvedBy && <p><span className="text-slate-500">Aprobado por:</span> {vale.approvedBy.fullName}</p>}
                    {vale.rejectionReason && <p className="col-span-2"><span className="text-slate-500">Motivo rechazo:</span> {vale.rejectionReason}</p>}
                    {vale.notes && <p className="col-span-2"><span className="text-slate-500">Notas:</span> {vale.notes}</p>}
                  </div>

                  {/* Comprobante */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {vale.receiptUrl ? (
                      <>
                        <a
                          href={vale.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {vale.receiptUrl.endsWith(".pdf") ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <Image className="w-4 h-4" />
                          )}
                          Ver comprobante
                        </a>
                      </>
                    ) : (
                      <label className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer">
                        <Paperclip className="w-4 h-4" />
                        {uploadingId === vale.id ? "Subiendo..." : "Adjuntar comprobante"}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          disabled={uploadingId === vale.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadReceipt(vale.id, file)
                            e.target.value = ""
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Acciones admin */}
                  {isAdmin && vale.status === "PENDIENTE" && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleStatus(vale.id, "APROBADO")}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Aprobar
                      </Button>
                      {rejectingId === vale.id ? (
                        <div className="flex gap-2 items-center flex-1">
                          <Input
                            placeholder="Motivo del rechazo..."
                            value={rejectionInput}
                            onChange={(e) => setRejectionInput(e.target.value)}
                            className="h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatus(vale.id, "RECHAZADO", rejectionInput)}
                          >
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(vale.id)}>
                          <X className="w-3.5 h-3.5 mr-1" />
                          Rechazar
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Eliminar solo si es pendiente y el propio empleado (o admin) */}
                  {(isAdmin || vale.status === "PENDIENTE") && (
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(vale.id)}
                    >
                      Eliminar vale
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
