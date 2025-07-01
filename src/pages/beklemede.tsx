// src/pages/beklemede.tsx
import { signOut } from "next-auth/react";

export default function BeklemedePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-lg text-center">
                <h1 className="text-2xl font-bold text-yellow-600 mb-4">Bekleme Onayı</h1>
                <p className="text-gray-700 mb-6">
                    Henüz bir şirkete atanmadınız. <br/>
                    Lütfen sistem yöneticinizin sizi bir şirkete atamasını bekleyin.
                </p>
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="px-6 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                    Çıkış Yap
                </button>
            </div>
        </div>
    );
}