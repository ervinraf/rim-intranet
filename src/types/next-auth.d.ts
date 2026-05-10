import "next-auth"

declare module "next-auth" {
  interface User {
    employeeId?: string | null
    employeeType?: string | null
    role?: string | null
    permissions?: string[]
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      employeeId?: string | null
      employeeType?: string | null
      role?: string | null
      permissions?: string[]
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    employeeId?: string | null
    employeeType?: string | null
    role?: string | null
    permissions?: string[]
  }
}
