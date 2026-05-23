"use client"

import { useState, useRef } from "react"
import { GanttChart } from "@/components/gantt/gantt-chart"
import { ProjectForms } from "@/components/projects/project-forms"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Camera, Link2, Plus, Send, MapPin, User, Calendar, ChevronDown, ChevronUp,
  FileDown, Mail, MessageCircle, Star, Pencil, Trash2, Check, X, Settings, RotateCcw,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const statusConfig = {
  NUEVO: { label: "Nuevo", className: "bg-blue-100 text-blue-700" },
  EN_DESARROLLO: { label: "En desarrollo", className: "bg-amber-100 text-amber-700" },
  CERRADO: { label: "Cerrado", className: "bg-green-100 text-green-700" },
}

interface Task {
  id: string
  name: string
  description?: string | null
  startDate: string
  endDate: string
  actualStartDate?: string | null
  actualEndDate?: string | null
  progress: number
  color?: string | null
  photos: Photo[]
}

interface Photo {
  id: string
  url: string
  caption?: string | null
  takenAt: string
  taskId?: string | null
}

interface Update {
  id: string
  note: string
  createdAt: string
}

interface Project {
  id: string
  name: string
  clientName: string
  clientEmail?: string | null
  location?: string | null
  description?: string | null
  status: "NUEVO" | "EN_DESARROLLO" | "CERRADO"
  startDate: string
  endDate?: string | null
  progress: number
  accessToken: string
  tasks: Task[]
  photos: Photo[]
  updates: Update[]
}

interface ProjectDetailClientProps {
  project: Project
  isAdmin: boolean
}

