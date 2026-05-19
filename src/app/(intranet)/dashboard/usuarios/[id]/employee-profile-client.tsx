"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { EmployeeForm } from "@/components/employees/employee-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Mail, Phone, Building2, Calendar, Edit2, Power, CreditCard, Upload, AlertTriangle } from "lucide-react"
import { format, differenceInDays, isPast } from "date-fns"
import { es } from "date-fns/locale"

const typeLabels = {
  OPERATIVO: { label: "Operativo", className: "bg-blue-100 text-blue-700" },
  SUPERVISOR: { label: "Supervisor", className: "bg-violet-100 text-violet-700" },
  ADMINISTRATIVO: { label: "Administrativo", className: "bg-slate-100 text-slate-600" },
}

const overtimeStatus = {
  PENDIENTE: { label: "Pendiente", variant: "secondary" as const },
  APROBADO: { label: "Aprobado", variant: "default" as const },
  RECHAZADO: { label: "Rechazado", variant: "destructive" as const },
}

interface OvertimeRecord {
  id: string
  weekStart: string
  weekEnd: string
  hoursWorked: number
  netHours: number
  status: string
}

interface Employee {
  id: string
  fullName: string
  paterno: string
  materno?: string | null
  nombres: string
  nombres2?: string | null
  employeeType: "OPERATIVO" | "SUPERVISOR" | "ADMINISTRATIVO"
  itemNumber?: number | null
  position?: string | null
  phone?: string | null
  extension?: string | null
  hireDate?: string | null
  birthDate?: string | null
  sdi?: number | null
  salarioBase?: number | null
  salarioMensual?: number | null
  isActive: boolean
  departmentId?: string | null
  roleId?: string | null
  licenciaNumero?: string | null
  licenciaVencimiento?: string | null
  licenciaFotoUrl?: string | null
  department?: { id: string; name: string } | null
  role?: { id: string; name: string } | null
  user: { email: string; isActive: boolean; createdAt: string }
  overtimeRecords: OvertimeRecord[]
}

interface Props {
  employee: Employee
  departments: { id: string; name: string }[]
  roles: { id: string; name: string }[]
  isAdmin: boolean
  totalBankHours: number
}

