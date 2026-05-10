"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { X, Upload, FileText, CheckCircle } from "lucide-react"

interface Department { id: string; name: string }
interface Category { id: string; name: string }

interface UploadModalProps {
  departments: Department[]
  categories: Category[]
  userDeptId: string | null
  onClose: () => void
  onSuccess: (doc: any) => void
}

export function UploadModal({ departments, categories, userDeptId, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [departmentId, setDepartmentId] = useState(userDeptId ?? "")
  const [categoryId, setCategoryId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError("")
    setLoading(true)

    const fd = new FormData()
    fd.append("file", file)
    fd.append("name", name || file.name.replace(/\.[^.]+$/, ""))
    if (description) fd.append("description", description)
    if (departmentId) fd.append("departmentId", departmentId)
    if (categoryId) fd.append("categoryId", categoryId)

    const res = await fetch("/api/documents", { method: "POST", body: fd })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Error al subir")
      return
    }

    const doc = await res.json()
    onSuccess(doc)
  }

  const formatSize = (b: number) =>
    b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Subir documento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {/* File picker */}
            <div>
              <Label>Archivo *</Label>
              <div
                className="mt-1.5 border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-slate-500" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-500 ml-1" />
                  </div>
                ) : (
                  <div className="text-slate-400">
                    <Upload className="w-6 h-6 mx-auto mb-1.5" />
                    <p className="text-sm">Selecciona el archivo</p>
                    <p className="text-xs mt-0.5">PDF, Word, Excel, imagenes — max 50MB</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setFile(f)
                      if (!name) setName(f.name.replace(/\.[^.]+$/, ""))
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nombre del documento</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nomina Enero 2026..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descripcion (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Descripcion breve del contenido..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={!file || loading} className="flex-1">
              {loading ? "Subiendo..." : "Subir documento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
