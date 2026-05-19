"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Star } from "lucide-react"

function Form() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get("project") ?? ""

  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [clientName, setClientName] = useState("")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError("Selecciona una calificacion"); return }
    if (!projectId) { setError("Enlace invalido"); return }
    setLoading(true)
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, clientName, rating, comment: comment || null }),
    })
    setLoading(false)
    if (res.ok) {
      setDone(true)
    } else {
      setError("Error al enviar. Intenta de nuevo.")
    }
  }

  if (done) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-4xl font-bold text-amber-500">Gracias</p>
        <h2 className="text-xl font-semibold text-slate-900">Tu opinion fue registrada</h2>
        <p className="text-slate-500 text-sm">Tu retroalimentacion nos ayuda a mejorar nuestro servicio.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Tu nombre</Label>
        <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre o empresa..." required />
      </div>

      <div className="space-y-2">
        <Label>Calificacion del servicio *</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              className="focus:outline-none"
            >
              <Star
                className={`w-9 h-9 transition-colors ${
                  star <= (hover || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-200"
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-slate-500">
            {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][rating]}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Comentarios (opcional)</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Comparte tu experiencia con nuestro servicio..."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando..." : "Enviar calificacion"}
      </Button>
    </form>
  )
}

interface Props {
  companyName: string
  companyLogo: string | null
}

export function EncuestaForm({ companyName, companyLogo }: Props) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          {companyLogo && !imgError ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-16 max-w-[120px] object-contain mx-auto mb-4"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-white text-2xl font-bold mb-4">
              {companyName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-semibold text-slate-900">Califica nuestro servicio</h1>
          <p className="text-sm text-slate-500 mt-1">{companyName}</p>
        </div>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <p className="text-sm text-slate-600">Tu opinion es muy importante para nosotros</p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-40 animate-pulse bg-slate-100 rounded-xl" />}>
              <Form />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