export function EmployeeProfileClient({ employee: initial, departments, roles, isAdmin, totalBankHours }: Props) {
  const router = useRouter()
  const [employee, setEmployee] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [licenciaEdit, setLicenciaEdit] = useState(false)
  const [licForm, setLicForm] = useState({
    numero: initial.licenciaNumero ?? "",
    vencimiento: initial.licenciaVencimiento ? initial.licenciaVencimiento.slice(0, 10) : "",
  })
  const [licFile, setLicFile] = useState<File | null>(null)
  const [savingLic, setSavingLic] = useState(false)

  const typeCfg = typeLabels[employee.employeeType]

  async function toggleActive() {
    setTogglingActive(true)
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !employee.isActive }),
    })
    if (res.ok) {
      setEmployee((e) => ({ ...e, isActive: !e.isActive }))
    }
    setTogglingActive(false)
  }

  async function saveLicencia() {
    setSavingLic(true)
    let fotoUrl = employee.licenciaFotoUrl ?? null

    if (licFile) {
      const fd = new FormData()
      fd.append("file", licFile)
      fd.append("folder", `licencias/${employee.id}`)
      const r = await fetch("/api/upload", { method: "POST", body: fd })
      if (r.ok) {
        const d = await r.json()
        fotoUrl = d.url
      }
    }

    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licenciaNumero: licForm.numero || null,
        licenciaVencimiento: licForm.vencimiento || null,
        licenciaFotoUrl: fotoUrl,
      }),
    })
    if (res.ok) {
      setEmployee((e) => ({
        ...e,
        licenciaNumero: licForm.numero || null,
        licenciaVencimiento: licForm.vencimiento ? new Date(licForm.vencimiento).toISOString() : null,
        licenciaFotoUrl: fotoUrl,
      }))
      setLicenciaEdit(false)
      setLicFile(null)
    }
    setSavingLic(false)
  }

  if (editing) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            ← Volver al perfil
          </Button>
          <h1 className="text-xl font-semibold text-slate-900">Editar: {employee.fullName}</h1>
        </div>
        <EmployeeForm
          departments={departments}
          roles={roles}
          mode="edit"
          employeeId={employee.id}
          defaultValues={{
            paterno: employee.paterno,
            materno: employee.materno ?? "",
            nombres: employee.nombres,
            nombres2: employee.nombres2 ?? "",
            employeeType: employee.employeeType,
            itemNumber: employee.itemNumber?.toString() ?? "",
            position: employee.position ?? "",
            phone: employee.phone ?? "",
            extension: employee.extension ?? "",
            hireDate: employee.hireDate ? employee.hireDate.slice(0, 10) : "",
            birthDate: employee.birthDate ? employee.birthDate.slice(0, 10) : "",
            departmentId: employee.departmentId ?? "",
            roleId: employee.roleId ?? "",
            sdi: employee.sdi?.toString() ?? "",
            salarioBase: employee.salarioBase?.toString() ?? "",
            salarioMensual: employee.salarioMensual?.toString() ?? "",
          }}
          onSuccess={() => {
            setEditing(false)
            router.refresh()
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-xl font-bold">
              {employee.paterno.slice(0, 1)}{employee.nombres.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-2xl font-semibold text-slate-900">{employee.fullName}</h1>
                {!employee.isActive && (
                  <Badge variant="secondary">Inactivo</Badge>
                )}
              </div>
              <p className="text-slate-500 text-sm">{employee.position ?? "Sin puesto asignado"}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeCfg.className}`}>
                  {typeCfg.label}
                </span>
                {employee.department && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {employee.department.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="w-4 h-4 mr-1.5" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleActive}
                disabled={togglingActive}
                className={employee.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}
              >
                <Power className="w-4 h-4 mr-1.5" />
                {employee.isActive ? "Desactivar" : "Activar"}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Info cards */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {employee.user.email}
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {employee.phone}
                    {employee.extension && <span className="text-slate-400">ext. {employee.extension}</span>}
                  </div>
                )}
                {employee.hireDate && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Ingreso: {format(new Date(employee.hireDate), "d 'de' MMMM yyyy", { locale: es })}
                  </div>
                )}
                {employee.birthDate && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Nacimiento: {format(new Date(employee.birthDate), "d 'de' MMMM yyyy", { locale: es })}
                  </div>
                )}
                {employee.itemNumber && (
                  <div className="text-slate-500">No. empleado: <span className="font-medium text-slate-800">{employee.itemNumber}</span></div>
                )}
                {employee.role && (
                  <div className="text-slate-500">Rol: <span className="font-medium text-slate-800">{employee.role.name}</span></div>
                )}
              </CardContent>
            </Card>

            {/* Salario — solo operativos y solo admin */}
            {isAdmin && employee.employeeType === "OPERATIVO" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Datos salariales</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">SDI diario</p>
                    <p className="font-semibold text-slate-900">${Number(employee.sdi ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Salario base diario</p>
                    <p className="font-semibold text-slate-900">${Number(employee.salarioBase ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Salario mensual</p>
                    <p className="font-semibold text-slate-900">${Number(employee.salarioMensual ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historial de horas extras */}
            {employee.employeeType === "OPERATIVO" && employee.overtimeRecords.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Ultimas horas extras</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {employee.overtimeRecords.map((r) => {
                      const st = overtimeStatus[r.status as keyof typeof overtimeStatus]
                      return (
                        <div key={r.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                          <span className="text-slate-600">
                            Sem. {format(new Date(r.weekStart), "d MMM", { locale: es })} — {r.hoursWorked} hrs
                          </span>
                          <div className="flex items-center gap-2">
                            {r.status === "APROBADO" && (
                              <span className="text-xs text-green-600">+{r.netHours} banco</span>
                            )}
                            <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Banco de horas */}
          <div className="space-y-4">
            {employee.employeeType === "OPERATIVO" && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-5 text-center">
                  <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-amber-900">{totalBankHours.toFixed(1)}</p>
                  <p className="text-xs text-amber-700 mt-0.5">horas en banco</p>
                </CardContent>
              </Card>
            )}

            {/* Licencia de conducir */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    Licencia de conducir
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setLicenciaEdit((v) => !v)}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      {licenciaEdit ? "Cancelar" : "Editar"}
                    </button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {licenciaEdit ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Numero de licencia</label>
                      <input
                        className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm"
                        value={licForm.numero}
                        onChange={(e) => setLicForm((p) => ({ ...p, numero: e.target.value }))}
                        placeholder="XXXXXXXXXX"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Fecha de vencimiento</label>
                      <input
                        type="date"
                        className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm"
                        value={licForm.vencimiento}
                        onChange={(e) => setLicForm((p) => ({ ...p, vencimiento: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Foto de licencia</label>
                      <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-200 rounded-md px-3 py-2 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          {licFile ? licFile.name : "Seleccionar foto..."}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setLicFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={saveLicencia}
                      disabled={savingLic}
                      className="w-full bg-slate-800 text-white text-sm rounded-md py-1.5 hover:bg-slate-700 disabled:opacity-50"
                    >
                      {savingLic ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                ) : employee.licenciaNumero ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-800">{employee.licenciaNumero}</p>
                    {employee.licenciaVencimiento && (() => {
                      const venc = new Date(employee.licenciaVencimiento)
                      const dias = differenceInDays(venc, new Date())
                      const expired = isPast(venc)
                      return (
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full w-fit font-medium ${
                          expired ? "bg-red-100 text-red-700" :
                          dias <= 30 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {(expired || dias <= 30) && <AlertTriangle className="w-3 h-3" />}
                          {expired
                            ? "Vencida"
                            : dias <= 30
                            ? `Vence en ${dias} dias`
                            : `Vigente hasta ${format(venc, "d MMM yyyy", { locale: es })}`}
                        </div>
                      )
                    })()}
                    {employee.licenciaFotoUrl && (
                      <a href={employee.licenciaFotoUrl} target="_blank" rel="noreferrer">
                        <img
                          src={employee.licenciaFotoUrl}
                          alt="Licencia"
                          className="w-full rounded-lg border border-slate-200 mt-1 object-cover max-h-36"
                        />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Sin registro</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
