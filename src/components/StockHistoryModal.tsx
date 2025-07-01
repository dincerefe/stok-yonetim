// Dosya Yolu: src/components/StockHistoryModal.tsx
import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { StockMovement, User, StockMovementType } from '@prisma/client';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItem: { id: string; name: string } | null;
}

type MovementWithUser = StockMovement & {
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

export default function StockHistoryModal({ isOpen, onClose, stockItem }: StockHistoryModalProps) {
  const [movements, setMovements] = useState<MovementWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null); // Yazdırılacak alan için ref

  useEffect(() => {
    if (isOpen && stockItem) {
      setLoading(true);
      fetch(`/api/stock/${stockItem.id}/movements`)
        .then(res => {
            if (!res.ok) throw new Error("Log kayıtları yüklenemedi.");
            return res.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                setMovements(data);
            }
        })
        .catch((err) => toast.error(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, stockItem]);

  // YENİ: Yazdırma fonksiyonu
  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
        const printWindow = window.open('', '', 'height=800,width=1000');
        if (!printWindow) {
            toast.error("Yazdırma penceresi açılamadı. Lütfen pop-up engelleyicinizi kontrol edin.");
            return;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>${stockItem?.name || ''} - Stok Hareketleri</title>
                    <style>
                        body { font-family: sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        h2 { text-align: center; }
                        @media print {
                            @page { size: auto; margin: 10mm; }
                            body { margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    <h2>${stockItem?.name || ''} - Stok Hareketleri</h2>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        // Pencerenin içeriğinin tam olarak yüklenmesi için küçük bir gecikme
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Stok Geçmişi: ${stockItem?.name || ''}`}>
      <div ref={printRef} className="h-96 overflow-y-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
              <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
              <th className="p-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
              <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat</th>
              <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
              <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notlar</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
                <tr><td colSpan={6} className="text-center p-4">Yükleniyor...</td></tr>
            ) : movements.length > 0 ? (
                movements.map(m => {
                    const typeStyle = getTypeStyles(m.type);
                    return (
                        <tr key={m.id}>
                            <td className="p-2 whitespace-nowrap text-sm text-gray-500">{new Date(m.createdAt).toLocaleString('tr-TR')}</td>
                            <td className="p-2 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeStyle.className}`}>
                                    {typeStyle.text}
                                </span>
                            </td>
                            <td className={`p-2 whitespace-nowrap text-center font-mono ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </td>
                            <td className="p-2 whitespace-nowrap text-sm text-gray-500">
                                {m.costPrice !== null && `M: ${m.costPrice?.toFixed(2)}`}
                                {m.sellingPrice !== null && `S: ${m.sellingPrice?.toFixed(2)}`}
                            </td>
                            <td className="p-2 whitespace-nowrap text-sm text-gray-500">{m.user?.name}</td>
                            <td className="p-2 whitespace-nowrap text-sm text-gray-500">{m.notes}</td>
                        </tr>
                    )
                })
            ) : (
                <tr><td colSpan={6} className="text-center p-4">Bu ürün için hareket kaydı bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
       <div className="flex justify-end pt-4 space-x-3 border-t mt-6">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Kapat</button>
            <button type="button" onClick={handlePrint} className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Yazdır
            </button>
        </div>
    </Modal>
  );
}
