"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Wrench } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const statusConfig = {
  PENDIENTE:  { label: "Pendiente",    variant: "secondary" as const },
  APROBADO:   { label: "En proceso",   variant: "default" as const },
  RECHAZADO:  { label: "Cancelado",    variant: "destructive" as const },
  SURTIDO:    { label: "Resuelto",     variant: "default" as const },
}

interface Props {
  repairs: any[]
  tools: any[]
  equipment: any[]
  isAdmin: boolean
  search: string
  onUpdate: (repairs: any[]) => void
}

export function RepairsTab({ repairs, tools, equipment, isAdmin, search, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ toolId: "", equipmentId: "", description: "", priority: "NORMAL" })
  const [itemType, setItemType] = useState<"tool" | "equipment">("equipment")
  const [loading, setLoading] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveForm, setResolveForm] = useState({ resolution: "", cost: "" })

  const filtered = useMemo(() =>
    repairs.filter((r) =>
      !search ||
      r.tool?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.equipment?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    ), [repairs, search])

  async function submit() {
    setLoading(true)
    const payload: any = { description: form.description, priority: form.priority }
    if (itemType === "tool" && form.toolId) payload.toolId = form.toolId
    if (itemType === "equipment" && form.equipmentId) payload.equipmentId = form.equipmentId

    const res = await fetch("/api/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const repair = await res.json()
      const tool = tools.find((t) => t.id === form.toolId)
      const eq = equipment.find((e) => e.id === form.equipmentId)
      onUpdate([{ ...repair, tool: tool ? { name: tool.name, code: tool.code } : null, equipment: eq ? { name: eq.name, code: eq.code } : null }, ...repairs])
      setShowForm(false)
      setForm({ toolId: "", equipmentId: "", description: "", priority: "NORMAL" })
    }
    setLoading(false)
  }

  async function resolveRepair(id: string) {
    const res = await fetch(`/api/repairs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "SURTIDO",
        resolution: resolveForm.resolution || null,
        cost: resolveForm.cost ? parseFloat(resolveForm.cost) : null,
      }),
    })
    if (res.ok) {
      onUpdate(repairs.map((r) => r.id === id ? { ...r, status: "SURTIDO", resolution: resolveForm.resolution } : r))
      setResolvingId(null)
      setResolveForm({ resolution: "", cost: "" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1.5" /> Solicitar reparacion
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo de activo</Label>
            <div className="flex gap-2">
              <Button size="sm" variant={itemType === "equipment" ? "default" : "outline"} onClick={() => setItemType("equipment")}>Equipo</Button>
              <Button size="sm" variant={itemType === "tool" ? "default" : "outline"} onClick={() => setItemType("tool")}>Herramienta</Button>
            </div>
          </div>

          {itemType === "equipment" ? (
            <div className="space-y-1.5">
              <Label>Equipo *</Label>
              <Select value={form.equipmentId} onValueChange={(v) => setForm((p) => ({ ...p, equipmentId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  {equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} {e.code ? `(${e.code})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Herramienta *</Label>
              <Select value={form.toolId} onValueChange={(v) => setForm((p) => ({ ...p, toolId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  {tools.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} {t.code ? `(${t.code})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Descripcion del problema *</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe la falla o dano..." />
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
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={!form.description || (itemType === "equipment" ? !form.equipmentId : !form.toolId) || loading}>Enviar</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Sin solicitudes de reparacion</p>}
        {filtered.map((repair) => {
          const st = statusConfig[repair.status as keyof typeof statusConfig]
          const asset = repair.equipment ?? repair.tool
          return (
            <div key={repair.id} className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-800">{asset?.name}</p>
                  {asset?.code && <span className="text-xs text-slate-400 font-mono">{asset.code}</span>}
                  {repair.priority === "URGENTE" && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Urgente</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{repair.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {format(new Date(repair.createdAt), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                  {isAdmin && repair.status === "PENDIENTE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setResolvingId(resolvingId === repair.id ? null : repair.id)}
                    >
                      Marcar resuelto
                    </Button>
                  )}
                </div>
                {repair.resolution && (
                  <p className="text-xs text-slate-500 max-w-48 text-right">{repair.resolution}</p>
                )}
                {resolvingId === repair.id && (
                  <div className="flex flex-col gap-1.5 min-w-56">
                    <Input
                      placeholder="Descripcion de la reparacion..."
                      value={resolveForm.resolution}
                      onChange={(e) => setResolveForm((p) => ({ ...p, resolution: e.target.value }))}
                      className="h-7 text-xs"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Costo ($) opcional"
                      value={resolveForm.cost}
                      onChange={(e) => setResolveForm((p) => ({ ...p, cost: e.target.value }))}
                      className="h-7 text-xs"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={() => resolveRepair(repair.id)}>Confirmar</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setResolvingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
