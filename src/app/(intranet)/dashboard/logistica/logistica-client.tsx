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
  Plus, Search, Truck, Wrench, ClipboardList, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, X, Check, Pencil, Printer,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"

type VehicleStatus = "DISPONIBLE" | "EN_RUTA" | "EN_MANTENIMIENTO" | "BAJA"
type VehicleLogType = "PREVENTIVO" | "CORRECTIVO" | "REVISION" | "INCIDENCIA"
type VehicleItemStatus = "OK" | "REQUIERE_ATENCION" | "FALLA" | "NO_APLICA"
type Tab = "vehiculos" | "checklists"

const statusConfig: Record<VehicleStatus, { label: string; color: string }> = {
  DISPONIBLE:       { label: "Disponible",       color: "bg-green-100 text-green-700" },
  EN_RUTA:          { label: "En ruta",           color: "bg-blue-100 text-blue-700" },
  EN_MANTENIMIENTO: { label: "En mantenimiento",  color: "bg-amber-100 text-amber-700" },
  BAJA:             { label: "Baja",              color: "bg-slate-100 text-slate-500" },
}

const logTypeLabels: Record<VehicleLogType, string> = {
  PREVENTIVO: "Preventivo", CORRECTIVO: "Correctivo",
  REVISION: "Revision", INCIDENCIA: "Incidencia",
}

const itemStatusConfig: Record<VehicleItemStatus, { label: string; color: string; icon: any }> = {
  OK:                { label: "OK",                  color: "text-green-600",  icon: CheckCircle2 },
  REQUIERE_ATENCION: { label: "Requiere atencion",   color: "text-amber-600",  icon: Clock },
  FALLA:             { label: "Falla",               color: "text-red-600",    icon: AlertTriangle },
  NO_APLICA:         { label: "N/A",                 color: "text-slate-400",  icon: X },
}

const CHECKLIST_ITEMS = [
  { category: "Motor",       description: "Nivel de aceite" },
  { category: "Motor",       description: "Nivel de refrigerante" },
  { category: "Motor",       description: "Nivel de agua limpiabrisas" },
  { category: "Frenos",      description: "Freno de servicio" },
  { category: "Frenos",      description: "Freno de emergencia" },
  { category: "Iluminacion", description: "Faros delanteros" },
  { category: "Iluminacion", description: "Faros traseros / calaveras" },
  { category: "Iluminacion", description: "Intermitentes / direccionales" },
  { category: "Neumaticos",  description: "Llanta delantera izquierda" },
  { category: "Neumaticos",  description: "Llanta delantera derecha" },
  { category: "Neumaticos",  description: "Llanta trasera izquierda" },
  { category: "Neumaticos",  description: "Llanta trasera derecha" },
  { category: "Neumaticos",  description: "Llanta de refaccion" },
  { category: "Documentos",  description: "Tarjeta de circulacion" },
  { category: "Documentos",  description: "Poliza de seguro vigente" },
  { category: "Documentos",  description: "Verificacion vigente" },
  { category: "Seguridad",   description: "Extintor" },
  { category: "Seguridad",   description: "Botiquin de primeros auxilios" },
  { category: "Seguridad",   description: "Triangulos de emergencia" },
  { category: "General",     description: "Limpieza interior" },
  { category: "General",     description: "Limpieza exterior" },
]

interface MaintenanceLog {
  id: string; type: VehicleLogType; description: string
  cost?: number | null; date: string; technician?: string | null; notes?: string | null
}

interface ChecklistItem {
  id: string; category: string; description: string
  status: VehicleItemStatus; notes?: string | null; order: number
}

interface Checklist {
  id: string; date: string; observations?: string | null
  items: ChecklistItem[]
}

interface Vehicle {
  id: string; brand: string; model: string; year?: number | null
  plates?: string | null; permit?: string | null
  status: VehicleStatus; notes?: string | null
  driver?: { id: string; fullName: string; licenciaNumero?: string | null; licenciaVencimiento?: string | null } | null
  maintenanceLogs: MaintenanceLog[]
  checklists: Checklist[]
}

interface Props {
  vehicles: Vehicle[]
  employees: { id: string; fullName: string; licenciaNumero?: string | null; licenciaVencimiento?: string | null }[]
  projects: { id: string; name: string }[]
  isAdmin: boolean
}

