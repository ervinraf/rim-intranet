"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, Printer, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const LEVANTAMIENTO_FIELDS = [
  { key: "fecha", label: "Fecha de levantamiento", type: "date" },
  { key: "responsable", label: "Responsable RIM", type: "text" },
  { key: "cliente", label: "Cliente / Empresa", type: "text" },
  { key: "contactoCliente", label: "Contacto del cliente", type: "text" },
  { key: "ubicacion", label: "Ubicacion / Direccion", type: "text" },
  { key: "tipoDeTrabajo", label: "Tipo de trabajo (izaje, maniobra, etc.)", type: "text" },
  { key: "descripcionCarga", label: "Descripcion de la carga", type: "textarea" },
  { key: "pesoCarga", label: "Peso de la carga (kg/ton)", type: "text" },
  { key: "dimensionesCarga", label: "Dimensiones de la carga (L x A x H)", type: "text" },
  { key: "radioIzaje", label: "Radio de izaje requerido", type: "text" },
  { key: "alturaMaxima", label: "Altura maxima de izaje", type: "text" },
  { key: "equipoRequerido", label: "Equipo requerido (grua, aparejos, etc.)", type: "textarea" },
  { key: "accesoSitio", label: "Condiciones de acceso al sitio", type: "textarea" },
  { key: "obstaculos", label: "Obstaculos identificados", type: "textarea" },
  { key: "condicionesSuelo", label: "Condiciones del suelo", type: "text" },
  { key: "certificacionesRequeridas", label: "Certificaciones requeridas", type: "text" },
  { key: "observaciones", label: "Observaciones adicionales", type: "textarea" },
]

const CIERRE_FIELDS = [
  { key: "fechaCierre", label: "Fecha de cierre", type: "date" },
  { key: "responsable", label: "Responsable RIM", type: "text" },
  { key: "trabajoRealizado", label: "Descripcion del trabajo realizado", type: "textarea" },
  { key: "equipoUtilizado", label: "Equipo utilizado", type: "textarea" },
  { key: "horasTrabajadas", label: "Horas trabajadas totales", type: "text" },
  { key: "personalInvolucrado", label: "Personal involucrado", type: "textarea" },
  { key: "equipoDevuelto", label: "Equipo devuelto a almacen", type: "textarea" },
  { key: "incidencias", label: "Incidencias durante el proyecto", type: "textarea" },
  { key: "satisfaccionCliente", label: "Satisfaccion del cliente (1-5)", type: "text" },
  { key: "comentariosCliente", label: "Comentarios del cliente", type: "textarea" },
  { key: "recomendaciones", label: "Recomendaciones para futuros proyectos", type: "textarea" },
  { key: "observacionesFinales", label: "Observaciones finales", type: "textarea" },
]

interface ProjectForm {
  id: string
  type: "LEVANTAMIENTO" | "CIERRE"
  data: Record<string, string>
  createdAt: string
  createdBy?: { name?: string | null } | null
}

interface Props {
  projectId: string
  projectName: string
  isAdmin: boolean
}

export function ProjectForms({ projectId, projectName, isAdmin }: Props) {
  const [forms, setForms] = useState<ProjectForm[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState<"LEVANTAMIENTO" | "CIERRE" | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/forms`)
      .then((r) => r.json())
      .then(setForms)
      .finally(() => setLoading(false))
  }, [projectId])

  function openForm(type: "LEVANTAMIENTO" | "CIERRE") {
    const fields = type === "LEVANTAMIENTO" ? LEVANTAMIENTO_FIELDS : CIERRE_FIELDS
    const defaults: Record<string, string> = {}
    fields.forEach((f) => { defaults[f.key] = "" })
    defaults.fecha = defaults.fechaCierre = new Date().toISOString().slice(0, 10)
    setFormData(defaults)
    setShowForm(type)
  }

  async function handleSave() {
    if (!showForm) return
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/forms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: showForm, data: formData }),
    })
    if (res.ok) {
      const form = await res.json()
      setForms((p) => [form, ...p])
      setShowForm(null)
    }
    setSaving(false)
  }

  const fields = showForm === "LEVANTAMIENTO" ? LEVANTAMIENTO_FIELDS : showForm === "CIERRE" ? CIERRE_FIELDS : []

  if (loading) return <div className="h-20 animate-pulse bg-slate-100 rounded-xl" />

  return (
    <div className="space-y-4">
      {isAdmin && !showForm && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openForm("LEVANTAMIENTO")}>
            <Plus className="w-4 h-4 mr-1.5" />Formato de levantamiento
          </Button>
          <Button size="sm" variant="outline" onClick={() => openForm("CIERRE")}>
            <Plus className="w-4 h-4 mr-1.5" />Formato de cierre
          </Button>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">
              {showForm === "LEVANTAMIENTO" ? "Formato de Levantamiento" : "Formato de Cierre de Proyecto"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className={`space-y-1.5 ${f.type === "textarea" ? "col-span-2" : ""}`}>
                  <Label className="text-xs">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={2}
                      value={formData[f.key] ?? ""}
                      onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      type={f.type}
                      value={formData[f.key] ?? ""}
                      onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar formato"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(null)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {forms.length === 0 && !showForm && (
        <p className="text-sm text-slate-400 text-center py-4">Sin formatos registrados</p>
      )}

      {forms.map((form) => {
        const isExpanded = expandedId === form.id
        const fields = form.type === "LEVANTAMIENTO" ? LEVANTAMIENTO_FIELDS : CIERRE_FIELDS

        return (
          <div key={form.id} className="bg-white border border-slate-200 rounded-xl">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setExpandedId(isExpanded ? null : form.id)}
            >
              <ClipboardList className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {form.type === "LEVANTAMIENTO" ? "Levantamiento" : "Cierre de proyecto"}
                </p>
                <p className="text-xs text-slate-500">
                  {format(new Date(form.createdAt), "d MMM yyyy", { locale: es })}
                  {form.createdBy?.name && ` · ${form.createdBy.name}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(`/formato/${form.id}`, "_blank")
                  }}
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />Imprimir
                </Button>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-slate-100 pt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {fields.map((f) => {
                  const val = form.data[f.key]
                  if (!val) return null
                  return (
                    <div key={f.key} className={f.type === "textarea" ? "col-span-2" : ""}>
                      <span className="text-slate-500 text-xs">{f.label}: </span>
                      <span className="text-slate-800">{val}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
