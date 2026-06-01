"use client"

import { useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, FileText, ChevronDown, ChevronUp, ClipboardList, Printer, Camera, FileSpreadsheet, FileUp, ExternalLink, Trash2 } from "lucide-react"
import { ImportInventoryModal } from "./import-inventory-modal"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const statusConfig = {
  DISPONIBLE:    { label: "Disponible",    className: "bg-green-100 text-green-700" },
  EN_PROYECTO:   { label: "En proyecto",   className: "bg-blue-100 text-blue-700" },
  EN_REPARACION: { label: "En reparacion", className: "bg-red-100 text-red-700" },
  ASIGNADO:      { label: "Asignado",      className: "bg-amber-100 text-amber-700" },
  BAJA:          { label: "Baja",          className: "bg-slate-100 text-slate-500" },
}

const logTypeLabels: Record<string, string> = {
  SERVICIO: "Servicio", INSPECCION: "Inspeccion", INCIDENCIA: "Incidencia",
  ENTREGA: "Entrega", RECEPCION: "Recepcion", REPARACION: "Reparacion",
}

interface Props {
  equipment: any[]
  departments: any[]
  projects: any[]
  isAdmin: boolean
  search: string
  onUpdate: (eq: any[]) => void
}

export function EquipmentTab({ equipment, departments, projects, isAdmin, search, onUpdate }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [logModal, setLogModal] = useState<any | null>(null)
  const [techModal, setTechModal] = useState<any | null>(null)
  const [newEquip, setNewEquip] = useState({ name: "", code: "", brand: "", model: "", serialNumber: "", departmentId: "", nextServiceDate: "" })
  const [logData, setLogData] = useState({ type: "INSPECCION", description: "", projectId: "" })
  const [loading, setLoading] = useState(false)

  const defaultSpecs = { capacidad: "", pesoBruto: "", dimensiones: "", potencia: "", voltaje: "", combustible: "", certificaciones: "", añoFabricacion: "", noEconomico: "", observaciones: "", photoUrl: "" }
  const [techData, setTechData] = useState<Record<string, string>>(defaultSpecs)
  const [purchaseDate, setPurchaseDate] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [techError, setTechError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingSheet, setUploadingSheet] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const sheetInputRef = useRef<HTMLInputElement>(null)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setTechError(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("folder", "equipment")
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (res.ok) {
      const { url } = await res.json()
      setTechData((p) => ({ ...p, photoUrl: url }))
    } else {
      const data = await res.json().catch(() => ({}))
      setTechError(data.error ?? "Error al subir la foto")
    }
    setUploadingPhoto(false)
    e.target.value = ""
  }

  async function handleSheetUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !techModal) return
    setUploadingSheet(true)
    setTechError(null)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch(`/api/equipment/${techModal.id}/technical-sheet`, { method: "POST", body: fd })
    if (res.ok) {
      const { url, fileName } = await res.json()
      onUpdate(equipment.map((e) => e.id === techModal.id ? { ...e, technicalSheetUrl: url, technicalSheetName: fileName } : e))
      setTechModal((p: any) => p ? { ...p, technicalSheetUrl: url, technicalSheetName: fileName } : p)
    } else {
      const data = await res.json().catch(() => ({}))
      setTechError(data.error ?? "Error al subir el archivo")
    }
    setUploadingSheet(false)
    e.target.value = ""
  }

  async function deleteSheet() {
    if (!techModal) return
    await fetch(`/api/equipment/${techModal.id}/technical-sheet`, { method: "DELETE" })
    onUpdate(equipment.map((e) => e.id === techModal.id ? { ...e, technicalSheetUrl: null, technicalSheetName: null } : e))
    setTechModal((p: any) => p ? { ...p, technicalSheetUrl: null, technicalSheetName: null } : p)
  }

  async function saveTech() {
    if (!techModal) return
    setLoading(true)
    setTechError(null)
    const res = await fetch(`/api/equipment/${techModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicalSpecs: techData, purchaseDate: purchaseDate || null, purchasePrice: purchasePrice || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdate(equipment.map((e) => e.id === updated.id ? { ...e, ...updated } : e))
      setTechModal(null)
    } else {
      const data = await res.json().catch(() => ({}))
      setTechError(data.error ?? "No se pudo guardar. Verifica tu permiso.")
    }
    setLoading(false)
  }

  function openTechModal(eq: any) {
    const specs = (eq.technicalSpecs as Record<string, string>) ?? {}
    setTechData({ ...defaultSpecs, ...specs })
    setPurchaseDate(eq.purchaseDate ? new Date(eq.purchaseDate).toISOString().slice(0, 10) : "")
    setPurchasePrice(eq.purchasePrice ? String(eq.purchasePrice) : "")
    setTechError(null)
    setTechModal(eq)
  }

  const filtered = useMemo(() =>
    equipment.filter((e) =>
      !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.code?.toLowerCase().includes(search.toLowerCase()) ||
      e.serialNumber?.toLowerCase().includes(search.toLowerCase())
    ), [equipment, search])

  async function addEquipment() {
    setLoading(true)
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEquip),
    })
    if (res.ok) {
      const eq = await res.json()
      onUpdate([...equipment, { ...eq, logs: [] }])
      setNewEquip({ name: "", code: "", brand: "", model: "", serialNumber: "", departmentId: "", nextServiceDate: "" })
      setShowAddForm(false)
    }
    setLoading(false)
  }

  async function addLog() {
    if (!logModal || !logData.description.trim()) return
    setLoading(true)
    const res = await fetch(`/api/equipment/${logModal.id}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData),
    })
    if (res.ok) {
      const newLog = await res.json()
      const statusMap: Record<string, string> = {
        ENTREGA: "EN_PROYECTO", RECEPCION: "DISPONIBLE", REPARACION: "EN_REPARACION",
      }
      const newStatus = statusMap[logData.type] ?? logModal.status
      onUpdate(equipment.map((e) =>
        e.id === logModal.id
          ? { ...e, status: newStatus, logs: [newLog, ...e.logs] }
          : e
      ))
      setLogModal(null)
      setLogData({ type: "INSPECCION", description: "", projectId: "" })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Importar Excel
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-1.5" /> Agregar equipo
          </Button>
        </div>
      )}

      {showAddForm && (
        <Card>
          <CardContent className="p-4 grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-3">
              <Label>Nombre *</Label>
              <Input value={newEquip.name} onChange={(e) => setNewEquip((p) => ({ ...p, name: e.target.value }))} placeholder="Grua Telescopica 50T..." />
            </div>
            {[["code", "Codigo"], ["brand", "Marca"], ["model", "Modelo"], ["serialNumber", "No. Serie"]].map(([field, lbl]) => (
              <div key={field} className="space-y-1.5">
                <Label>{lbl}</Label>
                <Input value={(newEquip as any)[field]} onChange={(e) => setNewEquip((p) => ({ ...p, [field]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Proximo servicio</Label>
              <Input type="date" value={newEquip.nextServiceDate} onChange={(e) => setNewEquip((p) => ({ ...p, nextServiceDate: e.target.value }))} />
            </div>
            <div className="col-span-3 flex gap-2">
              <Button size="sm" onClick={addEquipment} disabled={!newEquip.name || loading}>Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center py-10 text-slate-400 text-sm">Sin equipos</p>
        )}
        {filtered.map((eq) => {
          const st = statusConfig[eq.status as keyof typeof statusConfig]
          const isExpanded = expandedId === eq.id
          const nearService = eq.nextServiceDate && new Date(eq.nextServiceDate) < new Date(Date.now() + 30 * 86400000)

          return (
            <div key={eq.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpandedId(isExpanded ? null : eq.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 text-sm">{eq.name}</p>
                      {nearService && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          Servicio pronto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {eq.brand} {eq.model} {eq.serialNumber ? `· S/N ${eq.serialNumber}` : ""}
                      {eq.department ? ` · ${eq.department.name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st?.className}`}>{st?.label}</span>
                  {eq.project && <span className="text-xs text-slate-500">{eq.project.name}</span>}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openTechModal(eq) }}>
                    <ClipboardList className="w-3 h-3 mr-1" /> Hoja tecnica
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setLogModal(eq) }}>
                    <FileText className="w-3 h-3 mr-1" /> Bitacora
                  </Button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {isExpanded && eq.logs?.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">Bitacora reciente</p>
                  <div className="space-y-2">
                    {eq.logs.slice(0, 3).map((log: any) => (
                      <div key={log.id} className="flex gap-3 text-xs text-slate-600">
                        <span className="text-slate-400 whitespace-nowrap">
                          {format(new Date(log.createdAt), "d MMM", { locale: es })}
                        </span>
                        <span className="bg-slate-100 px-1.5 rounded text-slate-500">{logTypeLabels[log.type]}</span>
                        <span>{log.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showImport && (
        <ImportInventoryModal
          type="equipment"
          onClose={() => setShowImport(false)}
          onImported={() => window.location.reload()}
        />
      )}

      {/* Hoja tecnica modal */}
      {techModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Hoja Tecnica</h2>
                <p className="text-sm text-slate-500 mt-0.5">{techModal.name}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`/hoja-tecnica/${techModal.id}`, "_blank")}
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
              </Button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {[
                ["noEconomico", "No. Economico"],
                ["capacidad", "Capacidad"],
                ["pesoBruto", "Peso bruto"],
                ["dimensiones", "Dimensiones (L x A x H)"],
                ["potencia", "Potencia"],
                ["voltaje", "Voltaje"],
                ["combustible", "Combustible"],
                ["certificaciones", "Certificaciones"],
                ["añoFabricacion", "Año de fabricacion"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={techData[key] ?? ""}
                    onChange={(e) => setTechData((p) => ({ ...p, [key]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Fecha de compra</Label>
                <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Costo de compra ($)</Label>
                <Input type="number" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Observaciones</Label>
                <Input
                  value={techData.observaciones ?? ""}
                  onChange={(e) => setTechData((p) => ({ ...p, observaciones: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder="Notas adicionales..."
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Foto del equipo</Label>
                {techData.photoUrl ? (
                  <div className="relative">
                    <img
                      src={techData.photoUrl}
                      alt="Foto del equipo"
                      className="w-full max-h-40 object-contain rounded-lg border border-slate-200 bg-slate-50"
                    />
                    {isAdmin && (
                      <button
                        className="absolute top-1 right-1 text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 hover:text-red-600"
                        onClick={() => setTechData((p) => ({ ...p, photoUrl: "" }))}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                ) : isAdmin ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={photoInputRef}
                      onChange={handlePhotoUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                      className="h-8 text-xs"
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" />
                      {uploadingPhoto ? "Subiendo..." : "Subir foto"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Sin foto</p>
                )}
              </div>
            </div>
              <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                <Label className="text-xs">Hoja tecnica en PDF</Label>
                <input type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" ref={sheetInputRef} onChange={handleSheetUpload} />
                {techModal.technicalSheetUrl ? (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-xs text-slate-700 flex-1 truncate">{techModal.technicalSheetName}</span>
                    <a href={techModal.technicalSheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {isAdmin && (
                      <button onClick={deleteSheet} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : isAdmin ? (
                  <Button type="button" variant="outline" size="sm" disabled={uploadingSheet} onClick={() => sheetInputRef.current?.click()} className="h-8 text-xs">
                    <FileUp className="w-3.5 h-3.5 mr-1.5" />
                    {uploadingSheet ? "Subiendo..." : "Subir PDF / documento"}
                  </Button>
                ) : (
                  <p className="text-xs text-slate-400">Sin documento adjunto</p>
                )}
              </div>
            {techError && (
              <div className="mx-6 mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {techError}
              </div>
            )}
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setTechModal(null)} className="flex-1">Cancelar</Button>
              {isAdmin && (
                <Button onClick={saveTech} disabled={loading || uploadingPhoto || uploadingSheet} className="flex-1">Guardar hoja tecnica</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Agregar a bitacora</h2>
              <p className="text-sm text-slate-500 mt-0.5">{logModal.name}</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Tipo de evento *</Label>
                <Select value={logData.type} onValueChange={(v) => setLogData((p) => ({ ...p, type: v ?? "INSPECCION" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(logTypeLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descripcion *</Label>
                <Input value={logData.description} onChange={(e) => setLogData((p) => ({ ...p, description: e.target.value }))} placeholder="Detalle del evento..." />
              </div>
              {["ENTREGA", "RECEPCION"].includes(logData.type) && (
                <div className="space-y-1.5">
                  <Label>Proyecto</Label>
                  <Select value={logData.projectId} onValueChange={(v) => setLogData((p) => ({ ...p, projectId: v ?? "" }))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setLogModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={addLog} disabled={!logData.description.trim() || loading} className="flex-1">Registrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
