"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Department { id: string; name: string }
interface Role { id: string; name: string }

interface EmployeeFormProps {
  departments: Department[]
  roles: Role[]
  mode: "create" | "edit"
  employeeId?: string
  defaultValues?: Partial<FormState>
  onSuccess?: () => void
}

interface FormState {
  paterno: string
  materno: string
  nombres: string
  nombres2: string
  email: string
  tempPassword: string
  employeeType: string
  itemNumber: string
  position: string
  phone: string
  extension: string
  hireDate: string
  birthDate: string
  departmentId: string
  roleId: string
  sdi: string
  salarioBase: string
  salarioMensual: string
}

const empty: FormState = {
  paterno: "", materno: "", nombres: "", nombres2: "",
  email: "", tempPassword: "RimRigging2026!",
  employeeType: "OPERATIVO",
  itemNumber: "", position: "", phone: "", extension: "", hireDate: "", birthDate: "",
  departmentId: "", roleId: "", sdi: "", salarioBase: "", salarioMensual: "",
}

export function EmployeeForm({
  departments, roles, mode, employeeId, defaultValues, onSuccess,
}: EmployeeFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({ ...empty, ...defaultValues })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((p) => ({ ...p, [key]: e.target.value }))

  const setSelect = (key: keyof FormState) => (val: string | null) =>
    setForm((p) => ({ ...p, [key]: val ?? "" }))

  const isOperativo = form.employeeType === "OPERATIVO"

  const req = (val: string) => submitted && !val
    ? "border-red-400 focus:ring-red-400"
    : ""

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setError("")
    if (!form.paterno || !form.nombres || (mode === "create" && (!form.email || !form.tempPassword))) {
      setError("Completa los campos obligatorios marcados en rojo")
      return
    }
    setLoading(true)

    const payload: any = {
      paterno: form.paterno,
      materno: form.materno,
      nombres: form.nombres,
      nombres2: form.nombres2,
      employeeType: form.employeeType,
      position: form.position || null,
      phone: form.phone || null,
      extension: form.extension || null,
      hireDate: form.hireDate || null,
      birthDate: form.birthDate || null,
      departmentId: form.departmentId || null,
      roleId: form.roleId || null,
      itemNumber: form.itemNumber ? parseInt(form.itemNumber) : null,
      sdi: isOperativo && form.sdi ? parseFloat(form.sdi) : null,
      salarioBase: isOperativo && form.salarioBase ? parseFloat(form.salarioBase) : null,
      salarioMensual: isOperativo && form.salarioMensual ? parseFloat(form.salarioMensual) : null,
    }

    if (mode === "create") {
      payload.email = form.email
      payload.tempPassword = form.tempPassword
    }

    const url = mode === "create" ? "/api/employees" : `/api/employees/${employeeId}`
    const method = mode === "create" ? "POST" : "PATCH"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      let msg = "Error al guardar"
      try {
        const data = await res.json()
        msg = typeof data.error === "string" ? data.error : JSON.stringify(data.error)
      } catch {}
      setError(msg)
      return
    }

    if (onSuccess) {
      onSuccess()
    } else {
      router.push("/dashboard/usuarios")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Datos personales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Apellido paterno <span className="text-red-500">*</span></Label>
            <Input value={form.paterno} onChange={set("paterno")} className={req(form.paterno)} />
            {req(form.paterno) && <p className="text-xs text-red-500">Requerido</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Apellido materno</Label>
            <Input value={form.materno} onChange={set("materno")} />
          </div>
          <div className="space-y-1.5">
            <Label>Primer nombre <span className="text-red-500">*</span></Label>
            <Input value={form.nombres} onChange={set("nombres")} className={req(form.nombres)} />
            {req(form.nombres) && <p className="text-xs text-red-500">Requerido</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Segundo nombre</Label>
            <Input value={form.nombres2} onChange={set("nombres2")} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefono</Label>
            <Input value={form.phone} onChange={set("phone")} type="tel" />
          </div>
          <div className="space-y-1.5">
            <Label>Extension</Label>
            <Input value={form.extension} onChange={set("extension")} />
          </div>
        </CardContent>
      </Card>

      {/* Datos laborales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">Datos laborales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>No. empleado</Label>
            <Input value={form.itemNumber} onChange={set("itemNumber")} type="number" placeholder="1" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de empleado *</Label>
            <Select value={form.employeeType} onValueChange={setSelect("employeeType")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATIVO">Operativo</SelectItem>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="ADMINISTRATIVO">Administrativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Puesto</Label>
            <Input value={form.position} onChange={set("position")} placeholder="Rigger certificado..." />
          </div>
          <div className="space-y-1.5">
            <Label>Departamento</Label>
            <Select value={form.departmentId} onValueChange={setSelect("departmentId")}>
              <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Rol en el sistema</Label>
            <Select value={form.roleId} onValueChange={setSelect("roleId")}>
              <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de ingreso</Label>
            <Input value={form.hireDate} onChange={set("hireDate")} type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de nacimiento</Label>
            <Input value={form.birthDate} onChange={set("birthDate")} type="date" />
          </div>
        </CardContent>
      </Card>

      {/* Salario — solo operativos */}
      {isOperativo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Datos salariales (para calculo de horas extras)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>SDI diario</Label>
              <Input value={form.sdi} onChange={set("sdi")} type="number" step="0.01" placeholder="337.09" />
            </div>
            <div className="space-y-1.5">
              <Label>Salario base diario</Label>
              <Input value={form.salarioBase} onChange={set("salarioBase")} type="number" step="0.01" placeholder="320.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Salario mensual</Label>
              <Input value={form.salarioMensual} onChange={set("salarioMensual")} type="number" step="0.01" placeholder="9728.00" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acceso al sistema — solo en creacion */}
      {mode === "create" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Acceso al sistema</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Correo electronico <span className="text-red-500">*</span></Label>
              <Input value={form.email} onChange={set("email")} type="email" placeholder="nombre@rim-rigging.com" className={req(form.email)} />
              {req(form.email) && <p className="text-xs text-red-500">Requerido</p>}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Contrasena temporal <span className="text-red-500">*</span></Label>
              <Input value={form.tempPassword} onChange={set("tempPassword")} type="text" className={req(form.tempPassword)} />
              {req(form.tempPassword) && <p className="text-xs text-red-500">Requerido</p>}
              <p className="text-xs text-slate-400">El empleado debera cambiarla al primer inicio de sesion</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : mode === "create" ? "Crear empleado" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
