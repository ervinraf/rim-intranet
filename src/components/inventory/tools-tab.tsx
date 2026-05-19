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
import { Plus, ArrowRightLeft, RotateCcw, Wrench, Printer } from "lucide-react"

const statusConfig = {
  DISPONIBLE: { label: "Disponible", className: "bg-green-100 text-green-700" },
  ASIGNADO: { label: "Asignado", className: "bg-amber-100 text-amber-700" },
  EN_PROYECTO: { label: "En proyecto", className: "bg-blue-100 text-blue-700" },
  EN_REPARACION: { label: "En reparacion", className: "bg-red-100 text-red-700" },
  BAJA: { label: "Baja", className: "bg-slate-100 text-slate-500" },
}

const conditionConfig = {
  BUENA: "text-green-600",
  REGULAR: "text-amber-600",
  MALA: "text-red-600",
  BAJA: "text-slate-400",
}

interface Props {
  tools: any[]
  departments: any[]
  projects: any[]
  employees: any[]
  isAdmin: boolean
  search: string
  onUpdate: (tools: any[]) => void
}

export function ToolsTab({ tools, departments, projects, employees, isAdmin, search, onUpdate }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [checkoutModal, setCheckoutModal] = useState<any | null>(null)
  const [newTool, setNewTool] = useState({ name: "", code: "", brand: "", departmentId: "", location: "" })
  const [checkoutData, setCheckoutData] = useState({ employeeId: "", projectId: "", expectedReturn: "", notes: "" })
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() =>
    tools.filter((t) =>
      !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code?.toLowerCase().includes(search.toLowerCase()) ||
      t.brand?.toLowerCase().includes(search.toLowerCase())
    ), [tools, search])

  async function addTool() {
    setLoading(true)
    const res = await fetch("/api/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTool),
    })
    if (res.ok) {
      const tool = await res.json()
      onUpdate([...tools, { ...tool, checkouts: [] }])
      setNewTool({ name: "", code: "", brand: "", departmentId: "", location: "" })
      setShowAddForm(false)
    }
    setLoading(false)
  }

  async function checkout() {
    if (!checkoutModal || !checkoutData.employeeId) return
    setLoading(true)
    const res = await fetch(`/api/tools/${checkoutModal.id}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkoutData),
    })
    if (res.ok) {
      onUpdate(tools.map((t) =>
        t.id === checkoutModal.id
          ? { ...t, status: "ASIGNADO", checkouts: [{ employee: { fullName: employees.find((e) => e.id === checkoutData.employeeId)?.fullName } }] }
          : t
      ))
      setCheckoutModal(null)
      setCheckoutData({ employeeId: "", projectId: "", expectedReturn: "", notes: "" })
    }
    setLoading(false)
  }

  async function returnTool(toolId: string) {
    setLoading(true)
    await fetch(`/api/tools/${toolId}/checkout`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conditionIn: "BUENA" }),
    })
    onUpdate(tools.map((t) =>
      t.id === toolId ? { ...t, status: "DISPONIBLE", checkouts: [] } : t
    ))
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Agregar herramienta
          </Button>
        </div>
      )}

      {showAddForm && (
        <Card>
          <CardContent className="p-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Nombre *</Label>
              <Input value={newTool.name} onChange={(e) => setNewTool((p) => ({ ...p, name: e.target.value }))} placeholder="Esparraguera 1/2&quot; ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Codigo / No.</Label>
              <Input value={newTool.code} onChange={(e) => setNewTool((p) => ({ ...p, code: e.target.value }))} placeholder="H-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input value={newTool.brand} onChange={(e) => setNewTool((p) => ({ ...p, brand: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Select value={newTool.departmentId} onValueChange={(v) => setNewTool((p) => ({ ...p, departmentId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ubicacion</Label>
              <Input value={newTool.location} onChange={(e) => setNewTool((p) => ({ ...p, location: e.target.value }))} placeholder="Almacen A..." />
            </div>
            <div className="col-span-2 flex gap-2">
              <Button size="sm" onClick={addTool} disabled={!newTool.name || loading}>Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Herramienta</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Codigo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Asignado a</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Condicion</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Sin herramientas</td></tr>
            )}
            {filtered.map((tool) => {
              const st = statusConfig[tool.status as keyof typeof statusConfig]
              const active = tool.checkouts?.[0]
              return (
                <tr key={tool.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{tool.name}</p>
                    {tool.brand && <p className="text-xs text-slate-400">{tool.brand} {tool.model}</p>}
                    {tool.location && <p className="text-xs text-slate-400">{tool.location}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{tool.code ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st?.className}`}>
                      {st?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {active ? (
                      <span>{active.employee?.fullName}{active.project ? ` — ${active.project.name}` : ""}</span>
                    ) : "—"}
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${conditionConfig[tool.condition as keyof typeof conditionConfig]}`}>
                    {tool.condition}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {tool.status === "DISPONIBLE" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCheckoutModal(tool)}>
                          <ArrowRightLeft className="w-3 h-3 mr-1" /> Vale salida
                        </Button>
                      )}
                      {tool.status === "ASIGNADO" && active?.id && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500" onClick={() => window.open(`/vale-salida/${active.id}`, "_blank")}>
                          <Printer className="w-3 h-3 mr-1" /> Imprimir
                        </Button>
                      )}
                      {tool.status === "ASIGNADO" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => returnTool(tool.id)} disabled={loading}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Devolver
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Checkout modal */}
      {checkoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Vale de salida</h2>
              <p className="text-sm text-slate-500 mt-0.5">{checkoutModal.name}</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Empleado que recibe *</Label>
                <Select value={checkoutData.employeeId} onValueChange={(v) => setCheckoutData((p) => ({ ...p, employeeId: v ?? "" }))}>
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
                <Label>Proyecto (opcional)</Label>
                <Select value={checkoutData.projectId} onValueChange={(v) => setCheckoutData((p) => ({ ...p, projectId: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha esperada de devolucion</Label>
                <Input type="date" value={checkoutData.expectedReturn} onChange={(e) => setCheckoutData((p) => ({ ...p, expectedReturn: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Input value={checkoutData.notes} onChange={(e) => setCheckoutData((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setCheckoutModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={checkout} disabled={!checkoutData.employeeId || loading} className="flex-1">
                Registrar vale
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
