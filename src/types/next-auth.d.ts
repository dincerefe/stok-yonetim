// Dosya Yolu: src/types/next-auth.d.ts
import { Role, UserPermission } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";

// NextAuth'un Session ve JWT modüllerini, Prisma'dan gelen
// UserPermission tipini içerecek şekilde genişletiyoruz.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      companyId: string | null;
      // 'permissions' alanı artık Prisma'daki UserPermission modeliyle aynı tipe sahip.
      permissions: UserPermission;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    companyId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    companyId: string | null;
    // JWT token'ı da UserPermission tipini içerecek.
    permissions: UserPermission;
  }
}
