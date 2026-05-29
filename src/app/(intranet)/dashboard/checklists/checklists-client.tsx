"use client"

import { useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ClipboardList, Trash2, CheckSquare, Square, ChevronDown, ChevronUp, Paperclip, FileText, Download, Printer } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type CheckListType = "OPERATIVO" | "SEGURIDAD" | "MANTENIMIENTO" | "INSPECCION"

const typeConfig: Record<CheckListType, { label: string; color: string }> = {
  OPERATIVO:     { label: "Operativo",     color: "bg-blue-100 text-blue-700" },
  SEGURIDAD:     { label: "Seguridad",     color: "bg-red-100 text-red-700" },
  MANTENIMIENTO: { label: "Mantenimiento", color: "bg-amber-100 text-amber-700" },
  INSPECCION:    { label: "Inspeccion",    color: "bg-purple-100 text-purple-700" },
}

interface CheckListItem {
  id: string
  description: string
  isCompleted: boolean
  completedAt?: string | null
  order: number
}

interface CheckList {
  id: string
  title: string
  type: CheckListType
  completedAt?: string | null
  items: CheckListItem[]
  project?: { name: string } | null
  equipment?: { name: string } | null
  createdBy?: { name?: string | null } | null
  createdAt: string
  fileUrl?: string | null
  fileName?: string | null
  observations?: string | null
}

interface Props {
  lists: CheckList[]
  projects: { id: string; name: string }[]
  equipment: { id: string; name: string }[]
  isAdmin: boolean
}

