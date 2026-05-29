"use client"

import { Button } from "@/components/ui/button"
import { Download, Users, GanttChartSquare, UserCheck, Wrench, Package } from "lucide-react"
import * as XLSX from "xlsx"
import { downloadAttendanceTemplate } from "@/components/attendance/import-attendance-modal"

interface Template {
  id: string
  title: string
  description: string
  format: string
  module: string
  icon: React.ElementType
  columns: { name: string; description: string; required: boolean; example: string }[]
  onDownload: () => void
}

function downloadActividades() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Actividad", "Inicio Plan", "Fin Plan", "Inicio Real", "Fin Real"],
  ])

  const note = (cell: string, text: string) => {
    if (!ws[cell].c) ws[cell].c = []
    ws[cell].c.push({ a: "Intranet", t: text })
  }
  note("A1", "Nombre de la actividad o tarea.\nEj: Instalacion de grua, Ensamble de estructura...")
  note("B1", "Fecha planeada de INICIO.\nFormato: YYYY-MM-DD\nEjemplo: 2026-05-18\nTambien acepta: 18/05/2026")
  note("C1", "Fecha planeada de TERMINO.\nFormato: YYYY-MM-DD\nEjemplo: 2026-05-20\nTambien acepta: 20/05/2026")
  note("D1", "Fecha REAL en que inicio la actividad.\nDejar en blanco si aun no ha comenzado.")
  note("E1", "Fecha REAL en que termino la actividad.\nDejar en blanco si aun no ha concluido.")
  ws["!cols"] = [{ wch: 45 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }]

  const inst = XLSX.utils.aoa_to_sheet([
    ["PLANTILLA DE ACTIVIDADES - INTRANET RIM RIGGING"],
    [""],
    ["Llena la hoja 'Actividades' con las tareas del proyecto."],
    ["No elimines ni modifiques la fila de encabezados (primera fila)."],
    [""],
    ["COLUMNA", "DESCRIPCION", "REQUERIDA", "EJEMPLO"],
    ["Actividad", "Nombre de la tarea o actividad del proyecto", "SI", "Instalacion de estructura"],
    ["Inicio Plan", "Fecha planeada de inicio (YYYY-MM-DD o DD/MM/YYYY)", "SI", "2026-05-18"],
    ["Fin Plan", "Fecha planeada de termino (YYYY-MM-DD o DD/MM/YYYY)", "SI", "2026-05-20"],
    ["Inicio Real", "Fecha real en que inicio (dejar en blanco si no aplica)", "NO", "2026-05-19"],
    ["Fin Real", "Fecha real en que termino (dejar en blanco si no concluye)", "NO", ""],
    [""],
    ["NOTAS:"],
    ["", "Las columnas 'Real' son opcionales. Se pueden registrar despues desde la intranet."],
    ["", "El sistema detecta las columnas por nombre, sin importar el orden."],
    ["", "Se aceptan archivos .xlsx y .xls"],
  ])
  inst["!cols"] = [{ wch: 16 }, { wch: 60 }, { wch: 12 }, { wch: 18 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Actividades")
  XLSX.utils.book_append_sheet(wb, inst, "Instrucciones")
  XLSX.writeFile(wb, "plantilla_actividades.xlsx")
}

function downloadEmpleados() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["PATERNO", "MATERNO", "NOMBRES", "EMAIL", "PUESTO", "DEPARTAMENTO", "TIPO", "INGRESO", "NACIMIENTO", "CURP", "NSS", "SDI", "SB"],
  ])

  const notes: Record<string, string> = {
    A1: "Apellido paterno del empleado. Requerido.",
    B1: "Apellido materno del empleado.",
    C1: "Nombre(s) del empleado. Requerido.",
    D1: "Correo electronico. Si se omite, se genera automaticamente con el nombre.",
    E1: "Puesto o cargo del empleado.\nEj: Rigger, Supervisor de obra, Mecanico",
    F1: "Departamento al que pertenece.\nEj: Operaciones, Taller, Almacen, Ventas",
    G1: "Tipo de empleado.\nValores: OPERATIVO, SUPERVISOR, ADMINISTRATIVO\nDefault: OPERATIVO",
    H1: "Fecha de ingreso a la empresa.\nFormato: DD/MM/YYYY o YYYY-MM-DD",
    I1: "Fecha de nacimiento.\nFormato: DD/MM/YYYY o YYYY-MM-DD",
    J1: "CURP o RFC del empleado.",
    K1: "Numero de Seguridad Social (NSS/IMSS).",
    L1: "Salario Diario Integrado (SDI). Solo numeros.\nEj: 350.50",
    M1: "Salario Base mensual. Solo numeros.\nEj: 8500",
  }
  Object.entries(notes).forEach(([cell, text]) => {
    if (!ws[cell].c) ws[cell].c = []
    ws[cell].c.push({ a: "Intranet", t: text })
  })

  ws["!cols"] = [
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 22 },
    { wch: 18 }, { wch: 16 }, { wch: 13 }, { wch: 13 },
    { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
  ]

  const inst = XLSX.utils.aoa_to_sheet([
    ["PLANTILLA DE EMPLEADOS - INTRANET RIM RIGGING"],
    [""],
    ["Llena la hoja 'Empleados' con los datos del personal a importar."],
    ["No modifiques los encabezados de la primera fila."],
    ["La contrasena inicial de todos los usuarios creados sera: RimRigging2026!"],
    [""],
    ["COLUMNA", "DESCRIPCION", "REQUERIDA", "EJEMPLO"],
    ["PATERNO", "Apellido paterno", "SI", "Gonzalez"],
    ["MATERNO", "Apellido materno", "NO", "Lopez"],
    ["NOMBRES", "Nombre(s)", "SI", "Carlos Alberto"],
    ["EMAIL", "Correo electronico (se genera si se omite)", "NO", "cgonzalez@rim-rigging.com"],
    ["PUESTO", "Cargo o posicion", "NO", "Rigger Senior"],
    ["DEPARTAMENTO", "Nombre del departamento (debe existir en el sistema)", "NO", "Operaciones"],
    ["TIPO", "OPERATIVO, SUPERVISOR o ADMINISTRATIVO", "NO", "OPERATIVO"],
    ["INGRESO", "Fecha de ingreso DD/MM/YYYY o YYYY-MM-DD", "NO", "15/03/2024"],
    ["NACIMIENTO", "Fecha de nacimiento DD/MM/YYYY o YYYY-MM-DD", "NO", "12/07/1990"],
    ["CURP", "CURP o RFC", "NO", "GOLC900712HMNPRL03"],
    ["NSS", "Numero de Seguridad Social", "NO", "12345678901"],
    ["SDI", "Salario Diario Integrado (numero)", "NO", "350.50"],
    ["SB", "Salario Base mensual (numero)", "NO", "8500"],
    [""],
    ["NOTAS:"],
    ["", "Empleados con email duplicado se omiten automaticamente."],
    ["", "El departamento debe estar dado de alta previamente en el sistema."],
    ["", "Se acepta formato CSV (separado por comas o tabuladores) y TXT."],
  ])
  inst["!cols"] = [{ wch: 14 }, { wch: 60 }, { wch: 12 }, { wch: 22 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Empleados")
  XLSX.utils.book_append_sheet(wb, inst, "Instrucciones")
  XLSX.writeFile(wb, "plantilla_empleados.xlsx")
}

function downloadHerramientas() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Codigo", "Nombre", "Marca", "Modelo", "No.Serie", "Departamento", "Ubicacion", "Notas"],
  ])
  const notes: Record<string, string> = {
    A1: "Codigo interno de la herramienta (opcional).\nEj: HERR-001, T-042",
    B1: "Nombre descriptivo de la herramienta. Requerido.\nEj: Tecle de cadena 3 ton, Eslinga doble 4m",
    C1: "Marca del fabricante (opcional).\nEj: Greenfield, CM, Crosby",
    D1: "Modelo especifico (opcional).\nEj: R-300, SL-4X4",
    E1: "Numero de serie del fabricante (opcional).",
    F1: "Departamento asignado (debe existir en el sistema).\nEj: Operaciones, Taller, Almacen",
    G1: "Ubicacion fisica dentro de la empresa.\nEj: Bodega Norte, Rack 3, Camion 2",
    H1: "Observaciones adicionales (opcional).",
  }
  Object.entries(notes).forEach(([cell, text]) => {
    if (!ws[cell].c) ws[cell].c = []
    ws[cell].c.push({ a: "Intranet", t: text })
  })
  ws["!cols"] = [{ wch: 12 }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 28 }]

  const inst = XLSX.utils.aoa_to_sheet([
    ["PLANTILLA DE HERRAMIENTAS - INTRANET RIM RIGGING"],
    [""],
    ["Llena la hoja 'Herramientas' con el inventario a importar."],
    ["Si una herramienta ya existe en el sistema, se omite (no duplica)."],
    [""],
    ["COLUMNA", "DESCRIPCION", "REQUERIDA", "EJEMPLO"],
    ["Codigo", "Codigo interno de identificacion", "NO", "HERR-001"],
    ["Nombre", "Nombre descriptivo de la herramienta", "SI", "Tecle de cadena 3 ton"],
    ["Marca", "Marca del fabricante", "NO", "Greenfield"],
    ["Modelo", "Modelo del equipo", "NO", "R-300"],
    ["No.Serie", "Numero de serie del fabricante", "NO", "SN-2024-0123"],
    ["Departamento", "Departamento asignado (debe existir en el sistema)", "NO", "Operaciones"],
    ["Ubicacion", "Ubicacion fisica", "NO", "Bodega Norte"],
    ["Notas", "Observaciones adicionales", "NO", "Revision pendiente"],
  ])
  inst["!cols"] = [{ wch: 14 }, { wch: 55 }, { wch: 12 }, { wch: 22 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Herramientas")
  XLSX.utils.book_append_sheet(wb, inst, "Instrucciones")
  XLSX.writeFile(wb, "plantilla_herramientas.xlsx")
}

function downloadEquipos() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Codigo", "Nombre", "Marca", "Modelo", "No.Serie", "Departamento", "Ubicacion", "FechaCompra", "PrecioCompra", "ProxServicio", "Notas"],
  ])
  const notes: Record<string, string> = {
    A1: "Codigo interno del equipo (opcional).\nEj: EQ-001, GR-003",
    B1: "Nombre descriptivo del equipo. Requerido.\nEj: Grua torre 50 ton, Plataforma elevadora",
    C1: "Marca del fabricante (opcional).\nEj: Liebherr, JLG, Manitowoc",
    D1: "Modelo especifico (opcional).",
    E1: "Numero de serie del fabricante (opcional).",
    F1: "Departamento asignado (debe existir en el sistema).\nEj: Operaciones, Taller",
    G1: "Ubicacion fisica o proyecto asignado.\nEj: Obra Norte, Patio Taller",
    H1: "Fecha de compra o adquisicion.\nFormato: DD/MM/YYYY o YYYY-MM-DD",
    I1: "Precio de compra en pesos MXN (solo numero).\nEj: 350000",
    J1: "Fecha del proximo servicio o mantenimiento.\nFormato: DD/MM/YYYY o YYYY-MM-DD",
    K1: "Observaciones adicionales (opcional).",
  }
  Object.entries(notes).forEach(([cell, text]) => {
    if (!ws[cell].c) ws[cell].c = []
    ws[cell].c.push({ a: "Intranet", t: text })
  })
  ws["!cols"] = [
    { wch: 10 }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 13 }, { wch: 14 }, { wch: 13 }, { wch: 28 },
  ]

  const inst = XLSX.utils.aoa_to_sheet([
    ["PLANTILLA DE EQUIPOS - INTRANET RIM RIGGING"],
    [""],
    ["Llena la hoja 'Equipos' con el inventario a importar."],
    [""],
    ["COLUMNA", "DESCRIPCION", "REQUERIDA", "EJEMPLO"],
    ["Codigo", "Codigo interno de identificacion", "NO", "EQ-001"],
    ["Nombre", "Nombre descriptivo del equipo", "SI", "Grua torre 50 ton"],
    ["Marca", "Marca del fabricante", "NO", "Liebherr"],
    ["Modelo", "Modelo del equipo", "NO", "LTM-1050"],
    ["No.Serie", "Numero de serie del fabricante", "NO", "LH2024001"],
    ["Departamento", "Departamento asignado (debe existir en el sistema)", "NO", "Operaciones"],
    ["Ubicacion", "Ubicacion fisica o proyecto", "NO", "Obra Norte"],
    ["FechaCompra", "Fecha de adquisicion (DD/MM/YYYY)", "NO", "15/01/2023"],
    ["PrecioCompra", "Costo de adquisicion en MXN (numero)", "NO", "350000"],
    ["ProxServicio", "Fecha del proximo mantenimiento (DD/MM/YYYY)", "NO", "30/06/2026"],
    ["Notas", "Observaciones adicionales", "NO", "Calibracion pendiente"],
  ])
  inst["!cols"] = [{ wch: 14 }, { wch: 55 }, { wch: 12 }, { wch: 22 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Equipos")
  XLSX.utils.book_append_sheet(wb, inst, "Instrucciones")
  XLSX.writeFile(wb, "plantilla_equipos.xlsx")
}

const templates: Template[] = [
  {
    id: "asistencia",
    title: "Asistencia en lotes",
    description: "Importa registros de asistencia de uno o varios empleados en un solo archivo. Si ya existe un registro para ese empleado y fecha, se actualiza.",
    format: "Excel (.xlsx)",
    module: "Asistencia",
    icon: UserCheck,
    columns: [
      { name: "Empleado", description: "Nombre completo o numero de empleado", required: true, example: "Carlos Gonzalez Lopez" },
      { name: "Fecha", description: "Fecha del registro (YYYY-MM-DD o DD/MM/YYYY)", required: true, example: "2026-05-18" },
      { name: "Entrada", description: "Hora de entrada HH:MM en 24 horas", required: false, example: "08:00" },
      { name: "Salida", description: "Hora de salida HH:MM en 24 horas", required: false, example: "17:30" },
      { name: "Tipo", description: "NORMAL / TARDANZA / FALTA / VACACIONES / PERMISO / INCAPACIDAD", required: false, example: "NORMAL" },
      { name: "Notas", description: "Observaciones opcionales", required: false, example: "Permiso medico" },
    ],
    onDownload: downloadAttendanceTemplate,
  },
  {
    id: "actividades",
    title: "Actividades del proyecto (Gantt)",
    description: "Importa las actividades de un proyecto con sus fechas planeadas y reales. Usado en el modulo de Proyectos.",
    format: "Excel (.xlsx)",
    module: "Proyectos",
    icon: GanttChartSquare,
    columns: [
      { name: "Actividad", description: "Nombre de la tarea", required: true, example: "Instalacion de estructura" },
      { name: "Inicio Plan", description: "Fecha planeada de inicio", required: true, example: "2026-05-18" },
      { name: "Fin Plan", description: "Fecha planeada de termino", required: true, example: "2026-05-20" },
      { name: "Inicio Real", description: "Fecha real de inicio (opcional)", required: false, example: "2026-05-19" },
      { name: "Fin Real", description: "Fecha real de termino (opcional)", required: false, example: "" },
    ],
    onDownload: downloadActividades,
  },
  {
    id: "empleados",
    title: "Importar empleados",
    description: "Carga masiva de empleados al sistema. Crea usuarios y perfiles de empleado en un solo paso.",
    format: "Excel (.xlsx) o CSV",
    module: "Usuarios",
    icon: Users,
    columns: [
      { name: "PATERNO", description: "Apellido paterno", required: true, example: "Gonzalez" },
      { name: "MATERNO", description: "Apellido materno", required: false, example: "Lopez" },
      { name: "NOMBRES", description: "Nombre(s)", required: true, example: "Carlos Alberto" },
      { name: "EMAIL", description: "Correo (se genera si se omite)", required: false, example: "cgonzalez@rim-rigging.com" },
      { name: "PUESTO", description: "Cargo o posicion", required: false, example: "Rigger Senior" },
      { name: "DEPARTAMENTO", description: "Departamento (debe existir en el sistema)", required: false, example: "Operaciones" },
      { name: "TIPO", description: "OPERATIVO, SUPERVISOR o ADMINISTRATIVO", required: false, example: "OPERATIVO" },
      { name: "INGRESO", description: "Fecha de ingreso (DD/MM/YYYY)", required: false, example: "15/03/2024" },
    ],
    onDownload: downloadEmpleados,
  },
  {
    id: "herramientas",
    title: "Importar herramientas",
    description: "Carga masiva del inventario de herramientas. Despues de subir la plantilla usa el boton 'Importar Excel' en el modulo de Herramientas.",
    format: "Excel (.xlsx)",
    module: "Herramientas y Equipo",
    icon: Wrench,
    columns: [
      { name: "Codigo", description: "Codigo interno de identificacion", required: false, example: "HERR-001" },
      { name: "Nombre", description: "Nombre descriptivo de la herramienta", required: true, example: "Tecle de cadena 3 ton" },
      { name: "Marca", description: "Marca del fabricante", required: false, example: "Greenfield" },
      { name: "Modelo", description: "Modelo especifico", required: false, example: "R-300" },
      { name: "No.Serie", description: "Numero de serie", required: false, example: "SN-2024-0123" },
      { name: "Departamento", description: "Departamento asignado (debe existir en el sistema)", required: false, example: "Operaciones" },
      { name: "Ubicacion", description: "Ubicacion fisica", required: false, example: "Bodega Norte" },
      { name: "Notas", description: "Observaciones adicionales", required: false, example: "Revision pendiente" },
    ],
    onDownload: downloadHerramientas,
  },
  {
    id: "equipos",
    title: "Importar equipos",
    description: "Carga masiva del inventario de equipos mayores (gruas, plataformas, maquinaria). Usa el boton 'Importar Excel' en el modulo de Equipos.",
    format: "Excel (.xlsx)",
    module: "Herramientas y Equipo",
    icon: Package,
    columns: [
      { name: "Codigo", description: "Codigo interno de identificacion", required: false, example: "EQ-001" },
      { name: "Nombre", description: "Nombre descriptivo del equipo", required: true, example: "Grua torre 50 ton" },
      { name: "Marca", description: "Marca del fabricante", required: false, example: "Liebherr" },
      { name: "Modelo", description: "Modelo especifico", required: false, example: "LTM-1050" },
      { name: "No.Serie", description: "Numero de serie", required: false, example: "LH2024001" },
      { name: "Departamento", description: "Departamento asignado", required: false, example: "Operaciones" },
      { name: "FechaCompra", description: "Fecha de adquisicion (DD/MM/YYYY)", required: false, example: "15/01/2023" },
      { name: "PrecioCompra", description: "Costo de adquisicion en MXN (numero)", required: false, example: "350000" },
      { name: "ProxServicio", description: "Fecha del proximo mantenimiento (DD/MM/YYYY)", required: false, example: "30/06/2026" },
    ],
    onDownload: downloadEquipos,
  },
]

export function PlantillasClient() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Plantillas descargables</h1>
        <p className="text-sm text-slate-500 mt-1">
          Descarga la plantilla correspondiente, llena los datos y subela desde el modulo indicado.
        </p>
      </div>

      <div className="space-y-6">
        {templates.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <t.icon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-slate-900">{t.title}</h2>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {t.format}
                    </span>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Modulo: {t.module}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{t.description}</p>
                </div>
              </div>
              <Button size="sm" onClick={t.onDownload} className="flex-shrink-0">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar plantilla
              </Button>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Columnas</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left pb-2 text-xs font-medium text-slate-500 w-36">Columna</th>
                      <th className="text-left pb-2 text-xs font-medium text-slate-500">Descripcion</th>
                      <th className="text-left pb-2 text-xs font-medium text-slate-500 w-24">Requerida</th>
                      <th className="text-left pb-2 text-xs font-medium text-slate-500 w-40">Ejemplo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {t.columns.map((col) => (
                      <tr key={col.name}>
                        <td className="py-2 pr-4">
                          <code className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {col.name}
                          </code>
                        </td>
                        <td className="py-2 pr-4 text-slate-600 text-xs">{col.description}</td>
                        <td className="py-2 pr-4">
                          {col.required ? (
                            <span className="text-xs font-medium text-emerald-600">Si</span>
                          ) : (
                            <span className="text-xs text-slate-400">Opcional</span>
                          )}
                        </td>
                        <td className="py-2 text-xs font-mono text-slate-500">{col.example || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