export function LogisticaClient({ vehicles: initial, employees, isAdmin }: Props) {
  const [vehicles, setVehicles] = useState(initial)
  const [tab, setTab] = useState<Tab>("vehiculos")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<Record<string, string>>({})
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [logModal, setLogModal] = useState<Vehicle | null>(null)
  const [checklistModal, setChecklistModal] = useState<Vehicle | null>(null)
  const [editModal, setEditModal] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(false)

  const [newVehicle, setNewVehicle] = useState({
    brand: "", model: "", year: "", plates: "", permit: "", driverId: "", notes: "",
  })

  const [editForm, setEditForm] = useState({
    brand: "", model: "", year: "", plates: "", permit: "", driverId: "", status: "DISPONIBLE" as VehicleStatus, notes: "",
  })

  const [logForm, setLogForm] = useState({
    type: "REVISION" as VehicleLogType, description: "", cost: "", date: new Date().toISOString().slice(0, 10), technician: "", notes: "",
  })

  const [checklistItems, setChecklistItems] = useState(
    CHECKLIST_ITEMS.map((item, i) => ({ ...item, status: "OK" as VehicleItemStatus, notes: "", order: i }))
  )
  const [checklistDriverId, setChecklistDriverId] = useState("")
  const [checklistObs, setChecklistObs] = useState("")

  const filtered = useMemo(() =>
    vehicles.filter((v) =>
      !search || `${v.brand} ${v.model} ${v.plates ?? ""}`.toLowerCase().includes(search.toLowerCase())
    ), [vehicles, search])

  const allChecklists = useMemo(() =>
    vehicles.flatMap((v) => v.checklists.map((c) => ({ ...c, vehicle: v }))),
    [vehicles]
  )

  function licenciaVencida(date?: string | null) {
    if (!date) return false
    return new Date(date) < new Date()
  }

  function licenciaPorVencer(date?: string | null) {
    if (!date) return false
    return differenceInDays(new Date(date), new Date()) <= 30 && !licenciaVencida(date)
  }

  async function addVehicle() {
    setLoading(true)
    const res = await fetch("/api/logistica/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newVehicle, year: newVehicle.year ? parseInt(newVehicle.year) : null }),
    })
    if (res.ok) {
      const v = await res.json()
      setVehicles((prev) => [...prev, v])
      setNewVehicle({ brand: "", model: "", year: "", plates: "", permit: "", driverId: "", notes: "" })
      setShowAddVehicle(false)
    }
    setLoading(false)
  }

  function openEdit(v: Vehicle) {
    setEditForm({
      brand: v.brand, model: v.model, year: v.year ? String(v.year) : "",
      plates: v.plates ?? "", permit: v.permit ?? "", driverId: v.driver?.id ?? "",
      status: v.status, notes: v.notes ?? "",
    })
    setEditModal(v)
  }

  async function saveEdit() {
    if (!editModal) return
    setLoading(true)
    const res = await fetch(`/api/logistica/vehicles/${editModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, year: editForm.year ? parseInt(editForm.year) : null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setVehicles((prev) => prev.map((v) => v.id === editModal.id ? updated : v))
      setEditModal(null)
    }
    setLoading(false)
  }

  async function addLog() {
    if (!logModal || !logForm.description.trim()) return
    setLoading(true)
    const res = await fetch(`/api/logistica/vehicles/${logModal.id}/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logForm),
    })
    if (res.ok) {
      const log = await res.json()
      setVehicles((prev) => prev.map((v) =>
        v.id === logModal.id ? { ...v, maintenanceLogs: [log, ...v.maintenanceLogs] } : v
      ))
      setLogModal(null)
      setLogForm({ type: "REVISION", description: "", cost: "", date: new Date().toISOString().slice(0, 10), technician: "", notes: "" })
    }
    setLoading(false)
  }

  async function saveChecklist() {
    if (!checklistModal) return
    setLoading(true)
    const res = await fetch(`/api/logistica/vehicles/${checklistModal.id}/checklists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: checklistDriverId || null,
        date: new Date().toISOString().slice(0, 10),
        observations: checklistObs || null,
        items: checklistItems,
      }),
    })
    if (res.ok) {
      const cl = await res.json()
      setVehicles((prev) => prev.map((v) =>
        v.id === checklistModal.id ? { ...v, checklists: [cl, ...v.checklists] } : v
      ))
      setChecklistModal(null)
      setChecklistItems(CHECKLIST_ITEMS.map((item, i) => ({ ...item, status: "OK" as VehicleItemStatus, notes: "", order: i })))
      setChecklistDriverId("")
      setChecklistObs("")
    }
    setLoading(false)
  }

  function printChecklist(cl: Checklist, vehicle: Vehicle) {
    const categories = [...new Set(cl.items.map((i) => i.category))]
    const driver = employees.find((e) => e.id === (vehicle.driver?.id ?? ""))
    const win = window.open("", "_blank")
    if (!win) return
    const issues = cl.items.filter((i) => i.status !== "OK" && i.status !== "NO_APLICA")
    win.document.write(`
      <html><head><title>Checklist ${vehicle.brand} ${vehicle.model}</title>
      <style>
        body { font-family: Calibri, sans-serif; padding: 32px; color: #1e293b; font-size: 13px; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
        .cat { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #94a3b8; margin: 16px 0 4px; }
        .item { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
        .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .ok { background: #22c55e; } .warn { background: #f59e0b; } .fail { background: #ef4444; } .na { background: #cbd5e1; }
        .note { font-size: 11px; color: #64748b; margin-left: auto; }
        .issues { margin-top: 20px; padding: 12px 16px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; }
        .obs { margin-top: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
        .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; }
        .sign { border-top: 1px solid #94a3b8; width: 200px; text-align: center; font-size: 11px; color: #94a3b8; padding-top: 4px; margin-top: 40px; }
        @media print { button { display: none; } }
      </style></head><body>
      <h1>Checklist de Revision — ${vehicle.brand} ${vehicle.model} ${vehicle.year ?? ""}</h1>
      <div class="meta">
        Placas: ${vehicle.plates ?? "—"} &nbsp;·&nbsp;
        Fecha: ${format(new Date(cl.date), "d 'de' MMMM yyyy", { locale: es })} &nbsp;·&nbsp;
        Chofer: ${driver?.fullName ?? "—"}
      </div>
      ${categories.map((cat) => `
        <div class="cat">${cat}</div>
        ${cl.items.filter((i) => i.category === cat).map((item) => `
          <div class="item">
            <div class="dot ${item.status === "OK" ? "ok" : item.status === "FALLA" ? "fail" : item.status === "REQUIERE_ATENCION" ? "warn" : "na"}"></div>
            <span>${item.description}</span>
            ${item.notes ? `<span class="note">${item.notes}</span>` : ""}
          </div>
        `).join("")}
      `).join("")}
      ${issues.length > 0 ? `
        <div class="issues">
          <strong style="font-size:12px">Puntos que requieren atencion (${issues.length}):</strong>
          <ul style="margin:8px 0 0;padding-left:16px">
            ${issues.map((i) => `<li>${i.description} — ${i.status === "FALLA" ? "FALLA" : "Requiere atencion"}${i.notes ? `: ${i.notes}` : ""}</li>`).join("")}
          </ul>
        </div>` : ""}
      ${cl.observations ? `<div class="obs"><strong>Observaciones:</strong><p style="margin:6px 0 0">${cl.observations}</p></div>` : ""}
      <div style="display:flex;gap:60px;margin-top:50px">
        <div class="sign">Quien realizo el llenado</div>
        <div class="sign">Chofer</div>
      </div>
      <div class="footer"><span>RIM Rigging · ${format(new Date(), "d/MM/yyyy HH:mm")}</span><span>Checklist de unidad</span></div>
      <script>window.onload = () => window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  const categories = [...new Set(CHECKLIST_ITEMS.map((i) => i.category))]

  const kpis = {
    total: vehicles.length,
    disponibles: vehicles.filter((v) => v.status === "DISPONIBLE").length,
    enRuta: vehicles.filter((v) => v.status === "EN_RUTA").length,
    mantenimiento: vehicles.filter((v) => v.status === "EN_MANTENIMIENTO").length,
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Logistica</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vehiculos, mantenimiento y checklists de revision</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowAddVehicle((v) => !v)}>
            <Plus className="w-4 h-4 mr-1.5" />Agregar vehiculo
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total vehiculos", value: kpis.total, color: "text-slate-800" },
          { label: "Disponibles", value: kpis.disponibles, color: "text-green-600" },
          { label: "En ruta", value: kpis.enRuta, color: "text-blue-600" },
          { label: "En mantenimiento", value: kpis.mantenimiento, color: "text-amber-600" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Formulario nuevo vehiculo */}
      {showAddVehicle && isAdmin && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Marca *</Label>
                <Input value={newVehicle.brand} onChange={(e) => setNewVehicle((p) => ({ ...p, brand: e.target.value }))} placeholder="Ford, Chevrolet, Kenworth..." />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo *</Label>
                <Input value={newVehicle.model} onChange={(e) => setNewVehicle((p) => ({ ...p, model: e.target.value }))} placeholder="F-150, Silverado..." />
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input type="number" min="1990" max="2030" value={newVehicle.year} onChange={(e) => setNewVehicle((p) => ({ ...p, year: e.target.value }))} placeholder="2022" />
              </div>
              <div className="space-y-1.5">
                <Label>Placas</Label>
                <Input value={newVehicle.plates} onChange={(e) => setNewVehicle((p) => ({ ...p, plates: e.target.value }))} placeholder="ABC-123-D" />
              </div>
              <div className="space-y-1.5">
                <Label>Permiso de circulacion</Label>
                <Input value={newVehicle.permit} onChange={(e) => setNewVehicle((p) => ({ ...p, permit: e.target.value }))} placeholder="No. de permiso..." />
              </div>
              <div className="space-y-1.5">
                <Label>Chofer asignado</Label>
                <Select value={newVehicle.driverId} onValueChange={(v) => setNewVehicle((p) => ({ ...p, driverId: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notas</Label>
                <Input value={newVehicle.notes} onChange={(e) => setNewVehicle((p) => ({ ...p, notes: e.target.value }))} placeholder="Observaciones del vehiculo..." />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={addVehicle} disabled={!newVehicle.brand || !newVehicle.model || loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddVehicle(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { id: "vehiculos" as Tab, label: "Vehiculos", icon: Truck },
          { id: "checklists" as Tab, label: "Checklists recientes", icon: ClipboardList },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Busqueda */}
      {tab === "vehiculos" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar por marca, modelo, placas..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {/* ── TAB VEHICULOS ── */}
      {tab === "vehiculos" && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-center py-12 text-slate-400 text-sm">Sin vehiculos registrados</p>
          )}
          {filtered.map((v) => {
            const isExpanded = expandedId === v.id
            const st = statusConfig[v.status]
            const section = expandedSection[v.id] ?? "bitacora"
            const licVencida = licenciaVencida(v.driver?.licenciaVencimiento)
            const licPorVencer = licenciaPorVencer(v.driver?.licenciaVencimiento)

            return (
              <div key={v.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpandedId(isExpanded ? null : v.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-4.5 h-4.5 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">
                          {v.brand} {v.model} {v.year ? `(${v.year})` : ""}
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        {licVencida && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Licencia vencida</span>}
                        {licPorVencer && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Licencia por vencer</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {v.plates && `Placas: ${v.plates}`}
                        {v.driver && ` · Chofer: ${v.driver.fullName}`}
                        {v.maintenanceLogs.length > 0 && ` · ${v.maintenanceLogs.length} registros de mantenimiento`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {isAdmin && (
                      <div className="flex gap-1.5">
                        <button
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                          onClick={(e) => { e.stopPropagation(); openEdit(v) }}
                        >
                          <Pencil className="w-3 h-3" />Editar
                        </button>
                        <button
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setLogModal(v) }}
                        >
                          <Wrench className="w-3 h-3" />Bitacora
                        </button>
                        <button
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setChecklistModal(v) }}
                        >
                          <ClipboardList className="w-3 h-3" />Checklist
                        </button>
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {/* Sub-tabs */}
                    <div className="flex border-b border-slate-100 bg-slate-50">
                      {[
                        { id: "bitacora", label: "Bitacora de mantenimiento" },
                        { id: "checklists", label: "Checklists" },
                        { id: "chofer", label: "Datos del chofer" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setExpandedSection((p) => ({ ...p, [v.id]: s.id }))}
                          className={`px-4 py-2 text-xs font-medium transition-colors ${
                            section === s.id ? "text-slate-900 border-b-2 border-slate-900" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <div className="px-5 py-4">
                      {/* Bitacora */}
                      {section === "bitacora" && (
                        <div className="space-y-2">
                          {v.maintenanceLogs.length === 0 ? (
                            <p className="text-sm text-slate-400 py-4 text-center">Sin registros de mantenimiento</p>
                          ) : v.maintenanceLogs.map((log) => (
                            <div key={log.id} className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
                              <div className="flex-shrink-0 w-20 text-xs text-slate-400">
                                {format(new Date(log.date), "d MMM yy", { locale: es })}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    {logTypeLabels[log.type]}
                                  </span>
                                  {log.cost != null && (
                                    <span className="text-xs text-slate-500">${Number(log.cost).toLocaleString("es-MX")}</span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-700">{log.description}</p>
                                {log.technician && <p className="text-xs text-slate-400">Tecnico: {log.technician}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Checklists */}
                      {section === "checklists" && (
                        <div className="space-y-2">
                          {v.checklists.length === 0 ? (
                            <p className="text-sm text-slate-400 py-4 text-center">Sin checklists registrados</p>
                          ) : v.checklists.map((cl) => {
                            const issues = cl.items.filter((i) => i.status !== "OK" && i.status !== "NO_APLICA")
                            return (
                              <div key={cl.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <div>
                                  <p className="text-sm font-medium text-slate-700">
                                    {format(new Date(cl.date), "d 'de' MMMM yyyy", { locale: es })}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {cl.items.length} puntos revisados
                                    {issues.length > 0 && (
                                      <span className="ml-2 text-amber-600">{issues.length} con observacion</span>
                                    )}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => printChecklist(cl, v)}
                                >
                                  <Printer className="w-3 h-3 mr-1" />Imprimir
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Chofer */}
                      {section === "chofer" && (
                        <div className="space-y-3">
                          {!v.driver ? (
                            <p className="text-sm text-slate-400 py-4 text-center">Sin chofer asignado</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-400">Chofer</p>
                                <p className="text-sm font-semibold text-slate-800 mt-0.5">{v.driver.fullName}</p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-400">No. Licencia</p>
                                <p className="text-sm font-semibold text-slate-800 mt-0.5">{v.driver.licenciaNumero ?? "—"}</p>
                              </div>
                              <div className={`rounded-lg p-3 ${licVencida ? "bg-red-50" : licPorVencer ? "bg-amber-50" : "bg-slate-50"}`}>
                                <p className="text-xs text-slate-400">Vencimiento licencia</p>
                                <p className={`text-sm font-semibold mt-0.5 ${licVencida ? "text-red-600" : licPorVencer ? "text-amber-600" : "text-slate-800"}`}>
                                  {v.driver.licenciaVencimiento
                                    ? format(new Date(v.driver.licenciaVencimiento), "d MMM yyyy", { locale: es })
                                    : "—"}
                                  {licVencida && " · VENCIDA"}
                                  {licPorVencer && ` · vence en ${differenceInDays(new Date(v.driver.licenciaVencimiento!), new Date())} dias`}
                                </p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-400">Permiso de circulacion</p>
                                <p className="text-sm font-semibold text-slate-800 mt-0.5">{v.permit ?? "—"}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB CHECKLISTS ── */}
      {tab === "checklists" && (
        <div className="space-y-2">
          {allChecklists.length === 0 && (
            <p className="text-center py-12 text-slate-400 text-sm">Sin checklists registrados</p>
          )}
          {allChecklists.slice(0, 20).map((cl) => {
            const issues = cl.items.filter((i) => i.status !== "OK" && i.status !== "NO_APLICA")
            return (
              <div key={cl.id} className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {cl.vehicle.brand} {cl.vehicle.model} · {cl.vehicle.plates ?? "Sin placas"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(cl.date), "d 'de' MMMM yyyy", { locale: es })}
                    {" · "}{cl.items.length} puntos
                    {issues.length > 0
                      ? <span className="text-amber-600"> · {issues.length} con observacion</span>
                      : <span className="text-green-600"> · Todo OK</span>
                    }
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => printChecklist(cl, cl.vehicle)}>
                  <Printer className="w-3 h-3 mr-1" />Imprimir
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL EDITAR VEHICULO ── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Editar vehiculo</h2>
              <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Marca</Label><Input value={editForm.brand} onChange={(e) => setEditForm((p) => ({ ...p, brand: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Modelo</Label><Input value={editForm.model} onChange={(e) => setEditForm((p) => ({ ...p, model: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Ano</Label><Input type="number" value={editForm.year} onChange={(e) => setEditForm((p) => ({ ...p, year: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Placas</Label><Input value={editForm.plates} onChange={(e) => setEditForm((p) => ({ ...p, plates: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Permiso</Label><Input value={editForm.permit} onChange={(e) => setEditForm((p) => ({ ...p, permit: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v as VehicleStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(statusConfig) as VehicleStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Chofer asignado</Label>
                <Select value={editForm.driverId} onValueChange={(v) => setEditForm((p) => ({ ...p, driverId: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" className="flex-1" onClick={() => setEditModal(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={saveEdit} disabled={loading}>
                <Check className="w-3.5 h-3.5 mr-1.5" />{loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL BITACORA ── */}
      {logModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Agregar a bitacora</h2>
                <p className="text-sm text-slate-500 mt-0.5">{logModal.brand} {logModal.model} {logModal.plates ? `· ${logModal.plates}` : ""}</p>
              </div>
              <button onClick={() => setLogModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <Select value={logForm.type} onValueChange={(v) => setLogForm((p) => ({ ...p, type: v as VehicleLogType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(logTypeLabels) as VehicleLogType[]).map((t) => (
                        <SelectItem key={t} value={t}>{logTypeLabels[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha *</Label>
                  <Input type="date" value={logForm.date} onChange={(e) => setLogForm((p) => ({ ...p, date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descripcion *</Label>
                <Input value={logForm.description} onChange={(e) => setLogForm((p) => ({ ...p, description: e.target.value }))} placeholder="Cambio de aceite, revision de frenos..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Costo ($)</Label>
                  <Input type="number" step="0.01" value={logForm.cost} onChange={(e) => setLogForm((p) => ({ ...p, cost: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tecnico</Label>
                  <Input value={logForm.technician} onChange={(e) => setLogForm((p) => ({ ...p, technician: e.target.value }))} placeholder="Nombre del tecnico..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notas adicionales</Label>
                <Input value={logForm.notes} onChange={(e) => setLogForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Observaciones..." />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" className="flex-1" onClick={() => setLogModal(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={addLog} disabled={!logForm.description.trim() || loading}>
                {loading ? "Guardando..." : "Registrar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CHECKLIST ── */}
      {checklistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Checklist de revision</h2>
                <p className="text-sm text-slate-500 mt-0.5">{checklistModal.brand} {checklistModal.model} {checklistModal.plates ? `· ${checklistModal.plates}` : ""}</p>
              </div>
              <button onClick={() => setChecklistModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Chofer</Label>
                  <Select value={checklistDriverId} onValueChange={(v) => setChecklistDriverId(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <p className="text-sm text-slate-600 pt-2">{format(new Date(), "d 'de' MMMM yyyy", { locale: es })}</p>
                </div>
              </div>

              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{cat}</p>
                  <div className="space-y-2">
                    {checklistItems.filter((i) => i.category === cat).map((item, globalIdx) => {
                      const idx = checklistItems.findIndex((ci) => ci.category === item.category && ci.description === item.description)
                      const cfg = itemStatusConfig[item.status]
                      const Icon = cfg.icon
                      return (
                        <div key={globalIdx} className="flex items-center gap-3">
                          <span className="text-sm text-slate-700 flex-1">{item.description}</span>
                          <div className="flex gap-1">
                            {(Object.keys(itemStatusConfig) as VehicleItemStatus[]).map((s) => {
                              const sc = itemStatusConfig[s]
                              const Ic = sc.icon
                              return (
                                <button
                                  key={s}
                                  onClick={() => setChecklistItems((prev) => prev.map((ci, i) => i === idx ? { ...ci, status: s } : ci))}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                    item.status === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                  }`}
                                  title={sc.label}
                                >
                                  <Ic className="w-3.5 h-3.5" />
                                </button>
                              )
                            })}
                          </div>
                          <Input
                            className="w-32 h-7 text-xs"
                            placeholder="Nota..."
                            value={item.notes}
                            onChange={(e) => setChecklistItems((prev) => prev.map((ci, i) => i === idx ? { ...ci, notes: e.target.value } : ci))}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="space-y-1.5">
                <Label>Observaciones generales</Label>
                <Textarea rows={2} value={checklistObs} onChange={(e) => setChecklistObs(e.target.value)} placeholder="Notas adicionales..." className="text-sm" />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" className="flex-1" onClick={() => setChecklistModal(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={saveChecklist} disabled={loading}>
                {loading ? "Guardando..." : "Guardar checklist"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
