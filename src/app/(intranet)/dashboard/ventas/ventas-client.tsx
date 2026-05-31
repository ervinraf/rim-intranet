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
  Plus, Search, TrendingUp, DollarSign, Clock, CheckCircle2,
  ChevronDown, ChevronUp, Pencil, Trash2, X, Check, Download,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { downloadCsv } from "@/lib/csv"

type SalesStatus = "NUEVO" | "EN_DESARROLLO" | "CONCLUIDO"
type PaymentType = "CREDITO" | "ANTICIPO" | "CONTADO"

const statusConfig: Record<SalesStatus, { label: string; color: string; icon: any }> = {
  NUEVO:         { label: "Nuevo",          color: "bg-blue-100 text-blue-700",   icon: TrendingUp },
  EN_DESARROLLO: { label: "En desarrollo",  color: "bg-amber-100 text-amber-700", icon: Clock },
  CONCLUIDO:     { label: "Concluido",      color: "bg-green-100 text-green-700", icon: CheckCircle2 },
}

const paymentLabels: Record<PaymentType, string> = {
  CREDITO: "Credito", ANTICIPO: "Anticipo", CONTADO: "Contado",
}

interface Payment { id: string; amount: number; date: string; concept?: string | null }

interface SalesProject {
  id: string
  name: string
  clientName: string
  concept?: string | null
  status: SalesStatus
  servicePrice?: number | null
  invoiceNumber?: string | null
  invoiceDate?: string | null
  paymentType: PaymentType
  advanceAmount?: number | null
  promiseDate?: string | null
  notes?: string | null
  createdAt: string
  payments: Payment[]
}

const emptyForm = () => ({
  name: "", clientName: "", concept: "", status: "NUEVO" as SalesStatus,
  servicePrice: "", invoiceNumber: "", invoiceDate: "", paymentType: "CREDITO" as PaymentType,
  advanceAmount: "", promiseDate: "", notes: "",
})

interface Props {
  projects: SalesProject[]
  isAdmin: boolean
}

