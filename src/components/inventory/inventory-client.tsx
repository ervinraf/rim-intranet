"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Wrench, Package, FileText, AlertTriangle,
  Plus, Search, CheckCircle, ArrowRightLeft,
} from "lucide-react"
import { ToolsTab } from "./tools-tab"
import { EquipmentTab } from "./equipment-tab"
import { RequisitionsTab } from "./requisitions-tab"
import { RepairsTab } from "./repairs-tab"

type Tab = "tools" | "equipment" | "requisitions" | "repairs"

interface Props {
  tools: any[]
  equipment: any[]
  requisitions: any[]
  repairs: any[]
  departments: any[]
  projects: any[]
  employees: any[]
  isAdmin: boolean
}

export function InventoryClient({
  tools: initialTools, equipment: initialEquipment,
  requisitions: initialReqs, repairs: initialRepairs,
  departments, projects, employees, isAdmin,
}: Props) {
  const [tab, setTab] = useState<Tab>("tools")
  const [tools, setTools] = useState(initialTools)
  const [equipment, setEquipment] = useState(initialEquipment)
  const [requisitions, setRequisitions] = useState(initialReqs)
  const [repairs, setRepairs] = useState(initialRepairs)
  const [search, setSearch] = useState("")

  const pendingReqs = requisitions.filter((r) => r.status === "PENDIENTE").length
  const pendingRepairs = repairs.filter((r) => r.status === "PENDIENTE").length
  const unavailableTools = tools.filter((t) => t.status !== "DISPONIBLE").length
  const unavailableEquip = equipment.filter((e) => e.status !== "DISPONIBLE").length

  const tabs = [
    { id: "tools" as Tab, label: "Herramientas", icon: Wrench, count: tools.length, alert: unavailableTools },
    { id: "equipment" as Tab, label: "Equipos", icon: Package, count: equipment.length, alert: unavailableEquip },
    { id: "requisitions" as Tab, label: "Requisiciones", icon: FileText, count: requisitions.length, alert: pendingReqs },
    { id: "repairs" as Tab, label: "Reparaciones", icon: AlertTriangle, count: repairs.length, alert: pendingRepairs },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventario</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {tools.length} herramientas · {equipment.length} equipos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.map((t) => (
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
            {t.alert > 0 && (
              <Badge variant="destructive" className="text-xs h-4 px-1.5">
                {t.alert}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tab content */}
      {tab === "tools" && (
        <ToolsTab
          tools={tools}
          departments={departments}
          projects={projects}
          employees={employees}
          isAdmin={isAdmin}
          search={search}
          onUpdate={setTools}
        />
      )}
      {tab === "equipment" && (
        <EquipmentTab
          equipment={equipment}
          departments={departments}
          projects={projects}
          isAdmin={isAdmin}
          search={search}
          onUpdate={setEquipment}
        />
      )}
      {tab === "requisitions" && (
        <RequisitionsTab
          requisitions={requisitions}
          departments={departments}
          projects={projects}
          isAdmin={isAdmin}
          search={search}
          onUpdate={setRequisitions}
        />
      )}
      {tab === "repairs" && (
        <RepairsTab
          repairs={repairs}
          tools={tools}
          equipment={equipment}
          isAdmin={isAdmin}
          search={search}
          onUpdate={setRepairs}
        />
      )}
    </div>
  )
}
