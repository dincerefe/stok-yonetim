// Dosya Yolu: src/pages/manager/index.tsx
import { useSession, signOut } from "next-auth/react";
import Link from 'next/link';
import { useRouter } from 'next/router';
import ManagerUserTable from '@/components/ManagerUserTable';

// Bileşeni bir fonksiyon sabiti olarak tanımlamak daha güvenli bir pratiktir.
const ManagerPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 1. Oturum bilgisi hala yükleniyorsa bekleme ekranı göster.
  if (status === "loading") {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Oturum kontrol ediliyor...</p>
        </div>
    );
  }

  // 2. Oturum yoksa (kullanıcı giriş yapmamışsa) giriş sayfasına yönlendir.
  // Bu kontrol normalde middleware tarafından yapılır ama ek bir güvenlik katmanıdır.
  if (status === "unauthenticated") {
    // useEffect içinde yönlendirme yapmak daha güvenlidir.
    // Ancak bu durumda sayfa render edilmeden önce kontrol yapıyoruz.
    // En iyi pratik, middleware'e güvenmektir.
    // Bu kod bloğu, bir anlık boş sayfa gösterebilir.
    return null; 
  }

  // 3. Oturum var ama rol 'MANAGER' değilse yetkisiz ekranı göster.
  if (session && session.user.role !== 'MANAGER') {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
              <h1 className="text-2xl font-bold text-red-600">Yetkiniz Yok</h1>
              <p className="my-2 text-gray-700">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
              <Link href="/dashboard" className="text-blue-600 hover:underline">
                Dashboard'a Dön
              </Link>
          </div>
      );
  }
  
  // 4. Tüm kontrollerden geçtiyse, asıl sayfa içeriğini göster.
  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Yönetici Paneli</h1>
        <div className="flex items-center space-x-4">
             <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
             <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
            >
                Çıkış Yap
            </button>
        </div>
      </header>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Şirket Kullanıcılarını Yönet</h2>
        <ManagerUserTable />
      </div>
    </div>
  );
}

// Bileşeni varsayılan olarak dışa aktar.
export default ManagerPage;
