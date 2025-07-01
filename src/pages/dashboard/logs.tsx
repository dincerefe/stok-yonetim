// Dosya Yolu: src/pages/dashboard/logs.tsx
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import { StockMovement, StockItem, User, StockMovementType } from "@prisma/client";

type MovementWithDetails = StockMovement & {
  stockItem: Pick<StockItem, 'name'> | null;
  user: Pick<User, 'name'> | null;
};

// İşlem tipine göre stil döndüren yardımcı fonksiyon
const getTypeStyles = (type: StockMovementType) => {
    switch (type) {
        case 'IN':
            return { text: 'GİRİŞ', className: 'bg-green-100 text-green-800' };
        case 'OUT':
            return { text: 'ÇIKIŞ', className: 'bg-red-100 text-red-800' };
        case 'ADJUST':
            return { text: 'DÜZELTME', className: 'bg-yellow-100 text-yellow-800' };
        default:
            return { text: type, className: 'bg-gray-100 text-gray-800' };
    }
};

export default function StockLogsPage() {
  const { status } = useSession({ required: true });
  const [movements, setMovements] = useState<MovementWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null); // Yazdırılacak alan için ref

  useEffect(() => {
    if (status === "authenticated") {
      setLoading(true);
      setError(null);
      fetch('/api/stock/movements')
        .then(res => {
          if (!res.ok) throw new Error('Veriler yüklenirken bir sorun oluştu.');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setMovements(data);
          }
        })
        .catch(err => {
            console.error(err);
            setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [status]);

  // YENİ: Yazdırma fonksiyonu
  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
        const printWindow = window.open('', '', 'height=800,width=1200');
        if (!printWindow) {
            toast.error("Yazdırma penceresi açılamadı. Lütfen pop-up engelleyicinizi kontrol edin.");
            return;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Stok Hareket Raporu</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                        th { background-color: #f1f5f9; font-weight: 600; }
                        h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
                        .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
                        @media print {
                            @page { size: A4 landscape; margin: 15mm; }
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Stok Hareket Raporu</h1>
                    <div class="header-info">
                        <div><strong>Rapor Tarihi:</strong> ${new Date().toLocaleString('tr-TR')}</div>
                        <div><strong>Toplam Kayıt:</strong> ${movements.length}</div>
                    </div>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <tr><td colSpan={7} className="text-center p-6 text-gray-500">Yükleniyor...</td></tr>;
    }
    if (error) {
      return <tr><td colSpan={7} className="text-center p-6 text-red-500">{error}</td></tr>;
    }
    if (movements.length === 0) {
      return <tr><td colSpan={7} className="text-center p-6 text-gray-500">Gösterilecek stok hareketi bulunmuyor.</td></tr>;
    }
    return movements.map(m => {
        const typeStyle = getTypeStyles(m.type);
        return (
            <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm text-gray-600">{new Date(m.createdAt).toLocaleString('tr-TR')}</td>
                <td className="p-3 font-semibold">{m.stockItem?.name || 'Bilinmeyen Ürün'}</td>
                <td className="p-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${typeStyle.className}`}>
                        {typeStyle.text}
                    </span>
                </td>
                <td className={`p-3 text-center font-mono font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </td>
                <td className="p-3 text-sm">
                    {m.costPrice !== null && `M: ${m.costPrice?.toFixed(2)}`}
                    {m.sellingPrice !== null && `S: ${m.sellingPrice?.toFixed(2)}`}
                </td>
                <td className="p-3 text-sm text-gray-700">{m.user?.name || 'Bilinmeyen Kullanıcı'}</td>
                <td className="p-3 text-sm text-gray-500">{m.notes || '-'}</td>
            </tr>
        );
    });
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Stok Hareket Kayıtları</h1>
            <p className="text-gray-500">Şirketinizdeki son 100 stok hareketini görüntüleyin.</p>
        </div>
        <div className="flex items-center space-x-4">
            <button
                onClick={handlePrint}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
            >
                Raporu Yazdır
            </button>
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              &larr; Dashboard'a Dön
            </Link>
        </div>
      </header>
      <div ref={printRef} className="overflow-x-auto bg-white p-4 rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Tarih</th>
              <th className="p-3 text-left">Ürün</th>
              <th className="p-3 text-left">İşlem</th>
              <th className="p-3 text-center">Miktar</th>
              <th className="p-3 text-left">İşlem Fiyatı (TL)</th>
              <th className="p-3 text-left">Kullanıcı</th>
              <th className="p-3 text-left">Notlar</th>
            </tr>
          </thead>
          <tbody>
            {renderContent()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
