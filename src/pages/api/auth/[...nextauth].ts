// Dosya Yolu: src/pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("E-posta ve şifre gereklidir.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Bu e-posta ile kayıtlı kullanıcı bulunamadı.");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Şifre yanlış.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;

        // Bu sorgu, UserPermission modelindeki TÜM alanları (yeni eklenenler dahil)
        // otomatik olarak çeker. Bu nedenle burada bir değişiklik gerekmez.
        const permissions = await prisma.userPermission.findUnique({
          where: { userId: user.id },
        });

        token.permissions = permissions || {}; 
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.companyId = token.companyId as string | null;
        
        // Bu atama, token'daki tüm yetki nesnesini session'a aktarır.
        // Bu nedenle burada da bir değişiklik gerekmez.
        session.user.permissions = token.permissions as any;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