export function ProjectDetailClient({ project: initial, isAdmin }: ProjectDetailClientProps) {
  const [project, setProject] = useState(initial)
  const [tasks, setTasks] = useState(initial.tasks)
  const [note, setNote] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [newTaskForm, setNewTaskForm] = useState(false)
  const [newTask, setNewTask] = useState({ name: "", startDate: "", endDate: "", description: "" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTaskForPhoto, setActiveTaskForPhoto] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editTaskForm, setEditTaskForm] = useState({ name: "", startDate: "", endDate: "", description: "" })
  const [deletingTask, setDeletingTask] = useState<string | null>(null)
  const [editingActual, setEditingActual] = useState<string | null>(null)
  const [actualForm, setActualForm] = useState({ actualStartDate: "", actualEndDate: "" })
  const [editProjectModal, setEditProjectModal] = useState(false)
  const [editProjectForm, setEditProjectForm] = useState({
    name: initial.name,
    clientName: initial.clientName,
    clientEmail: initial.clientEmail ?? "",
    location: initial.location ?? "",
    description: initial.description ?? "",
    startDate: initial.startDate.slice(0, 10),
    endDate: initial.endDate?.slice(0, 10) ?? "",
    status: initial.status,
  })
  const [savingProject, setSavingProject] = useState(false)

  const clientPortalUrl = `${window.location.origin}/cliente?token=${project.accessToken}`
  const [emailModal, setEmailModal] = useState(false)
  const [emailAddr, setEmailAddr] = useState(project.clientEmail ?? "")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Hola ${project.clientName}, te comparto el avance de tu proyecto "${project.name}" (${project.progress}% completado):\n\n${clientPortalUrl}`
    )
    window.open(`https://wa.me/?text=${msg}`, "_blank")
  }

  async function sendEmail() {
    setSendingEmail(true)
    await fetch(`/api/projects/${project.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailAddr, clientName: project.clientName }),
    })
    setSendingEmail(false)
    setEmailSent(true)
    setTimeout(() => { setEmailModal(false); setEmailSent(false) }, 2000)
  }

  function downloadPDF() {
    window.open(`/api/projects/${project.id}/pdf`, "_blank")
  }

  function startEditTask(task: Task) {
    setEditingTask(task.id)
    setEditTaskForm({
      name: task.name,
      startDate: task.startDate.slice(0, 10),
      endDate: task.endDate.slice(0, 10),
      description: task.description ?? "",
    })
  }

  async function saveEditTask(taskId: string) {
    const res = await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editTaskForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)))
      setEditingTask(null)
    }
  }

  async function deleteTask(taskId: string) {
    setDeletingTask(taskId)
    const res = await fetch(`/api/projects/${project.id}/tasks/${taskId}`, { method: "DELETE" })
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    }
    setDeletingTask(null)
  }

  async function handleProgressChange(taskId: string, progress: number) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress } : t)))
  }

  async function saveProgress() {
    setSaving(true)
    await fetch(`/api/projects/${project.id}/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: tasks.map((t) => ({ id: t.id, progress: t.progress })) }),
    })
    setSaving(false)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, taskId?: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    if (taskId) fd.append("taskId", taskId)
    const res = await fetch(`/api/projects/${project.id}/photos`, { method: "POST", body: fd })
    if (res.ok) {
      const photo = await res.json()
      if (taskId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, photos: [photo, ...t.photos] } : t))
        )
      }
    }
    setUploading(false)
    e.target.value = ""
  }

  async function handleAddNote() {
    if (!note.trim()) return
    const res = await fetch(`/api/projects/${project.id}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    })
    if (res.ok) {
      const update = await res.json()
      setProject((p) => ({ ...p, updates: [update, ...p.updates] }))
      setNote("")
    }
  }

  async function saveEditProject() {
    setSavingProject(true)
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editProjectForm,
        endDate: editProjectForm.endDate || undefined,
        clientEmail: editProjectForm.clientEmail || undefined,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProject((p) => ({ ...p, ...updated }))
      setEditProjectModal(false)
    }
    setSavingProject(false)
  }

  async function resetAllProgress() {
    if (!confirm("¿Resetear el progreso de todas las tareas a 0%?")) return
    setSaving(true)
    await fetch(`/api/projects/${project.id}/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: tasks.map((t) => ({ id: t.id, progress: 0 })) }),
    })
    setTasks((prev) => prev.map((t) => ({ ...t, progress: 0 })))
    setProject((p) => ({ ...p, progress: 0 }))
    setSaving(false)
  }

  function startEditActual(task: Task) {
    setEditingActual(task.id)
    setActualForm({
      actualStartDate: task.actualStartDate?.slice(0, 10) ?? "",
      actualEndDate: task.actualEndDate?.slice(0, 10) ?? "",
    })
  }

  async function saveActualDates(taskId: string) {
    const res = await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualStartDate: actualForm.actualStartDate || null,
        actualEndDate: actualForm.actualEndDate || null,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)))
      setEditingActual(null)
    }
  }

  async function handleAddTask() {
    const res = await fetch(`/api/projects/${project.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newTask,
        progress: 0,
        order: tasks.length,
      }),
    })
    if (res.ok) {
      const task = await res.json()
      setTasks((prev) => [...prev, { ...task, photos: [] }])
      setNewTask({ name: "", startDate: "", endDate: "", description: "" })
      setNewTaskForm(false)
    }
  }

  const cfg = statusConfig[project.status]

  return (
    <>
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {project.clientName}
            </span>
            {project.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {project.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(project.startDate), "d MMM yyyy", { locale: es })}
              {project.endDate && (
                <> → {format(new Date(project.endDate), "d MMM yyyy", { locale: es })}</>
              )}
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditProjectModal(true)}>
              <Settings className="w-4 h-4 mr-1.5" />
              Editar proyecto
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPDF}>
              <FileDown className="w-4 h-4 mr-1.5" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={shareWhatsApp} className="text-green-700 border-green-300 hover:bg-green-50">
              <MessageCircle className="w-4 h-4 mr-1.5" />
              WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEmailModal(true)} className="text-blue-700 border-blue-300 hover:bg-blue-50">
              <Mail className="w-4 h-4 mr-1.5" />
              Correo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(clientPortalUrl).then(() => alert("Enlace copiado."))}
            >
              <Link2 className="w-4 h-4 mr-1.5" />
              Copiar link
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => {
                const url = `${window.location.origin}/encuesta?project=${project.id}`
                navigator.clipboard.writeText(url).then(() => alert("Link de encuesta copiado."))
              }}
            >
              <Star className="w-4 h-4 mr-1.5" />
              Encuesta cliente
            </Button>
            <Button variant="outline" size="sm" onClick={resetAllProgress} disabled={saving} className="text-slate-600">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Limpiar avances
            </Button>
            <Button size="sm" onClick={saveProgress} disabled={saving}>
              {saving ? "Guardando..." : "Guardar avances"}
            </Button>
          </div>
        )}
      </div>

      {/* Progreso general */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-slate-500 font-medium">Avance general del proyecto</span>
          <span className="text-slate-900 font-bold">{project.progress}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-700"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gantt — ocupa 2/3 */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Diagrama de Gantt</h2>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewTaskForm(!newTaskForm)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Actividad
              </Button>
            )}
          </div>

          {newTaskForm && (
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nombre de la actividad</Label>
                  <Input
                    value={newTask.name}
                    onChange={(e) => setNewTask((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Instalacion de estructura..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Inicio</Label>
                  <Input
                    type="date"
                    value={newTask.startDate}
                    onChange={(e) => setNewTask((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fin</Label>
                  <Input
                    type="date"
                    value={newTask.endDate}
                    onChange={(e) => setNewTask((p) => ({ ...p, endDate: e.target.value }))}
                    min={newTask.startDate}
                  />
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button size="sm" onClick={handleAddTask} disabled={!newTask.name || !newTask.startDate || !newTask.endDate}>
                    Agregar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewTaskForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tasks.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
              <p className="text-slate-400 text-sm">Sin actividades. Agrega la primera.</p>
            </div>
          ) : (
            <GanttChart
              tasks={tasks}
              projectStart={project.startDate}
              projectEnd={project.endDate}
              onProgressChange={isAdmin ? handleProgressChange : undefined}
              readOnly={!isAdmin}
            />
          )}

          {/* Fotos por actividad */}
          <div className="space-y-3 mt-4">
            <h2 className="text-base font-semibold text-slate-800">Fotos por actividad</h2>
            {tasks.map((task) => (
              <Card key={task.id} className="border-slate-200">
                {editingTask === task.id ? (
                  <div className="px-4 py-3 space-y-2">
                    <Input
                      value={editTaskForm.name}
                      onChange={(e) => setEditTaskForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Nombre de la actividad"
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={editTaskForm.startDate}
                        onChange={(e) => setEditTaskForm((p) => ({ ...p, startDate: e.target.value }))}
                        className="text-sm"
                      />
                      <Input
                        type="date"
                        value={editTaskForm.endDate}
                        min={editTaskForm.startDate}
                        onChange={(e) => setEditTaskForm((p) => ({ ...p, endDate: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    <Input
                      value={editTaskForm.description}
                      onChange={(e) => setEditTaskForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Descripcion (opcional)"
                      className="text-sm"
                    />
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => saveEditTask(task.id)} disabled={!editTaskForm.name}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTask(null)}>
                        <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                      onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    >
                      <span className="text-sm font-medium text-slate-800 truncate">{task.name}</span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">{task.photos.length} fotos</Badge>
                      <span className="text-xs text-slate-400 flex-shrink-0">{task.progress}%</span>
                    </button>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      {isAdmin && (
                        <>
                          <button
                            className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                            onClick={() => startEditActual(task)}
                            title="Registrar fechas reales"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            onClick={() => startEditTask(task)}
                            title="Editar actividad"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                            onClick={() => deleteTask(task.id)}
                            disabled={deletingTask === task.id}
                            title="Eliminar actividad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {expandedTask === task.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                )}

                {editingActual === task.id && (
                  <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 space-y-2">
                    <p className="text-xs font-medium text-blue-700">Fechas reales de ejecucion</p>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-500">Inicio real</label>
                        <Input
                          type="date"
                          value={actualForm.actualStartDate}
                          onChange={(e) => setActualForm((p) => ({ ...p, actualStartDate: e.target.value }))}
                          className="text-sm h-8"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-500">Fin real</label>
                        <Input
                          type="date"
                          value={actualForm.actualEndDate}
                          onChange={(e) => setActualForm((p) => ({ ...p, actualEndDate: e.target.value }))}
                          className="text-sm h-8"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => saveActualDates(task.id)}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingActual(null)}>
                        <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {expandedTask === task.id && (
                  <CardContent className="pt-0 pb-4 px-4">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                      {task.photos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                          <img
                            src={photo.url}
                            alt={photo.caption ?? "foto de avance"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {task.photos.length === 0 && (
                        <p className="col-span-4 text-xs text-slate-400 py-2">Sin fotos aun</p>
                      )}
                    </div>
                    {isAdmin && (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={(e) => handlePhotoUpload(e, activeTaskForPhoto ?? undefined)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={uploading}
                          onClick={() => {
                            setActiveTaskForPhoto(task.id)
                            fileInputRef.current?.click()
                          }}
                        >
                          <Camera className="w-4 h-4 mr-1.5" />
                          {uploading ? "Subiendo..." : "Agregar foto"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar derecho */}
        <div className="space-y-4">
          {/* Bitacora de actualizaciones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Bitacora de avances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAdmin && (
                <div className="space-y-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Agrega una nota de avance..."
                    rows={2}
                    className="text-sm"
                  />
                  <Button size="sm" className="w-full" onClick={handleAddNote} disabled={!note.trim()}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Publicar
                  </Button>
                </div>
              )}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {project.updates.length === 0 && (
                  <p className="text-xs text-slate-400">Sin actualizaciones aun</p>
                )}
                {project.updates.map((u) => (
                  <div key={u.id} className="border-l-2 border-amber-300 pl-3">
                    <p className="text-sm text-slate-700">{u.note}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(new Date(u.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enlace para el cliente */}
          {/* Formatos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Formatos de proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectForms
                projectId={project.id}
                projectName={project.name}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-amber-800 mb-1">Portal del cliente</p>
                <p className="text-xs text-amber-700 mb-2">
                  Comparte este enlace con {project.clientName} para que vea el avance en tiempo real.
                </p>
                <div className="bg-white border border-amber-200 rounded px-2 py-1.5 text-xs text-slate-600 break-all font-mono mb-2">
                  {clientPortalUrl}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => navigator.clipboard.writeText(clientPortalUrl)}
                >
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  Copiar enlace
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>

    {/* Modal editar proyecto */}
    {editProjectModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Editar proyecto</h2>
          </div>
          <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Nombre del proyecto</Label>
              <Input value={editProjectForm.name} onChange={(e) => setEditProjectForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input value={editProjectForm.clientName} onChange={(e) => setEditProjectForm((p) => ({ ...p, clientName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email cliente</Label>
                <Input type="email" value={editProjectForm.clientEmail} onChange={(e) => setEditProjectForm((p) => ({ ...p, clientEmail: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ubicacion</Label>
              <Input value={editProjectForm.location} onChange={(e) => setEditProjectForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha inicio</Label>
                <Input type="date" value={editProjectForm.startDate} onChange={(e) => setEditProjectForm((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Input type="date" value={editProjectForm.endDate} min={editProjectForm.startDate} onChange={(e) => setEditProjectForm((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <select
                value={editProjectForm.status}
                onChange={(e) => setEditProjectForm((p) => ({ ...p, status: e.target.value as "NUEVO" | "EN_DESARROLLO" | "CERRADO" }))}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="NUEVO">Nuevo</option>
                <option value="EN_DESARROLLO">En desarrollo</option>
                <option value="CERRADO">Cerrado</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setEditProjectModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={saveEditProject} disabled={savingProject || !editProjectForm.name} className="flex-1">
              {savingProject ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Modal email */}
    {emailModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Enviar avance por correo</h2>
            <p className="text-xs text-slate-400 mt-0.5">{project.name}</p>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Correo del cliente</Label>
              <Input
                type="email"
                value={emailAddr}
                onChange={(e) => setEmailAddr(e.target.value)}
                placeholder="cliente@empresa.com"
              />
            </div>
            {emailSent && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                Correo enviado correctamente
              </p>
            )}
          </div>
          <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setEmailModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={sendEmail} disabled={!emailAddr || sendingEmail} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {sendingEmail ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
