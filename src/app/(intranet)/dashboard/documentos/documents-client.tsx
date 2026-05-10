"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Search, Upload, FolderOpen, Building2 } from "lucide-react"
import { DocumentCard } from "@/components/documents/document-card"
import { UploadModal } from "@/components/documents/upload-modal"

export type PermissionLevel = "VER" | "COMENTAR" | "EDITAR" | "DESCARGAR" | null

interface Doc {
  id: string
  name: string
  description?: string | null
  fileName: string
  fileUrl: string
  fileSize?: number | null
  mimeType?: string | null
  version: number
  updatedAt: string
  effectiveLevel: PermissionLevel
  department?: { id: string; name: string } | null
  category?: { id: string; name: string } | null
  _count: { versions: number }
}

interface Department { id: string; name: string }
interface Category { id: string; name: string }

interface Props {
  documents: Doc[]
  departments: Department[]
  categories: Category[]
  isAdmin: boolean
  userDeptId: string | null
}

const levelConfig = {
  VER:       { label: "Solo ver",   className: "bg-slate-100 text-slate-600" },
  COMENTAR:  { label: "Comentar",   className: "bg-blue-100 text-blue-700" },
  EDITAR:    { label: "Editar",     className: "bg-amber-100 text-amber-700" },
  DESCARGAR: { label: "Descargar",  className: "bg-green-100 text-green-700" },
}

export function DocumentsClient({ documents: initial, departments, categories, isAdmin, userDeptId }: Props) {
  const [documents, setDocuments] = useState(initial)
  const [search, setSearch] = useState("")
  const [filterDept, setFilterDept] = useState("all")
  const [filterCat, setFilterCat] = useState("all")
  const [showUpload, setShowUpload] = useState(false)

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase())
      const matchDept = filterDept === "all" || d.department?.id === filterDept
      const matchCat = filterCat === "all" || d.category?.id === filterCat
      return matchSearch && matchDept && matchCat
    })
  }, [documents, search, filterDept, filterCat])

  // Agrupar por departamento
  const byDept = useMemo(() => {
    const map: Record<string, Doc[]> = {}
    for (const doc of filtered) {
      const key = doc.department?.name ?? "General"
      if (!map[key]) map[key] = []
      map[key].push(doc)
    }
    return map
  }, [filtered])

  function handleUploadSuccess(newDoc: Doc) {
    setDocuments((prev) => [newDoc, ...prev])
    setShowUpload(false)
  }

  function handleNewVersion(docId: string) {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, version: d.version + 1, _count: { versions: d._count.versions + 1 } } : d
      )
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documentos</h1>
          <p className="text-slate-500 mt-1 text-sm">{documents.length} documentos</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Subir documento
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDept} onValueChange={(v) => setFilterDept(v ?? "all")}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={(v) => setFilterCat(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leyenda de permisos */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs text-slate-400 mr-1 self-center">Tu acceso:</span>
        {Object.entries(levelConfig).map(([level, cfg]) => (
          <span key={level} className={`text-xs px-2 py-0.5 rounded-full ${cfg.className}`}>
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Documents grouped by dept */}
      {Object.keys(byDept).length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {search ? "Sin resultados para tu busqueda" : "Sin documentos disponibles"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byDept).sort().map(([dept, docs]) => (
            <div key={dept}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">{dept}</h2>
                <span className="text-xs text-slate-400">{docs.length} docs</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {docs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    isAdmin={isAdmin}
                    onNewVersion={() => handleNewVersion(doc.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          departments={departments}
          categories={categories}
          userDeptId={userDeptId}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  )
}
