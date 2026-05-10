"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, CheckCircle, Building2, Clock, Plus, Pencil, Trash2, X } from "lucide-react"

interface Department {
  id: string
  name: string
  description: string | null
  isActive: boolean
  _count: { employees: number }
}

interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  _count: { employees: number }
}

interface Props {
  config: Record<string, string>
  departments: Department[]
  roles: Role[]
}

type Tab = "general" | "departamentos" | "roles"

export function ConfigClient({ config, departments: initialDepts, roles: initialRoles }: Props) {
  const [tab, setTab] = useState<Tab>("general")
  const [logoUrl, setLogoUrl] = useState<string | null>(config.company_logo ?? null)
  const [companyName, setCompanyName] = useState(config.company_name ?? "RIM Rigging")
  const [expirationMonths, setExpirationMonths] = useState(config.hours_bank_expiration_months ?? "6")
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Roles
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [roleForm, setRoleForm] = useState({ name: "", description: "" })
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editRoleForm, setEditRoleForm] = useState({ name: "", description: "" })
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleError, setRoleError] = useState("")

  // Departamentos
  const [depts, setDepts] = useState<Department[]>(initialDepts)
  const [deptForm, setDeptForm] = useState({ name: "", description: "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", description: "" })
  const [deptLoading, setDeptLoading] = useState(false)
  const [deptError, setDeptError] = useState("")
  const [showDeptForm, setShowDeptForm] = useState(false)

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/system/logo", { method: "POST", body: fd })
    if (res.ok) {
      const data = await res.json()
      setLogoUrl(data.url)
    }
    setUploading(false)
    e.target.value = ""
  }

  async function saveConfig() {
    await Promise.all([
      fetch("/api/system/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "company_name", value: companyName }),
      }),
      fetch("/api/system/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "hours_bank_expiration_months", value: expirationMonths }),
      }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault()
    setRoleLoading(true)
    setRoleError("")
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roleForm.name, description: roleForm.description || null }),
    })
    const data = await res.json()
    if (!res.ok) {
      setRoleError(data.error?.fieldErrors?.name?.[0] ?? "Error al crear")
    } else {
      setRoles((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)))
      setRoleForm({ name: "", description: "" })
      setShowRoleForm(false)
    }
    setRoleLoading(false)
  }

  async function updateRole(id: string) {
    setRoleLoading(true)
    setRoleError("")
    const res = await fetch(`/api/roles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editRoleForm.name, description: editRoleForm.description || null }),
    })
    const data = await res.json()
    if (!res.ok) {
      setRoleError(data.error?.fieldErrors?.name?.[0] ?? "Error al guardar")
    } else {
      setRoles((p) => p.map((r) => (r.id === id ? data : r)).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingRoleId(null)
    }
    setRoleLoading(false)
  }

  async function deleteRole(id: string, count: number, isSystem: boolean) {
    if (isSystem) { setRoleError("No se puede eliminar un rol del sistema"); return }
    if (count > 0) { setRoleError(`No se puede eliminar: tiene ${count} empleado(s)`); return }
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" })
    if (res.ok) {
      setRoles((p) => p.filter((r) => r.id !== id))
    } else {
      const data = await res.json()
      setRoleError(data.error ?? "Error al eliminar")
    }
  }

  async function createDept(e: React.FormEvent) {
    e.preventDefault()
    setDeptLoading(true)
    setDeptError("")
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: deptForm.name, description: deptForm.description || null }),
    })
    const data = await res.json()
    if (!res.ok) {
      setDeptError(data.error?.fieldErrors?.name?.[0] ?? "Error al crear")
    } else {
      setDepts((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)))
      setDeptForm({ name: "", description: "" })
      setShowDeptForm(false)
    }
    setDeptLoading(false)
  }

  async function updateDept(id: string) {
    setDeptLoading(true)
    setDeptError("")
    const res = await fetch(`/api/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, description: editForm.description || null }),
    })
    const data = await res.json()
    if (!res.ok) {
      setDeptError(data.error?.fieldErrors?.name?.[0] ?? "Error al guardar")
    } else {
      setDepts((p) => p.map((d) => (d.id === id ? data : d)).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingId(null)
    }
    setDeptLoading(false)
  }

  async function deleteDept(id: string, employeeCount: number) {
    if (employeeCount > 0) {
      setDeptError(`No se puede eliminar: tiene ${employeeCount} empleado(s) activo(s)`)
      return
    }
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" })
    if (res.ok) {
      setDepts((p) => p.filter((d) => d.id !== id))
    } else {
      const data = await res.json()
      setDeptError(data.error ?? "Error al eliminar")
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Configuracion</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { id: "general", label: "General" },
          { id: "departamentos", label: "Departamentos" },
          { id: "roles", label: "Roles" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="space-y-6">
          {/* Logo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Logo de la empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-32 h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <p className="text-xs text-slate-400 text-center px-2">Sin logo</p>
                  )}
                </div>
                <div className="space-y-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    {uploading ? "Subiendo..." : "Subir logo"}
                  </Button>
                  <p className="text-xs text-slate-400">PNG o JPG, max 2MB. Aparece en el PDF y portal del cliente.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* General */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre de la empresa</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="RIM Rigging"
                />
              </div>
            </CardContent>
          </Card>

          {/* Banco de horas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Banco de horas extras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Vencimiento del banco (meses)</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={expirationMonths}
                  onChange={(e) => setExpirationMonths(e.target.value)}
                />
                <p className="text-xs text-slate-400">
                  Las horas acumuladas vencen despues de este numero de meses. Escribe 0 para que nunca venzan.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={saveConfig}>Guardar cambios</Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Guardado
              </span>
            )}
          </div>
        </div>
      )}

      {tab === "departamentos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{depts.length} departamento(s) registrado(s)</p>
            <Button size="sm" onClick={() => setShowDeptForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo
            </Button>
          </div>

          {deptError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
              {deptError}
              <button type="button" className="ml-2 text-red-400 hover:text-red-600" onClick={() => setDeptError("")}>
                <X className="w-3.5 h-3.5 inline" />
              </button>
            </p>
          )}

          {showDeptForm && (
            <Card>
              <CardContent className="pt-4">
                <form onSubmit={createDept} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input
                      value={deptForm.name}
                      onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Operaciones, Almacen..."
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descripcion</Label>
                    <Input
                      value={deptForm.description}
                      onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={deptLoading}>Crear</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowDeptForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {depts.map((dept) => (
              <div key={dept.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                {editingId === dept.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    />
                    <Input
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Descripcion"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateDept(dept.id)} disabled={deptLoading}>Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{dept.name}</p>
                      {dept.description && (
                        <p className="text-xs text-slate-500">{dept.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{dept._count.employees} empleado(s)</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(dept.id)
                          setEditForm({ name: dept.name, description: dept.description ?? "" })
                          setDeptError("")
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteDept(dept.id, dept._count.employees)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{roles.length} rol(es) registrado(s)</p>
            <Button size="sm" onClick={() => setShowRoleForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo
            </Button>
          </div>

          {roleError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
              {roleError}
              <button type="button" className="ml-2 text-red-400 hover:text-red-600" onClick={() => setRoleError("")}>
                <X className="w-3.5 h-3.5 inline" />
              </button>
            </p>
          )}

          {showRoleForm && (
            <Card>
              <CardContent className="pt-4">
                <form onSubmit={createRole} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input
                      value={roleForm.name}
                      onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="SUPERVISOR, GERENTE..."
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descripcion</Label>
                    <Input
                      value={roleForm.description}
                      onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={roleLoading}>Crear</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowRoleForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {roles.map((role) => (
              <div key={role.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                {editingRoleId === role.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editRoleForm.name}
                      onChange={(e) => setEditRoleForm((p) => ({ ...p, name: e.target.value }))}
                    />
                    <Input
                      value={editRoleForm.description}
                      onChange={(e) => setEditRoleForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Descripcion"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateRole(role.id)} disabled={roleLoading}>Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingRoleId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{role.name}</p>
                        {role.isSystem && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Sistema</span>
                        )}
                      </div>
                      {role.description && <p className="text-xs text-slate-500">{role.description}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">{role._count.employees} empleado(s)</p>
                    </div>
                    {!role.isSystem && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRoleId(role.id)
                            setEditRoleForm({ name: role.name, description: role.description ?? "" })
                            setRoleError("")
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteRole(role.id, role._count.employees, role.isSystem)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
