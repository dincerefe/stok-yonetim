// src/pages/index.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Stok Yönetim Uygulamasına Hoş Geldiniz</h1>
        <div className="space-x-4">
          <Link href="/login" className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Giriş Yap
          </Link>
          <Link href="/register" className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700">
              Kayıt Ol
          </Link>
        </div>
      </div>
    </div>
  );
}