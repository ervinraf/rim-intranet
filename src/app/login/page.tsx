"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Correo o contrasena incorrectos")
      return
    }

    router.push("/dashboard")
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0a1628 0%, #0f172a 45%, #111827 100%)",
      }}
    >
      {/* Orbes de fondo */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-10%", left: "-5%", width: "50vw", height: "50vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(251,191,36,.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "-15%", right: "-5%", width: "55vw", height: "55vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,.07) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-sm px-4 relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-18 h-18 rounded-2xl text-white text-2xl font-bold mb-4 w-16 h-16"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              boxShadow: "0 0 0 1px rgba(251,191,36,.3), 0 8px 32px rgba(245,158,11,.35), inset 0 1px 0 rgba(255,255,255,.25)",
            }}
          >
            RR
          </div>
          <h1 className="text-2xl font-semibold text-white mt-1">RIM Rigging</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,.7)" }}>Portal interno</p>
        </div>

        {/* Card de login */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.04) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), inset 0 0 0 1px rgba(255,255,255,.07), 0 24px 48px rgba(0,0,0,.4)",
            backdropFilter: "blur(20px)",
          }}
        >
          <p className="text-sm mb-5" style={{ color: "rgba(148,163,184,.8)" }}>
            Ingresa con tu cuenta de empresa
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-xs font-medium">
                Correo electronico
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@rim-rigging.com"
                required
                autoComplete="email"
                className="text-white placeholder:text-slate-600 border-0"
                style={{
                  background: "rgba(255,255,255,.07)",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,.3), inset 0 0 0 1px rgba(255,255,255,.08)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-xs font-medium">
                Contrasena
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="text-white placeholder:text-slate-600 border-0"
                style={{
                  background: "rgba(255,255,255,.07)",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,.3), inset 0 0 0 1px rgba(255,255,255,.08)",
                }}
              />
            </div>

            {error && (
              <div
                className="text-sm rounded-lg px-3 py-2.5"
                style={{
                  background: "rgba(239,68,68,.12)",
                  border: "1px solid rgba(239,68,68,.25)",
                  color: "#fca5a5",
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-semibold mt-2 border-0"
              disabled={loading}
              style={{
                background: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.25), 0 4px 16px rgba(245,158,11,.35)",
                color: "#0f172a",
              }}
            >
              {loading ? "Verificando..." : "Entrar"}
            </Button>

            <div className="text-center pt-1">
              <Link
                href="/forgot-password"
                className="text-xs hover:text-slate-300 transition-colors"
                style={{ color: "rgba(148,163,184,.6)" }}
              >
                Olvide mi contrasena
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(100,116,139,.6)" }}>
          Acceso restringido a personal autorizado de RIM Rigging
        </p>
        <p className="text-center text-xs mt-1.5" style={{ color: "rgba(100,116,139,.4)" }}>
          &copy; {new Date().getFullYear()} PC Support DEV SLP
        </p>
      </div>
    </div>
  )
}
