// Dosya Yolu: src/middleware.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

interface AppToken {
    role?: Role;
    companyId?: string | null;
    permissions?: {
        canAccessDashboard?: boolean;
    };
}

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const token = (await getToken({ req, secret })) as AppToken | null;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  // 1. Oturum Yoksa -> Giriş sayfasına yönlendir
  if (!token) {
    if (isAuthPage) {
      return NextResponse.next(); // Zaten giriş sayfasındaysa dokunma
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Oturum Varsa ve Giriş Sayfasındaysa -> Dashboard'a yönlendir
  if (isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const { role, companyId, permissions } = token;

  // 3. Admin Rolü Kontrolü (Her zaman öncelikli)
  if (role === "ADMIN") {
    return pathname.startsWith("/admin")
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/admin", req.url));
  }
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url)); // Admin değilse admin paneline giremez
  }

  // 4. Genel Erişim Hakkı Kontrolü
  const hasAccess = companyId && (role === 'MANAGER' || (role === 'USER' && permissions?.canAccessDashboard));

  if (hasAccess) {
    // Erişimi var ama bekleme sayfasındaysa -> Dashboard'a yönlendir
    if (pathname.startsWith('/beklemede')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // Erişimi var ve doğru sayfada -> Devam et
    return NextResponse.next();
  } else {
    // Erişimi yok ama bekleme sayfasında değilse -> Bekleme sayfasına yönlendir
    if (!pathname.startsWith('/beklemede')) {
      return NextResponse.redirect(new URL('/beklemede', req.url));
    }
    // Erişimi yok ve zaten bekleme sayfasında -> Devam et
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/manager/:path*",
    "/login",
    "/register",
    "/beklemede",
  ],
};