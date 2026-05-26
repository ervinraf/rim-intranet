"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Download, Upload, X, Check, AlertCircle, FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"

interface ParsedTask {
  name: string
  startDate: string
  endDate: string
  actualStartDate?: string
  actualEndDate?: string
  valid: boolean
  error?: string
}

interface Props {
  projectId: string
  onImported: (tasks: any[], replaced: boolean) => void
  onClose: () => void
}

function parseDate(val: any): string | null {
  if (!val) return null

  // Excel serial number
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val)
    if (!date) return null
    const m = String(date.m).padStart(2, "0")
    const d = String(date.d).padStart(2, "0")
    return `${date.y}-${m}-${d}`
  }

  // String date — try common formats
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/")
    return `${y}-${m}-${d}`
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split("/")
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  const native = new Date(str)
  if (!isNaN(native.getTime())) return native.toISOString().slice(0, 10)
  return null
}

function downloadTemplate() {
  // Sheet 1: blank with headers only
  const ws = XLSX.utils.aoa_to_sheet([
    ["Actividad", "Inicio Plan", "Fin Plan", "Inicio Real", "Fin Real"],
  ])

  // Cell notes explaining each column
  const note = (cell: string, text: string) => {
    if (!ws[cell].c) ws[cell].c = []
    ws[cell].c.push({ a: "Intranet", t: text })
  }
  note("A1", "Nombre de la actividad o tarea.\nEj: Instalacion de grua, Ensamble de estructura...")
  note("B1", "Fecha planeada de INICIO.\nFormato recomendado: YYYY-MM-DD\nEjemplo: 2026-05-18\nTambien acepta: 18/05/2026")
  note("C1", "Fecha planeada de TERMINO.\nFormato recomendado: YYYY-MM-DD\nEjemplo: 2026-05-20\nTambien acepta: 20/05/2026")
  note("D1", "Fecha REAL en que inicio la actividad.\nDejar en blanco si aun no ha comenzado.\nSe puede llenar despues desde la intranet.")
  note("E1", "Fecha REAL en que termino la actividad.\nDejar en blanco si aun no ha concluido.\nSe puede llenar despues desde la intranet.")

  ws["!cols"] = [{ wch: 45 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }]

  // Sheet 2: Instrucciones
  const inst = XLSX.utils.aoa_to_sheet([
    ["PLANTILLA DE ACTIVIDADES - INTRANET RIM RIGGING"],
    [""],
    ["Llena la hoja 'Actividades' con las tareas del proyecto."],
    ["No elimines ni modifiques la fila de encabezados (primera fila)."],
    [""],
    ["COLUMNA", "DESCRIPCION", "EJEMPLO"],
    ["Actividad", "Nombre de la tarea o actividad del proyecto", "Instalacion de estructura"],
    ["Inicio Plan", "Fecha PLANEADA de inicio (YYYY-MM-DD o DD/MM/YYYY)", "2026-05-18"],
    ["Fin Plan", "Fecha PLANEADA de termino (YYYY-MM-DD o DD/MM/YYYY)", "2026-05-20"],
    ["Inicio Real", "Fecha REAL en que inicio (opcional, dejar en blanco si no aplica)", "2026-05-19"],
    ["Fin Real", "Fecha REAL en que termino (opcional, dejar en blanco si no concluye)", ""],
    [""],
    ["NOTAS IMPORTANTES:"],
    ["", "Las columnas 'Real' son opcionales. Dejalas en blanco y registra las fechas reales desde la intranet conforme avance el proyecto."],
    ["", "El sistema detecta automaticamente las columnas por nombre, sin importar el orden."],
    ["", "Puedes subir archivos .xlsx o .xls"],
    ["", "Filas vacias son ignoradas automaticamente."],
  ])
  inst["!cols"] = [{ wch: 16 }, { wch: 60 }, { wch: 18 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Actividades")
  XLSX.utils.book_append_sheet(wb, inst, "Instrucciones")
  XLSX.writeFile(wb, "plantilla_actividades.xlsx")
}

export function ImportTasksModal({ projectId, onImported, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tasks, setTasks] = useState<ParsedTask[]>([])
  const [hasActual, setHasActual] = useState(false)
  const [replaceAll, setReplaceAll] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const [imported, setImported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array", cellDates: false })

        const sheetName = wb.SheetNames[wb.SheetNames.length - 1]
        const ws = wb.Sheets[sheetName]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

        // Find header row
        let headerIdx = 0
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i].map((c: any) => String(c).toLowerCase())
          if (row.some((c) => c.includes("actividad") || c.includes("activity"))) {
            headerIdx = i
            break
          }
        }

        const header = rows[headerIdx].map((c: any) => String(c).toLowerCase())
        const nameIdx = header.findIndex((h) => h.includes("actividad") || h.includes("activity"))

        if (nameIdx === -1) {
          setError('No se encontro columna "Actividad" o "Activity" en el archivo.')
          return
        }

        // Detect plan vs real columns by looking for "real" keyword first
        const actualStartIdx = header.findIndex(
          (h) => h.includes("real") && (h.includes("inicio") || h.includes("start") || h.includes("inicia"))
        )
        const actualEndIdx = header.findIndex(
          (h) => h.includes("real") && (h.includes("fin") || h.includes("end") || h.includes("termina"))
        )

        // Plan columns: prefer ones with "plan" keyword, else any start/end that isn't "real"
        const startIdx = header.findIndex(
          (h) => !h.includes("real") && (h.includes("inicio") || h.includes("start") || h.includes("inicia"))
        )
        const endIdx = header.findIndex(
          (h) => !h.includes("real") && (h.includes("fin") || h.includes("end") || h.includes("termina"))
        )

        const detectedActual = actualStartIdx >= 0 || actualEndIdx >= 0
        setHasActual(detectedActual)

        const parsed: ParsedTask[] = []
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i]
          const name = String(row[nameIdx] ?? "").trim()
          if (!name) continue
          // Skip section headers (all-caps, no spaces, longer than 3 chars)
          if (name.toUpperCase() === name && name.length > 3 && !name.includes(" ")) continue

          const startRaw = startIdx >= 0 ? row[startIdx] : null
          const endRaw = endIdx >= 0 ? row[endIdx] : null
          const actualStartRaw = actualStartIdx >= 0 ? row[actualStartIdx] : null
          const actualEndRaw = actualEndIdx >= 0 ? row[actualEndIdx] : null

          const startDate = parseDate(startRaw)
          const endDate = parseDate(endRaw) ?? startDate
          const actualStartDate = parseDate(actualStartRaw) ?? undefined
          const actualEndDate = parseDate(actualEndRaw) ?? undefined

          if (!startDate) {
            parsed.push({ name, startDate: "", endDate: "", valid: false, error: "Fecha inicio invalida" })
          } else {
            parsed.push({
              name,
              startDate,
              endDate: endDate ?? startDate,
              actualStartDate,
              actualEndDate,
              valid: true,
            })
          }
        }

        if (parsed.length === 0) {
          setError("No se encontraron actividades en el archivo.")
          return
        }

        setTasks(parsed)
      } catch {
        setError("Error al leer el archivo. Asegurate de que sea un .xlsx valido.")
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ""
  }

  async function handleImport() {
    const valid = tasks.filter((t) => t.valid)
    if (!valid.length) return

    setLoading(true)

    if (replaceAll) {
      // Borra todo y reimporta
      await fetch(`/api/projects/${projectId}/tasks`, { method: "DELETE" })
      const created: any[] = []
      for (let i = 0; i < valid.length; i++) {
        const t = valid[i]
        const res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: t.name, startDate: t.startDate, endDate: t.endDate,
            actualStartDate: t.actualStartDate ?? null,
            actualEndDate: t.actualEndDate ?? null,
            progress: 0, order: i,
          }),
        })
        if (res.ok) created.push(await res.json())
      }
      onImported(created, true)
    } else {
      // Merge inteligente: si coincide fecha de inicio, actualiza; si no, agrega
      const existing: any[] = await fetch(`/api/projects/${projectId}/tasks`).then((r) => r.json())
      const existingByDate = new Map(existing.map((t: any) => [t.startDate?.slice(0, 10), t]))

      const created: any[] = []
      for (let i = 0; i < valid.length; i++) {
        const t = valid[i]
        const match = existingByDate.get(t.startDate)
        if (match) {
          // Actualiza el nombre y fechas de la actividad existente
          const res = await fetch(`/api/projects/${projectId}/tasks/${match.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: t.name, endDate: t.endDate,
              actualStartDate: t.actualStartDate ?? match.actualStartDate ?? null,
              actualEndDate: t.actualEndDate ?? match.actualEndDate ?? null,
            }),
          })
          if (res.ok) created.push(await res.json())
        } else {
          // Agrega como nueva
          const res = await fetch(`/api/projects/${projectId}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: t.name, startDate: t.startDate, endDate: t.endDate,
              actualStartDate: t.actualStartDate ?? null,
              actualEndDate: t.actualEndDate ?? null,
              progress: 0, order: existing.length + i,
            }),
          })
          if (res.ok) created.push(await res.json())
        }
      }
      onImported(created, false)
    }

    setImported(true)
    setLoading(false)
  }

  const validCount = tasks.filter((t) => t.valid).length
  const invalidCount = tasks.filter((t) => !t.valid).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Importar actividades desde Excel</h2>
            <p className="text-xs text-slate-500 mt-0.5">Soporta fechas Plan y Real por actividad</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {!imported ? (
            <>
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Paso 1 — Descarga la plantilla</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Columnas: Actividad · Inicio Plan · Fin Plan · Inicio Real · Fin Real
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Plantilla
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Paso 2 — Sube tu archivo</Label>
                <p className="text-xs text-slate-500 mb-2 mt-0.5">
                  Tambien acepta el formato de tu Excel actual (pestaña RIGGING PLAN o similar)
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFile}
                />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Seleccionar archivo Excel
                </Button>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {tasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">
                      Vista previa — {validCount} actividades
                      {invalidCount > 0 && <span className="text-red-500 ml-1">({invalidCount} con error)</span>}
                      {hasActual && (
                        <span className="ml-2 text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Fechas reales detectadas
                        </span>
                      )}
                    </p>
                    <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setTasks([])}>
                      Limpiar
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Actividad</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Inicio Plan</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Fin Plan</th>
                          {hasActual && (
                            <>
                              <th className="text-left px-3 py-2 text-emerald-600 font-medium">Inicio Real</th>
                              <th className="text-left px-3 py-2 text-emerald-600 font-medium">Fin Real</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tasks.map((t, i) => (
                          <tr key={i} className={t.valid ? "" : "bg-red-50"}>
                            <td className="px-3 py-1.5 text-slate-700 max-w-[200px] truncate">{t.name}</td>
                            <td className="px-3 py-1.5 text-slate-500">
                              {t.startDate || <span className="text-red-500">{t.error}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-slate-500">{t.endDate}</td>
                            {hasActual && (
                              <>
                                <td className="px-3 py-1.5 text-emerald-700">{t.actualStartDate ?? "—"}</td>
                                <td className="px-3 py-1.5 text-emerald-700">{t.actualEndDate ?? "—"}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-medium text-slate-800">{validCount} actividades importadas</p>
              <p className="text-sm text-slate-500 mt-1">Ya aparecen en el Gantt del proyecto</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
          {!imported && validCount > 0 ? (
            <div className="space-y-0.5">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceAll}
                  onChange={(e) => { setReplaceAll(e.target.checked); setConfirmText("") }}
                  className="rounded"
                />
                <span>
                  Borrar todo y reimportar
                  {replaceAll && <span className="ml-1 text-red-500 font-medium">(elimina las actuales)</span>}
                </span>
              </label>
              {replaceAll ? (
                <div className="ml-5 mt-1.5 space-y-1">
                  <p className="text-xs text-red-600 font-medium">
                    Esta accion eliminara TODAS las actividades existentes del proyecto.
                  </p>
                  <p className="text-xs text-slate-500">Escribe <strong>BORRAR</strong> para confirmar:</p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="BORRAR"
                    className="w-32 px-2 py-1 text-xs border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-400 ml-5">
                  Por defecto actualiza las existentes (mismo inicio) y agrega las nuevas
                </p>
              )}
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {imported ? "Cerrar" : "Cancelar"}
            </Button>
            {!imported && validCount > 0 && (
              <Button onClick={handleImport} disabled={loading || (replaceAll && confirmText !== "BORRAR")}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {loading ? "Importando..." : `Importar ${validCount} actividades`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