export function VentasClient({ projects: initial, isAdmin }: Props) {
  const [projects, setProjects] = useState(initial)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), concept: "" })
  const [addingPaymentId, setAddingPaymentId] = useState<string | null>(null)

  const filtered = useMemo(() =>
    projects.filter((p) => {
      if (filterStatus !== "all" && p.status !== filterStatus) return false
      if (search) {
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q)
      }
      return true
    }), [projects, search, filterStatus])

  function recoveredAmount(p: SalesProject): number {
    return p.payments.reduce((s, pay) => s + Number(pay.amount), 0)
  }

  function pendingAmount(p: SalesProject): number {
    if (!p.servicePrice) return 0
    return Math.max(0, Number(p.servicePrice) - recoveredAmount(p))
  }

  const kpis = useMemo(() => {
    const all = projects
    const facturado = all.reduce((s, p) => s + (p.servicePrice ? Number(p.servicePrice) : 0), 0)
    const cobrado = all.reduce((s, p) => s + recoveredAmount(p), 0)
    const pendiente = facturado - cobrado
    const carteraVencida = all.filter((p) =>
      p.promiseDate && new Date(p.promiseDate) < new Date() && pendingAmount(p) > 0
    ).reduce((s, p) => s + pendingAmount(p), 0)
    return { facturado, cobrado, pendiente, carteraVencida }
  }, [projects])

  const fmt$ = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2 })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const p = await res.json()
      setProjects((prev) => [p, ...prev])
      setShowForm(false)
      setForm(emptyForm())
    }
    setLoading(false)
  }

  function startEdit(p: SalesProject) {
    setEditingId(p.id)
    setEditForm({
      name: p.name, clientName: p.clientName, concept: p.concept ?? "",
      status: p.status, servicePrice: p.servicePrice ? String(p.servicePrice) : "",
      invoiceNumber: p.invoiceNumber ?? "", invoiceDate: p.invoiceDate?.slice(0, 10) ?? "",
      paymentType: p.paymentType, advanceAmount: p.advanceAmount ? String(p.advanceAmount) : "",
      promiseDate: p.promiseDate?.slice(0, 10) ?? "", notes: p.notes ?? "",
    })
  }

  async function saveEdit(id: string) {
    setLoading(true)
    const res = await fetch(`/api/ventas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setProjects((prev) => prev.map((p) => p.id === id ? updated : p))
      setEditingId(null)
    }
    setLoading(false)
  }

  async function deleteProject(id: string) {
    if (!confirm("¿Archivar este proyecto de ventas?")) return
    await fetch(`/api/ventas/${id}`, { method: "DELETE" })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  async function addPayment(projectId: string) {
    if (!paymentForm.amount) return
    setLoading(true)
    const res = await fetch(`/api/ventas/${projectId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentForm),
    })
    if (res.ok) {
      const payment = await res.json()
      setProjects((prev) => prev.map((p) =>
        p.id === projectId ? { ...p, payments: [...p.payments, payment] } : p
      ))
      setPaymentForm({ amount: "", date: new Date().toISOString().slice(0, 10), concept: "" })
      setAddingPaymentId(null)
    }
    setLoading(false)
  }

  async function deletePayment(projectId: string, paymentId: string) {
    await fetch(`/api/ventas/${projectId}/payments?paymentId=${paymentId}`, { method: "DELETE" })
    setProjects((prev) => prev.map((p) =>
      p.id === projectId ? { ...p, payments: p.payments.filter((pay) => pay.id !== paymentId) } : p
    ))
  }

  function exportCsv() {
    const header = ["Proyecto", "Cliente", "Estado", "Precio Servicio", "Factura", "Fecha Factura",
      "Tipo Pago", "Cobrado", "Pendiente", "Fecha Promesa"]
    const rows = filtered.map((p) => [
      p.name, p.clientName,
      statusConfig[p.status].label,
      p.servicePrice ? String(p.servicePrice) : "",
      p.invoiceNumber ?? "",
      p.invoiceDate ? p.invoiceDate.slice(0, 10) : "",
      paymentLabels[p.paymentType],
      String(recoveredAmount(p)),
      String(pendingAmount(p)),
      p.promiseDate ? p.promiseDate.slice(0, 10) : "",
    ])
    downloadCsv([header, ...rows], `ventas_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function printProject(p: SalesProject) {
    const rec = recoveredAmount(p)
    const pen = pendingAmount(p)
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <html><head><title>${p.name}</title>
      <style>
        body { font-family: Calibri, sans-serif; padding: 32px; color: #1e293b; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .field label { font-size: 11px; color: #94a3b8; text-transform: uppercase; }
        .field p { font-size: 14px; font-weight: 600; color: #1e293b; margin: 2px 0 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 12px; }
        td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .total { font-weight: bold; background: #f8fafc; }
        @media print { button { display: none; } }
      </style></head><body>
      <h1>${p.name}</h1>
      <div class="meta">${p.clientName} &nbsp;·&nbsp; ${statusConfig[p.status].label} &nbsp;·&nbsp; ${paymentLabels[p.paymentType]}</div>
      <div class="grid">
        <div class="field"><label>Precio del servicio</label><p>${p.servicePrice ? fmt$(Number(p.servicePrice)) : "—"}</p></div>
        <div class="field"><label>Factura</label><p>${p.invoiceNumber ?? "—"}</p></div>
        <div class="field"><label>Fecha factura</label><p>${p.invoiceDate ? format(new Date(p.invoiceDate), "d MMM yyyy", { locale: es }) : "—"}</p></div>
        <div class="field"><label>Fecha promesa pago</label><p>${p.promiseDate ? format(new Date(p.promiseDate), "d MMM yyyy", { locale: es }) : "—"}</p></div>
        <div class="field"><label>Total cobrado</label><p style="color:#16a34a">${fmt$(rec)}</p></div>
        <div class="field"><label>Saldo pendiente</label><p style="color:${pen > 0 ? "#dc2626" : "#16a34a"}">${fmt$(pen)}</p></div>
      </div>
      ${p.concept ? `<p style="font-size:13px;color:#475569;margin-bottom:20px">${p.concept}</p>` : ""}
      ${p.payments.length > 0 ? `
        <p style="font-size:13px;font-weight:600;margin-bottom:8px">Pagos registrados</p>
        <table>
          <thead><tr><th>Fecha</th><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
          <tbody>
            ${p.payments.map((pay) => `<tr><td>${pay.date.slice(0, 10)}</td><td>${pay.concept ?? "—"}</td><td style="text-align:right">${fmt$(Number(pay.amount))}</td></tr>`).join("")}
            <tr class="total"><td colspan="2" style="text-align:right">Total</td><td style="text-align:right">${fmt$(rec)}</td></tr>
          </tbody>
        </table>` : ""}
      <script>window.onload = () => window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  const formFields = (f: typeof form, set: (k: string, v: string) => void) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2">
        <Label>Nombre del proyecto *</Label>
        <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Instalacion planta ACME..." required />
      </div>
      <div className="space-y-1.5">
        <Label>Cliente *</Label>
        <Input value={f.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="Empresa del cliente..." required />
      </div>
      <div className="space-y-1.5">
        <Label>Estado</Label>
        <Select value={f.status} onValueChange={(v) => set("status", v ?? "NUEVO")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(statusConfig) as SalesStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Precio del servicio ($)</Label>
        <Input type="number" step="0.01" min="0" value={f.servicePrice} onChange={(e) => set("servicePrice", e.target.value)} placeholder="0.00" />
      </div>
      <div className="space-y-1.5">
        <Label>Tipo de pago</Label>
        <Select value={f.paymentType} onValueChange={(v) => set("paymentType", v ?? "CREDITO")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(paymentLabels) as PaymentType[]).map((t) => (
              <SelectItem key={t} value={t}>{paymentLabels[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>No. Factura</Label>
        <Input value={f.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} placeholder="FAC-0001..." />
      </div>
      <div className="space-y-1.5">
        <Label>Fecha factura</Label>
        <Input type="date" value={f.invoiceDate} onChange={(e) => set("invoiceDate", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Anticipo ($)</Label>
        <Input type="number" step="0.01" min="0" value={f.advanceAmount} onChange={(e) => set("advanceAmount", e.target.value)} placeholder="0.00" />
      </div>
      <div className="space-y-1.5">
        <Label>Fecha promesa de pago</Label>
        <Input type="date" value={f.promiseDate} onChange={(e) => set("promiseDate", e.target.value)} />
      </div>
      <div className="space-y-1.5 col-span-2">
        <Label>Concepto / Descripcion del servicio</Label>
        <Textarea rows={2} value={f.concept} onChange={(e) => set("concept", e.target.value)} placeholder="Descripcion del trabajo a realizar..." />
      </div>
      <div className="space-y-1.5 col-span-2">
        <Label>Notas</Label>
        <Input value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notas adicionales..." />
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Ventas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pipeline comercial y cartera de cobranza</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1.5" />Exportar
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1.5" />Nuevo proyecto
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Facturacion total", value: fmt$(kpis.facturado), color: "text-slate-800" },
          { label: "Total cobrado", value: fmt$(kpis.cobrado), color: "text-green-600" },
          { label: "Por cobrar", value: fmt$(kpis.pendiente), color: "text-amber-600" },
          { label: "Cartera vencida", value: fmt$(kpis.carteraVencida), color: "text-red-600" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline por estado */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(statusConfig) as SalesStatus[]).map((s) => {
          const group = projects.filter((p) => p.status === s)
          const Icon = statusConfig[s].icon
          return (
            <div key={s} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusConfig[s].color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{statusConfig[s].label}</p>
                <p className="text-lg font-bold text-slate-800">{group.length}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Form nuevo proyecto */}
      {showForm && isAdmin && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              {formFields(form, (k, v) => setForm((p) => ({ ...p, [k]: v })))}
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={!form.name || !form.clientName || loading}>
                  {loading ? "Guardando..." : "Crear proyecto"}
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
          <Input className="pl-9" placeholder="Buscar proyecto o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.keys(statusConfig) as SalesStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-8">Sin proyectos</p>}
        {filtered.map((p) => {
          const rec = recoveredAmount(p)
          const pen = pendingAmount(p)
          const isExpanded = expandedId === p.id
          const isEditing = editingId === p.id
          const isOverdue = p.promiseDate && new Date(p.promiseDate) < new Date() && pen > 0
          const st = statusConfig[p.status]

          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {isEditing ? (
                <div className="p-4 space-y-3">
                  {formFields(editForm, (k, v) => setEditForm((prev) => ({ ...prev, [k]: v })))}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(p.id)} disabled={loading}>
                      <Check className="w-3.5 h-3.5 mr-1" />{loading ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="w-3.5 h-3.5 mr-1" />Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        {isOverdue && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Vencida</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.clientName}
                        {p.invoiceNumber && ` · Fac. ${p.invoiceNumber}`}
                        {p.servicePrice && ` · ${fmt$(Number(p.servicePrice))}`}
                        {pen > 0 && ` · Pendiente: ${fmt$(pen)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      {pen > 0 && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400">Cobrado / Total</p>
                          <p className="text-xs font-semibold">
                            <span className="text-green-600">{fmt$(rec)}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-slate-700">{fmt$(Number(p.servicePrice ?? 0))}</span>
                          </p>
                        </div>
                      )}
                      {isAdmin && (
                        <div className="flex gap-1.5">
                          <button
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            onClick={(e) => { e.stopPropagation(); printProject(p) }}
                          >
                            <Download className="w-3 h-3" />Imprimir
                          </button>
                          <button
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            onClick={(e) => { e.stopPropagation(); startEdit(p) }}
                          >
                            <Pencil className="w-3 h-3" />Editar
                          </button>
                          <button
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            onClick={(e) => { e.stopPropagation(); deleteProject(p.id) }}
                          >
                            <Trash2 className="w-3 h-3" />Archivar
                          </button>
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-4 space-y-4">
                      {/* Detalle financiero */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Precio del servicio", value: p.servicePrice ? fmt$(Number(p.servicePrice)) : "—" },
                          { label: "Tipo de pago", value: paymentLabels[p.paymentType] },
                          { label: "Total cobrado", value: fmt$(rec), highlight: "green" },
                          { label: "Saldo pendiente", value: fmt$(pen), highlight: pen > 0 ? "red" : "green" },
                        ].map((item) => (
                          <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-400">{item.label}</p>
                            <p className={`text-sm font-semibold mt-0.5 ${item.highlight === "green" ? "text-green-700" : item.highlight === "red" ? "text-red-600" : "text-slate-800"}`}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Info adicional */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {p.invoiceNumber && (
                          <div><span className="text-slate-400 text-xs">Factura</span><p className="font-medium">{p.invoiceNumber}</p></div>
                        )}
                        {p.invoiceDate && (
                          <div><span className="text-slate-400 text-xs">Fecha factura</span><p className="font-medium">{format(new Date(p.invoiceDate), "d MMM yyyy", { locale: es })}</p></div>
                        )}
                        {p.promiseDate && (
                          <div>
                            <span className="text-slate-400 text-xs">Fecha promesa pago</span>
                            <p className={`font-medium ${isOverdue ? "text-red-600" : "text-slate-800"}`}>
                              {format(new Date(p.promiseDate), "d MMM yyyy", { locale: es })}
                              {isOverdue && " · Vencida"}
                            </p>
                          </div>
                        )}
                        {p.advanceAmount && (
                          <div><span className="text-slate-400 text-xs">Anticipo acordado</span><p className="font-medium">{fmt$(Number(p.advanceAmount))}</p></div>
                        )}
                      </div>

                      {p.concept && (
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{p.concept}</p>
                      )}

                      {/* Historial de pagos */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagos registrados</p>
                          {isAdmin && addingPaymentId !== p.id && (
                            <button className="text-xs text-blue-600 hover:text-blue-800" onClick={() => setAddingPaymentId(p.id)}>
                              + Registrar pago
                            </button>
                          )}
                        </div>

                        {addingPaymentId === p.id && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-2 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <Input type="number" placeholder="Monto $" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} className="h-8 text-sm" />
                              <Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))} className="h-8 text-sm" />
                              <Input placeholder="Concepto" value={paymentForm.concept} onChange={(e) => setPaymentForm((f) => ({ ...f, concept: e.target.value }))} className="h-8 text-sm" />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs" onClick={() => addPayment(p.id)} disabled={!paymentForm.amount || loading}>Guardar</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingPaymentId(null)}>Cancelar</Button>
                            </div>
                          </div>
                        )}

                        {p.payments.length === 0 ? (
                          <p className="text-xs text-slate-400">Sin pagos registrados</p>
                        ) : (
                          <div className="space-y-1">
                            {p.payments.map((pay) => (
                              <div key={pay.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                                <span className="text-slate-500">{pay.date.slice(0, 10)}</span>
                                <span className="text-slate-600 flex-1 mx-3">{pay.concept ?? "—"}</span>
                                <span className="font-semibold text-green-700">{fmt$(Number(pay.amount))}</span>
                                {isAdmin && (
                                  <button className="ml-2 text-slate-300 hover:text-red-500" onClick={() => deletePayment(p.id, pay.id)}>
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
