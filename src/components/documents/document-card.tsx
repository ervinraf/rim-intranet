"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText, FileSpreadsheet, FileImage, File,
  Download, Eye, Upload, History, Lock, Trash2,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { PermissionLevel } from "@/app/(intranet)/dashboard/documentos/documents-client"
import { VersionHistoryModal } from "./version-history-modal"

const levelConfig = {
  VER:       { label: "Ver",        className: "bg-slate-100 text-slate-500" },
  COMENTAR:  { label: "Comentar",   className: "bg-blue-100 text-blue-700" },
  EDITAR:    { label: "Editar",     className: "bg-amber-100 text-amber-700" },
  DESCARGAR: { label: "Descargar",  className: "bg-green-100 text-green-700" },
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return File
  if (mimeType.includes("pdf")) return FileText
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) return FileSpreadsheet
  if (mimeType.startsWith("image/")) return FileImage
  return File
}

function getFileColor(mimeType?: string | null) {
  if (!mimeType) return "bg-slate-100 text-slate-500"
  if (mimeType.includes("pdf")) return "bg-red-100 text-red-600"
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "bg-green-100 text-green-700"
  if (mimeType.startsWith("image/")) return "bg-blue-100 text-blue-600"
  if (mimeType.includes("word") || mimeType.includes("document")) return "bg-indigo-100 text-indigo-600"
  return "bg-slate-100 text-slate-500"
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

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
  category?: { name: string } | null
  _count: { versions: number }
}

interface DocumentCardProps {
  document: Doc
  isAdmin: boolean
  onNewVersion: () => void
  onDelete?: (id: string) => void
}

export function DocumentCard({ document: doc, isAdmin, onNewVersion, onDelete }: DocumentCardProps) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [uploadNote, setUploadNote] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleDelete() {
    if (!confirm(`Eliminar "${doc.name}"?`)) return
    setDeleting(true)
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" })
    setDeleting(false)
    onDelete?.(doc.id)
  }
  const level = doc.effectiveLevel
  const levelCfg = level ? levelConfig[level] : null

  const canDownload = level === "DESCARGAR" || isAdmin
  const canEdit = level === "EDITAR" || level === "DESCARGAR" || isAdmin

  const Icon = getFileIcon(doc.mimeType)
  const iconColor = getFileColor(doc.mimeType)

  async function handleNewVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("note", `Version ${doc.version + 1}`)
    await fetch(`/api/documents/${doc.id}/versions`, { method: "POST", body: fd })
    setUploading(false)
    onNewVersion()
    e.target.value = ""
  }

  return (
    <>
      <div className={`bg-white border rounded-xl p-4 flex flex-col gap-3 transition-all ${
        !level ? "opacity-50 pointer-events-none" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}>
        {/* Icon + name */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate" title={doc.name}>
              {doc.name}
            </p>
            {doc.category && (
              <p className="text-xs text-slate-400 truncate">{doc.category.name}</p>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>v{doc.version} · {formatFileSize(doc.fileSize)}</span>
          <span>{format(new Date(doc.updatedAt), "d MMM", { locale: es })}</span>
        </div>

        {/* Permission badge */}
        {levelCfg && !isAdmin && (
          <span className={`self-start text-xs font-medium px-2 py-0.5 rounded-full ${levelCfg.className}`}>
            {levelCfg.label}
          </span>
        )}
        {!level && !isAdmin && (
          <span className="self-start text-xs text-slate-400 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Sin acceso
          </span>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 mt-auto">
          {/* Ver/previsualizar */}
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full text-xs h-8">
              <Eye className="w-3.5 h-3.5 mr-1" />
              Ver
            </Button>
          </a>

          {/* Descargar */}
          {canDownload && (
            <a href={doc.fileUrl} download={doc.fileName}>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Download className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}

          {/* Historial de versiones */}
          {doc._count.versions > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowHistory(true)}
              title="Historial de versiones"
            >
              <History className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Nueva version */}
          {canEdit && (
            <>
              <input
                type="file"
                ref={fileRef}
                className="hidden"
                onChange={handleNewVersion}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                title="Subir nueva version"
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {/* Eliminar (solo admin) */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:border-red-300"
              disabled={deleting}
              onClick={handleDelete}
              title="Eliminar documento"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {showHistory && (
        <VersionHistoryModal
          documentId={doc.id}
          documentName={doc.name}
          currentVersion={doc.version}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  )
}
