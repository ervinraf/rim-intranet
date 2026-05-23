"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  GraduationCap, Shield, Plus, Search, Download,
  AlertTriangle, CheckCircle, Clock, X, Pencil, Trash2,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { downloadCsv } from "@/lib/csv"

type ExpiryStatus = "VIGENTE" | "POR_VENCER" | "VENCIDO" | "NO_VENCE"

const expiryConfig: Record<ExpiryStatus, { label: string; className: string; icon: any }> = {
  VIGENTE:    { label: "Vigente",     className: "bg-green-100 text-green-700",  icon: CheckCircle },
  POR_VENCER: { label: "Por vencer",  className: "bg-amber-100 text-amber-700",  icon: Clock },
  VENCIDO:    { label: "Vencido",     className: "bg-red-100 text-red-700",      icon: AlertTriangle },
  NO_VENCE:   { label: "Sin vencimiento", className: "bg-slate-100 text-slate-500", icon: CheckCircle },
}

type Tab = "dc3" | "epp"

interface Props {
  dc3: any[]
  epp: any[]
  eppCatalog: any[]
  employees: any[]
  departments: any[]
  isAdmin: boolean
}

export function DC3Client({ dc3: initialDC3, epp: initialEPP, eppCatalog, employees, departments, isAdmin }: Props) {
  const [tab, setTab] = useState<Tab>("dc3")
  const [dc3, setDC3] = useState(initialDC3)
  const [epp, setEPP] = useState(initialEPP)
  const [search, setSearch] = useState("")
  const [filterDept, setFilterDept] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showDC3Form, setShowDC3Form] = useState(false)
  const [showEPPForm, setShowEPPForm] = useState(false)
  const [dc3Form, setDC3Form] = useState({
    employeeId: "", courseName: "", institution: "", instructor: "",
    hours: "", completedAt: "", expiresAt: "", notes: "",
  })
  const [eppForm, setEPPForm] = useState({
    employeeId: "", itemId: "", brand: "", size: "", quantity: "1", notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [editingDC3, setEditingDC3] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ courseName: "", institution: "", instructor: "", hours: "", completedAt: "", expiresAt: "", notes: "" })

  // Stats
  const vencidos = dc3.filter((r) => r.expiryStatus === "VENCIDO").length
  const porVencer = dc3.filter((r) => r.expiryStatus === "POR_VENCER").length

  // DC3 filtrado
  const filteredDC3 = useMemo(() =>
    dc3.filter((r) => {
      const matchSearch = !search ||
        r.courseName.toLowerCase().includes(search.toLowerCase()) ||
        r.employee.fullName.toLowerCase().includes(search.toLowerCase())
      const matchDept = filterDept === "all" || r.employee.department?.name === filterDept
      const matchStatus = filterStatus === "all" || r.expiryStatus === filterStatus
      return matchSearch && matchDept && matchStatus
    }), [dc3, search, filterDept, filterStatus])

  // EPP filtrado y agrupado por empleado
  const filteredEPP = useMemo(() => {
    const f = epp.filter((r) => {
      const matchSearch = !search ||
        r.employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.item.name.toLowerCase().includes(search.toLowerCase())
      const matchDept = filterDept === "all" || r.employee.department?.name === filterDept
      return matchSearch && matchDept
    })
    // Agrupar por empleado
    const map: Record<string, { employee: any; items: any[] }> = {}
    for (const r of f) {
      if (!map[r.employeeId]) map[r.employeeId] = { employee: r.employee, items: [] }
      map[r.employeeId].items.push(r)
    }
    return Object.values(map)
  }, [epp, search, filterDept])

  async function saveDC3(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/dc3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...dc3Form,
        hours: dc3Form.hours ? parseInt(dc3Form.hours) : undefined,
      }),
    })
    if (res.ok) {
      const record = await res.json()
      const now = new Date()
      const threshold = new Date(); threshold.setDate(threshold.getDate() + 60)
      const expiryStatus = !record.expiresAt ? "NO_VENCE"
        : new Date(record.expiresAt) < now ? "VENCIDO"
        : new Date(record.expiresAt) <= threshold ? "POR_VENCER"
        : "VIGENTE"
      setDC3([{ ...record, expiryStatus }, ...dc3])
      setShowDC3Form(false)
      setDC3Form({ employeeId: "", courseName: "", institution: "", instructor: "", hours: "", completedAt: "", expiresAt: "", notes: "" })
    }
    setLoading(false)
  }

  async function saveEPP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/epp/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...eppForm, quantity: parseInt(eppForm.quantity) }),
    })
    if (res.ok) {
      const record = await res.json()
      setEPP([record, ...epp])
      setShowEPPForm(false)
      setEPPForm({ employeeId: "", itemId: "", brand: "", size: "", quantity: "1", notes: "" })
    }
    setLoading(false)
  }

  function startEditDC3(r: any) {
    setEditingDC3(r)
    setEditForm({
      courseName: r.courseName,
      institution: r.institution ?? "",
      instructor: r.instructor ?? "",
      hours: r.hours ? String(r.hours) : "",
      completedAt: r.completedAt ? r.completedAt.slice(0, 10) : "",
      expiresAt: r.expiresAt ? r.expiresAt.slice(0, 10) : "",
      notes: r.notes ?? "",
    })
  }

  async function saveEditDC3(e: React.FormEvent) {
    e.preventDefault()
    if (!editingDC3) return
    setLoading(true)
    const res = await fetch(`/api/dc3/${editingDC3.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        hours: editForm.hours ? parseInt(editForm.hours) : undefined,
        expiresAt: editForm.expiresAt || null,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      const now = new Date()
      const threshold = new Date(); threshold.setDate(threshold.getDate() + 60)
      const expiryStatus = !updated.expiresAt ? "NO_VENCE"
        : new Date(updated.expiresAt) < now ? "VENCIDO"
        : new Date(updated.expiresAt) <= threshold ? "POR_VENCER"
        : "VIGENTE"
      setDC3((prev) => prev.map((r) => r.id === updated.id ? { ...r, ...updated, expiryStatus } : r))
      setEditingDC3(null)
    }
    setLoading(false)
  }

  async function deleteDC3(id: string) {
    await fetch(`/api/dc3/${id}`, { method: "DELETE" })
    setDC3((prev) => prev.filter((r) => r.id !== id))
  }

  async function deleteEPP(id: string) {
    await fetch(`/api/epp/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conditionReturn: "BUENA" }),
    })
    setEPP(epp.filter((r) => r.id !== id))
  }

  const deptNames = [...new Set(dc3.map((r) => r.employee.department?.name).filter(Boolean))]

  function exportDC3() {
    const header = ["Empleado", "Departamento", "Curso", "Institucion", "Instructor", "Horas", "Completado", "Vence", "Estado"]
    const rows = filteredDC3.map((r) => [
      r.employee.fullName,
      r.employee.department?.name ?? "",
      r.courseName,
      r.institution ?? "",
      r.instructor ?? "",
      String(r.hours ?? ""),
      r.completedAt ? format(new Date(r.completedAt), "yyyy-MM-dd") : "",
      r.expiresAt ? format(new Date(r.expiresAt), "yyyy-MM-dd") : "No vence",
      r.expiryStatus ?? "",
    ])
    downloadCsv([header, ...rows], `dc3_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function exportEPP() {
    const header = ["Empleado", "Departamento", "Articulo", "Marca", "Talla", "Cantidad", "Condicion", "Entregado"]
    const rows: string[][] = []
    for (const group of filteredEPP) {
      for (const item of group.items) {
        rows.push([
          group.employee.fullName,
          group.employee.department?.name ?? "",
          item.item?.name ?? "",
          item.brand ?? "",
          item.size ?? "",
          String(item.quantity),
          item.condition,
          item.issuedAt ? format(new Date(item.issuedAt), "yyyy-MM-dd") : "",
        ])
      }
    }
    downloadCsv([header, ...rows], `epp_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">DC3 y EPP</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Constancias de capacitacion y equipo de proteccion personal
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "dc3" && (
            <Button variant="outline" size="sm" onClick={exportDC3}>
              <Download className="w-4 h-4 mr-1.5" /> Exportar
            </Button>
          )}
          {tab === "epp" && (
            <Button variant="outline" size="sm" onClick={exportEPP}>
              <Download className="w-4 h-4 mr-1.5" /> Exportar
            </Button>
          )}
          {isAdmin && (
            <>
              {tab === "dc3" && (
                <Button size="sm" onClick={() => setShowDC3Form(true)}>
                  <Plus className="w-4 h-4 mr-1.5" /> Nueva DC3
                </Button>
              )}
              {tab === "epp" && (
                <Button size="sm" onClick={() => setShowEPPForm(true)}>
                  <Plus className="w-4 h-4 mr-1.5" /> Entregar EPP
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Alertas resumidas */}
      {(vencidos > 0 || porVencer > 0) && (
        <div className="flex gap-3 mb-6">
          {vencidos > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span><strong>{vencidos}</strong> DC3 vencidos</span>
            </div>
          )}
          {porVencer > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2.5 text-sm">
              <Clock className="w-4 h-4" />
              <span><strong>{porVencer}</strong> DC3 vencen en los proximos 60 dias</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {[
          { id: "dc3" as Tab, label: "DC3 — Constancias", icon: GraduationCap, count: dc3.length },
          { id: "epp" as Tab, label: "EPP — Proteccion Personal", icon: Shield, count: epp.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className="text-xs text-slate-400">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterDept} onValueChange={(v) => setFilterDept(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {deptNames.map((d) => <SelectItem key={d} value={d!}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        {tab === "dc3" && (
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="VIGENTE">Vigentes</SelectItem>
              <SelectItem value="POR_VENCER">Por vencer</SelectItem>
              <SelectItem value="VENCIDO">Vencidos</SelectItem>
              <SelectItem value="NO_VENCE">Sin vencimiento</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── DC3 tab ── */}
      {tab === "dc3" && (
        <>
          {showDC3Form && isAdmin && (
            <Card className="mb-5">
              <CardContent className="p-4">
                <form onSubmit={saveDC3} className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Empleado *</Label>
                    <Select value={dc3Form.employeeId} onValueChange={(v) => setDC3Form((p) => ({ ...p, employeeId: v ?? "" }))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.fullName} {e.department?.name ? `(${e.department.name})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Curso / Capacitacion *</Label>
                    <Input value={dc3Form.courseName} onChange={(e) => setDC3Form((p) => ({ ...p, courseName: e.target.value }))} placeholder="Trabajo en alturas..." required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Institucion / Capacitador</Label>
                    <Input value={dc3Form.institution} onChange={(e) => setDC3Form((p) => ({ ...p, institution: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horas</Label>
                    <Input type="number" min="1" value={dc3Form.hours} onChange={(e) => setDC3Form((p) => ({ ...p, hours: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha de termino *</Label>
                    <Input type="date" value={dc3Form.completedAt} onChange={(e) => setDC3Form((p) => ({ ...p, completedAt: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha de vencimiento</Label>
                    <Input type="date" value={dc3Form.expiresAt} onChange={(e) => setDC3Form((p) => ({ ...p, expiresAt: e.target.value }))} />
                    <p className="text-xs text-slate-400">Dejar vacio si no vence</p>
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit" size="sm" disabled={!dc3Form.employeeId || !dc3Form.courseName || !dc3Form.completedAt || loading}>
                      Guardar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowDC3Form(false)}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Empleado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Curso</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Horas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Termino</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Vence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDC3.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Sin registros</td></tr>
                )}
                {filteredDC3.map((r) => {
                  const cfg = expiryConfig[r.expiryStatus as ExpiryStatus]
                  const Icon = cfg.icon
                  const daysLeft = r.expiresAt
                    ? differenceInDays(new Date(r.expiresAt), new Date())
                    : null
                  return (
                    <tr key={r.id} className={`hover:bg-slate-50 ${r.expiryStatus === "VENCIDO" ? "bg-red-50/30" : r.expiryStatus === "POR_VENCER" ? "bg-amber-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{r.employee.fullName}</p>
                        <p className="text-xs text-slate-400">{r.employee.department?.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{r.courseName}</p>
                        {r.institution && <p className="text-xs text-slate-400">{r.institution}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{r.hours ? `${r.hours}h` : "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {format(new Date(r.completedAt), "d MMM yyyy", { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.expiresAt ? (
                          <div>
                            <p className={daysLeft !== null && daysLeft < 0 ? "text-red-600 font-medium" : "text-slate-500"}>
                              {format(new Date(r.expiresAt), "d MMM yyyy", { locale: es })}
                            </p>
                            {daysLeft !== null && daysLeft >= 0 && (
                              <p className="text-slate-400">en {daysLeft} dias</p>
                            )}
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {r.certificateUrl && (
                            <a href={r.certificateUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Ver constancia">
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          )}
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                                onClick={() => startEditDC3(r)} title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                                onClick={() => deleteDC3(r.id)} title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── EPP tab ── */}
      {tab === "epp" && (
        <>
          {showEPPForm && isAdmin && (
            <Card className="mb-5">
              <CardContent className="p-4">
                <form onSubmit={saveEPP} className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Empleado *</Label>
                    <Select value={eppForm.employeeId} onValueChange={(v) => setEPPForm((p) => ({ ...p, employeeId: v ?? "" }))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.fullName} {e.department?.name ? `(${e.department.name})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Articulo EPP *</Label>
                    <Select value={eppForm.itemId} onValueChange={(v) => setEPPForm((p) => ({ ...p, itemId: v ?? "" }))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {eppCatalog.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Marca</Label>
                    <Input value={eppForm.brand} onChange={(e) => setEPPForm((p) => ({ ...p, brand: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>Talla / Medida</Label>
                      <Input value={eppForm.size} onChange={(e) => setEPPForm((p) => ({ ...p, size: e.target.value }))} placeholder="M, 27, etc." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cantidad</Label>
                      <Input type="number" min="1" value={eppForm.quantity} onChange={(e) => setEPPForm((p) => ({ ...p, quantity: e.target.value }))} />
                    </div>
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit" size="sm" disabled={!eppForm.employeeId || !eppForm.itemId || loading}>Registrar entrega</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowEPPForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {filteredEPP.length === 0 ? (
            <p className="text-center py-16 text-slate-400 text-sm">Sin registros de EPP</p>
          ) : (
            <div className="space-y-3">
              {filteredEPP.map(({ employee, items }) => (
                <div key={employee.fullName} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{employee.fullName}</p>
                      <p className="text-xs text-slate-400">{employee.department?.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{items.length} articulos</Badge>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-slate-700">{item.item.name}</p>
                            <p className="text-xs text-slate-400">
                              {item.brand && `${item.brand} `}
                              {item.size && `Talla ${item.size} `}
                              · Cant. {item.quantity}
                              · Entregado {format(new Date(item.issuedAt), "d MMM yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-400 hover:text-red-500"
                            onClick={() => deleteEPP(item.id)}
                            title="Registrar devolucion"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {/* Edit DC3 modal */}
      {editingDC3 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Editar DC3</h2>
              <button onClick={() => setEditingDC3(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveEditDC3} className="px-6 py-5 grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Curso / Capacitacion *</Label>
                <Input value={editForm.courseName} onChange={(e) => setEditForm((p) => ({ ...p, courseName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Institucion / Capacitador</Label>
                <Input value={editForm.institution} onChange={(e) => setEditForm((p) => ({ ...p, institution: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Horas</Label>
                <Input type="number" min="1" value={editForm.hours} onChange={(e) => setEditForm((p) => ({ ...p, hours: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de termino *</Label>
                <Input type="date" value={editForm.completedAt} onChange={(e) => setEditForm((p) => ({ ...p, completedAt: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de vencimiento</Label>
                <Input type="date" value={editForm.expiresAt} onChange={(e) => setEditForm((p) => ({ ...p, expiresAt: e.target.value }))} />
                <p className="text-xs text-slate-400">Dejar vacio si no vence</p>
              </div>
              <div className="col-span-2 flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={!editForm.courseName || !editForm.completedAt || loading}>
                  {loading ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditingDC3(null)}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