export function ChecklistsClient({ lists: initial, projects, equipment, isAdmin }: Props) {
  const [lists, setLists] = useState<CheckList[]>(initial)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState("all")
  const [form, setForm] = useState({
    title: "", type: "OPERATIVO" as CheckListType,
    projectId: "", equipmentId: "",
    items: [{ description: "" }, { description: "" }, { description: "" }],
  })
  const [loading, setLoading] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [editingObsId, setEditingObsId] = useState<string | null>(null)
  const [obsText, setObsText] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)

  const filtered = useMemo(() =>
    lists.filter((l) => filterType === "all" || l.type === filterType),
    [lists, filterType]
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const validItems = form.items.filter((i) => i.description.trim())
    if (!validItems.length) { setLoading(false); return }

    const res = await fetch("/api/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        type: form.type,
        projectId: form.projectId || null,
        equipmentId: form.equipmentId || null,
        items: validItems.map((i, idx) => ({ description: i.description, order: idx })),
      }),
    })
    if (res.ok) {
      const list = await res.json()
      setLists((p) => [list, ...p])
      setShowForm(false)
      setForm({ title: "", type: "OPERATIVO", projectId: "", equipmentId: "", items: [{ description: "" }, { description: "" }, { description: "" }] })
    }
    setLoading(false)
  }

  async function toggleItem(listId: string, itemId: string, current: boolean) {
    const res = await fetch(`/api/checklists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, isCompleted: !current }),
    })
    if (res.ok) {
      setLists((p) => p.map((l) => {
        if (l.id !== listId) return l
        const items = l.items.map((i) => i.id === itemId ? { ...i, isCompleted: !current } : i)
        const completedAt = items.every((i) => i.isCompleted) ? new Date().toISOString() : null
        return { ...l, items, completedAt }
      }))
    }
  }

  async function deleteList(id: string) {
    const res = await fetch(`/api/checklists/${id}`, { method: "DELETE" })
    if (res.ok) setLists((p) => p.filter((l) => l.id !== id))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetId) return
    setUploadingId(uploadTargetId)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("checklistId", uploadTargetId)
    const res = await fetch("/api/checklists/upload", { method: "POST", body: fd })
    if (res.ok) {
      const { url, fileName } = await res.json()
      setLists((p) => p.map((l) => l.id === uploadTargetId ? { ...l, fileUrl: url, fileName } : l))
    }
    setUploadingId(null)
    setUploadTargetId(null)
    e.target.value = ""
  }

  async function saveObservations(id: string) {
    const res = await fetch(`/api/checklists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observations: obsText }),
    })
    if (res.ok) {
      setLists((p) => p.map((l) => l.id === id ? { ...l, observations: obsText } : l))
      setEditingObsId(null)
    }
  }

  function printChecklist(list: CheckList) {
    const win = window.open("", "_blank")
    if (!win) return
    const done = list.items.filter((i) => i.isCompleted).length
    win.document.write(`
      <html><head><title>${list.title}</title>
      <style>
        body { font-family: Calibri, sans-serif; padding: 32px; color: #1e293b; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
        .item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .box { width: 16px; height: 16px; border: 2px solid #cbd5e1; border-radius: 4px; flex-shrink: 0; margin-top: 2px; background: ${list.completedAt ? "#22c55e" : "white"}; }
        .checked { background: #22c55e; border-color: #16a34a; }
        .obs { margin-top: 24px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
        .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <h1>${list.title}</h1>
        <div class="meta">
          ${list.type} &nbsp;·&nbsp;
          ${list.project?.name ? `Proyecto: ${list.project.name} &nbsp;·&nbsp; ` : ""}
          ${list.equipment?.name ? `Equipo: ${list.equipment.name} &nbsp;·&nbsp; ` : ""}
          ${done}/${list.items.length} completados
          ${list.completedAt ? "&nbsp;·&nbsp; <strong>COMPLETADO</strong>" : ""}
        </div>
        ${list.items.map((i) => `
          <div class="item">
            <div class="box ${i.isCompleted ? "checked" : ""}"></div>
            <span>${i.description}</span>
          </div>
        `).join("")}
        ${list.observations ? `<div class="obs"><strong>Observaciones / Bitacora:</strong><p style="margin:8px 0 0">${list.observations.replace(/\n/g, "<br>")}</p></div>` : ""}
        <div class="footer">RIM Rigging &nbsp;·&nbsp; ${format(new Date(), "d/MM/yyyy HH:mm")}</div>
        <script>window.onload = () => window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Check Lists</h1>
          <p className="text-sm text-slate-500 mt-0.5">{lists.length} lista(s) activa(s)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" />Nueva lista
        </Button>
      </div>

      {/* Filtro tipo */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...Object.keys(typeConfig)].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === t ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t === "all" ? "Todos" : typeConfig[t as CheckListType].label}
          </button>
        ))}
      </div>

      {/* Formulario */}
      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Titulo *</Label>
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Ej: Inspeccion previa al proyecto..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: (v ?? "OPERATIVO") as CheckListType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(typeConfig) as CheckListType[]).map((t) => (
                        <SelectItem key={t} value={t}>{typeConfig[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Proyecto</Label>
                  <Select value={form.projectId} onValueChange={(v) => setForm((p) => ({ ...p, projectId: v ?? "" }))}>
                    <SelectTrigger><SelectValue placeholder="Sin proyecto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin proyecto</SelectItem>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Equipo</Label>
                  <Select value={form.equipmentId} onValueChange={(v) => setForm((p) => ({ ...p, equipmentId: v ?? "" }))}>
                    <SelectTrigger><SelectValue placeholder="Sin equipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin equipo</SelectItem>
                      {equipment.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Items de la lista *</Label>
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item.description}
                      onChange={(e) => {
                        const items = [...form.items]
                        items[i] = { description: e.target.value }
                        setForm((p) => ({ ...p, items }))
                      }}
                      placeholder={`Item ${i + 1}...`}
                    />
                  </div>
                ))}
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={() => setForm((p) => ({ ...p, items: [...p.items, { description: "" }] }))}
                >
                  + Agregar item
                </Button>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>{loading ? "Creando..." : "Crear lista"}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Listas */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-8">Sin listas</p>}
        {filtered.map((list) => {
          const tc = typeConfig[list.type]
          const done = list.items.filter((i) => i.isCompleted).length
          const total = list.items.length
          const pct = total ? Math.round((done / total) * 100) : 0
          const isExpanded = expandedId === list.id

          return (
            <div key={list.id} className="bg-white border border-slate-200 rounded-xl">
              <button
                type="button"
                className="w-full text-left px-4 py-3 flex items-center gap-3"
                onClick={() => setExpandedId(isExpanded ? null : list.id)}
              >
                <ClipboardList className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900">{list.title}</p>
                    <Badge className={`text-xs border-0 ${tc.color}`}>{tc.label}</Badge>
                    {list.completedAt && <Badge className="text-xs border-0 bg-green-100 text-green-700">Completado</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-32">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{done}/{total}</span>
                    {list.project && <span className="text-xs text-slate-400">{list.project.name}</span>}
                    {list.equipment && <span className="text-xs text-slate-400">{list.equipment.name}</span>}
                    {list.fileUrl && <span className="text-xs text-blue-500 flex items-center gap-0.5"><Paperclip className="w-3 h-3" />Doc</span>}
                    {list.observations && <span className="text-xs text-amber-600 flex items-center gap-0.5"><FileText className="w-3 h-3" />Bitacora</span>}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                  {/* Items */}
                  <div className="space-y-1.5">
                    {list.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex items-center gap-3 w-full text-left group"
                        onClick={() => toggleItem(list.id, item.id, item.isCompleted)}
                      >
                        {item.isCompleted
                          ? <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                          : <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                        }
                        <span className={`text-sm ${item.isCompleted ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {item.description}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Documento adjunto */}
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Documento adjunto</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {list.fileUrl ? (
                        <a
                          href={list.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {list.fileName ?? "Descargar documento"}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Sin documento adjunto</span>
                      )}
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={uploadingId === list.id}
                          onClick={() => {
                            setUploadTargetId(list.id)
                            fileInputRef.current?.click()
                          }}
                        >
                          <Paperclip className="w-3 h-3 mr-1" />
                          {uploadingId === list.id ? "Subiendo..." : list.fileUrl ? "Reemplazar" : "Adjuntar"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => printChecklist(list)}
                      >
                        <Printer className="w-3 h-3 mr-1" />
                        Imprimir
                      </Button>
                    </div>
                  </div>

                  {/* Bitacora / Observaciones */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bitacora / Observaciones</p>
                      {isAdmin && editingObsId !== list.id && (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => { setEditingObsId(list.id); setObsText(list.observations ?? "") }}
                        >
                          {list.observations ? "Editar" : "Agregar"}
                        </button>
                      )}
                    </div>
                    {editingObsId === list.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={obsText}
                          onChange={(e) => setObsText(e.target.value)}
                          rows={4}
                          placeholder="Anota observaciones, hallazgos de mantenimiento, incidencias..."
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={() => saveObservations(list.id)}>Guardar</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingObsId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : list.observations ? (
                      <p className="text-sm text-slate-600 whitespace-pre-wrap bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-100">
                        {list.observations}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">Sin observaciones registradas</p>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-700 pt-1"
                      onClick={() => deleteList(list.id)}
                    >
                      Eliminar lista
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <input
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
    </div>
  )
}
