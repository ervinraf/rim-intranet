"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Check, X, ChevronDown, ChevronUp, Printer, History } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const statusConfig = {
  PENDIENTE: { label: "Pendiente", variant: "secondary" as const },
  APROBADO:  { label: "Aprobado",  variant: "default" as const },
  RECHAZADO: { label: "Rechazado", variant: "destructive" as const },
  SURTIDO:   { label: "Surtido",   variant: "default" as const },
}

interface ReqItem { name: string; quantity: number; unit?: string; unitPrice?: number; notes?: string }

interface Props {
  requisitions: any[]
  departments: any[]
  projects: any[]
  isAdmin: boolean
  search: string
  onUpdate: (reqs: any[]) => void
}

export function RequisitionsTab({ requisitions, departments, projects, isAdmin, search, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: "", description: "", priority: "NORMAL", departmentId: "", projectId: "" })
  const [items, setItems] = useState<ReqItem[]>([{ name: "", quantity: 1, unit: "pza", unitPrice: undefined }])
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() =>
    requisitions.filter((r) => {
      const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase())
      const matchHistory = showHistory ? true : !["SURTIDO", "RECHAZADO"].includes(r.status)
      return matchSearch && matchHistory
    }), [requisitions, search, showHistory])

  function printReq(req: any) {
    const items: ReqItem[] = Array.isArray(req.items) ? req.items : []
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <html><head><title>Requisicion - ${req.title}</title>
      <style>
        body { font-family: Calibri, sans-serif; padding: 32px; color: #1e293b; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
        .urgente { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; padding: 6px 12px; border-radius: 6px; font-weight: bold; margin-bottom: 16px; display: inline-block; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 13px; border-bottom: 2px solid #e2e8f0; }
        td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .total-row { font-weight: bold; background: #f8fafc; }
        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; }
        .status { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; background: #f1f5f9; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <h1>Requisicion de compra</h1>
        <div class="meta">
          ${req.department?.name ? `${req.department.name} &nbsp;·&nbsp; ` : ""}
          ${format(new Date(req.createdAt), "d 'de' MMMM yyyy", { locale: es })}
          &nbsp;·&nbsp; <span class="status">${statusConfig[req.status as keyof typeof statusConfig]?.label ?? req.status}</span>
        </div>
        ${req.priority === "URGENTE" ? `<div class="urgente">PRIORIDAD URGENTE</div>` : ""}
        <h2 style="font-size:16px;margin-bottom:4px">${req.title}</h2>
        ${req.description ? `<p style="color:#475569;font-size:14px">${req.description}</p>` : ""}
        <table>
          <thead><tr><th>Articulo</th><th style="text-align:right;width:80px">Cantidad</th><th style="width:80px">Unidad</th><th style="text-align:right;width:110px">P. Unit.</th><th style="text-align:right;width:120px">Subtotal</th></tr></thead>
          <tbody>
            ${items.map((i) => {
              const sub = i.unitPrice ? i.unitPrice * i.quantity : null
              return `<tr><td>${i.name}</td><td style="text-align:right">${i.quantity}</td><td>${i.unit ?? ""}</td><td style="text-align:right">${i.unitPrice ? "$" + i.unitPrice.toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "—"}</td><td style="text-align:right">${sub ? "$" + sub.toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "—"}</td></tr>`
            }).join("")}
            ${(() => { const t = items.reduce((s, i) => s + (i.unitPrice ? i.unitPrice * i.quantity : 0), 0); return t > 0 ? `<tr class="total-row"><td colspan="4" style="text-align:right">Total estimado</td><td style="text-align:right">$${t.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td></tr>` : "" })()}
          </tbody>
        </table>
        <div class="footer">RIM Rigging &nbsp;·&nbsp; Generado el ${format(new Date(), "d/MM/yyyy HH:mm")}</div>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `)
    win.document.close()
  }

  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1, unit: "pza", unitPrice: undefined }])
  }

  function totalCost(list: ReqItem[]): number {
    return list.reduce((sum, i) => sum + (i.unitPrice ? i.unitPrice * i.quantity : 0), 0)
  }

  function updateItem(i: number, key: keyof ReqItem, value: string | number | undefined) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item))
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function submit() {
    setLoading(true)
    const res = await fetch("/api/requisitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items: items.filter((i) => i.name.trim()) }),
    })
    if (res.ok) {
      const req = await res.json()
      onUpdate([{ ...req, department: departments.find((d) => d.id === form.departmentId) ?? null }, ...requisitions])
      setShowForm(false)
      setForm({ title: "", description: "", priority: "NORMAL", departmentId: "", projectId: "" })
      setItems([{ name: "", quantity: 1, unit: "pza" }])
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/requisitions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      onUpdate(requisitions.map((r) => r.id === id ? { ...r, status } : r))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant={showHistory ? "default" : "outline"}
          onClick={() => setShowHistory(!showHistory)}
        >
          <History className="w-4 h-4 mr-1.5" />
          {showHistory ? "Ocultar historial" : "Ver historial"}
        </Button>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1.5" /> Nueva requisicion
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Titulo *</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Refacciones para grua..." />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v ?? "NORMAL" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Select value={form.departmentId} onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Articulos *</Label>
                <Button size="sm" variant="ghost" onClick={addItem} className="h-6 text-xs">+ Agregar</Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 px-1">
                  <span className="col-span-5">Descripcion</span>
                  <span className="col-span-2 text-center">Cant.</span>
                  <span className="col-span-2">Unidad</span>
                  <span className="col-span-2">P. Unit. ($)</span>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-5" placeholder="Articulo..." value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
                    <Input className="col-span-2" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value))} />
                    <Input className="col-span-2" placeholder="pza" value={item.unit ?? ""} onChange={(e) => updateItem(i, "unit", e.target.value)} />
                    <Input className="col-span-2" type="number" min="0" step="0.01" placeholder="0.00" value={item.unitPrice != null ? item.unitPrice : ""} onChange={(e) => updateItem(i, "unitPrice", e.target.value === "" ? undefined : parseFloat(e.target.value))} />
                    <Button variant="ghost" size="sm" className="col-span-1 h-8 text-red-400 hover:text-red-600 px-0" onClick={() => removeItem(i)}>✕</Button>
                  </div>
                ))}
                {totalCost(items) > 0 && (
                  <div className="text-right text-sm font-medium text-slate-700 pr-8 pt-1">
                    Total estimado: ${totalCost(items).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={submit} disabled={!form.title || items.every((i) => !i.name.trim()) || loading}>Enviar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Sin requisiciones</p>}
        {filtered.map((req) => {
          const st = statusConfig[req.status as keyof typeof statusConfig]
          const isExpanded = expandedId === req.id
          const reqItems: ReqItem[] = Array.isArray(req.items) ? req.items : []
          return (
            <div key={req.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpandedId(isExpanded ? null : req.id)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{req.title}</p>
                    {req.priority === "URGENTE" && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Urgente</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {req.department?.name ?? "Sin departamento"} ·{" "}
                    {format(new Date(req.createdAt), "d MMM yyyy", { locale: es })} ·{" "}
                    {reqItems.length} articulos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                  {isAdmin && req.status === "PENDIENTE" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-green-200 text-green-600 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); updateStatus(req.id, "APROBADO") }}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-200 text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); updateStatus(req.id, "RECHAZADO") }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  {isAdmin && req.status === "APROBADO" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); updateStatus(req.id, "SURTIDO") }}>
                      Marcar surtido
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                    onClick={(e) => { e.stopPropagation(); printReq(req) }}
                    title="Imprimir"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              {isExpanded && reqItems.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-left pb-1">Articulo</th>
                        <th className="text-right pb-1 w-16">Cant.</th>
                        <th className="text-left pb-1 w-16 pl-2">Unidad</th>
                        <th className="text-right pb-1 w-24">P. Unit.</th>
                        <th className="text-right pb-1 w-24">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {reqItems.map((item, i) => {
                        const sub = item.unitPrice ? item.unitPrice * item.quantity : null
                        return (
                          <tr key={i}>
                            <td className="py-1 text-slate-700">{item.name}</td>
                            <td className="py-1 text-right text-slate-600 font-medium">{item.quantity}</td>
                            <td className="py-1 pl-2 text-slate-400">{item.unit}</td>
                            <td className="py-1 text-right text-slate-500">{item.unitPrice ? `$${item.unitPrice.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}</td>
                            <td className="py-1 text-right text-slate-600 font-medium">{sub ? `$${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {totalCost(reqItems) > 0 && (
                    <div className="text-right text-xs font-semibold text-slate-700 mt-2 pt-2 border-t border-slate-100">
                      Total estimado: ${totalCost(reqItems).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
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
