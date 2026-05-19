import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              employee: {
                include: {
                  role: {
                    include: { permissions: { include: { permission: true } } },
                  },
                },
              },
            },
          })

          if (!user || !user.passwordHash || !user.isActive) return null

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          )
          if (!valid) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            employeeId: user.employee?.id ?? null,
            employeeType: user.employee?.employeeType ?? null,
            role: user.employee?.role?.name ?? null,
            permissions:
              user.employee?.role?.permissions.map(
                (rp) => `${rp.permission.module}:${rp.permission.action}`
              ) ?? [],
          }
        } catch (err) {
          console.error("[auth] authorize error:", err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.employeeId = (user as any).employeeId
        token.employeeType = (user as any).employeeType
        token.role = (user as any).role
        token.permissions = (user as any).permissions
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.employeeId = token.employeeId as string
        session.user.employeeType = token.employeeType as string
        session.user.role = token.role as string
        session.user.permissions = token.permissions as string[]
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas — cierre de sesion automatico
  },
})
