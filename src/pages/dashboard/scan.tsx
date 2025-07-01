// Dosya Yolu: src/pages/dashboard/scan.tsx
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import { StockMovementType } from "@prisma/client";

export default function ScanPage() {
  const { data: session, status } = useSession({ required: true });
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ message: string; success: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // YENİ: İşlem tipi, miktar ve anlık fiyatlar için state'ler
  const [transactionType, setTransactionType] = useState<StockMovementType>('OUT');
  const [quantity, setQuantity] = useState(1);
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  const handleScanSubmit = async (code: string) => {
    if (!code || loading || quantity < 1) {
        if(quantity < 1) toast.error("Miktar 1'den küçük olamaz.");
        return;
    }

    setLoading(true);
    setLastScanned(null);

    try {
      // YENİ: Payload anlık fiyatları da içeriyor
      const payload = { 
        code, 
        quantity, 
        type: transactionType,
        costPrice: costPrice === '' ? undefined : costPrice,
        sellingPrice: sellingPrice === '' ? undefined : sellingPrice
      };

      const response = await fetch('/api/stock/scan-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }
      
      toast.success(result.message);
      setLastScanned({ message: result.message, success: true });

    } catch (error) {
      toast.error((error as Error).message);
      setLastScanned({ message: (error as Error).message, success: false });
    } finally {
      setInputValue('');
      // İşlem sonrası fiyat alanlarını da temizle
      setCostPrice('');
      setSellingPrice('');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (inputValue) {
        debounceTimer.current = setTimeout(() => {
            handleScanSubmit(inputValue);
        }, 300);
    }
    return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputValue, quantity, transactionType, costPrice, sellingPrice]); // Fiyatlar değiştiğinde de zamanlayıcıyı etkile


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    handleScanSubmit(inputValue);
  };

  if (status === "loading") {
    return <div className="p-8">Oturum kontrol ediliyor...</div>;
  }
  
  const canPerformAction = (transactionType === 'IN' && session?.user.permissions?.canAddStock) || (transactionType === 'OUT' && session?.user.permissions?.canRemoveStock);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Hızlı Stok İşlemi</h1>
            <p className="text-center text-gray-500 mb-6">İşlem tipini seçin, detayları girin ve kodu okutun.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2 flex rounded-lg shadow-sm">
                    <button
                        onClick={() => setTransactionType('IN')}
                        className={`w-full rounded-l-lg p-3 text-sm font-semibold transition-colors ${transactionType === 'IN' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Stok Girişi
                    </button>
                    <button
                        onClick={() => setTransactionType('OUT')}
                        className={`w-full rounded-r-lg p-3 text-sm font-semibold transition-colors ${transactionType === 'OUT' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Stok Çıkışı
                    </button>
                </div>
                <div>
                    <label htmlFor="quantity" className="block text-xs font-medium text-gray-600 mb-1">Miktar</label>
                    <input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg"
                        min="1"
                    />
                </div>
                {/* YENİ: Koşullu Fiyat Alanları */}
                {transactionType === 'IN' && (
                    <div>
                        <label htmlFor="costPrice" className="block text-xs font-medium text-gray-600 mb-1">Anlık Maliyet (Opsiyonel)</label>
                        <input
                            id="costPrice"
                            type="number"
                            step="0.01"
                            value={costPrice}
                            onChange={(e) => setCostPrice(Number(e.target.value))}
                            className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg"
                            placeholder="Varsayılan kullanılır"
                        />
                    </div>
                )}
                {transactionType === 'OUT' && (
                    <div>
                        <label htmlFor="sellingPrice" className="block text-xs font-medium text-gray-600 mb-1">Anlık Satış Fiyatı (Opsiyonel)</label>
                        <input
                            id="sellingPrice"
                            type="number"
                            step="0.01"
                            value={sellingPrice}
                            onChange={(e) => setSellingPrice(Number(e.target.value))}
                            className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg"
                            placeholder="Varsayılan kullanılır"
                        />
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={loading || !canPerformAction}
                    className="w-full px-4 py-3 text-center text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100"
                    placeholder={canPerformAction ? "Okuyucu bekleniyor..." : "Bu işlem için yetkiniz yok."}
                    autoComplete="off"
                />
            </form>

            <div className="mt-6 min-h-[60px] flex items-center justify-center p-4 rounded-lg bg-gray-50">
                {loading ? (
                    <p className="text-gray-500 animate-pulse">İşleniyor...</p>
                ) : lastScanned ? (
                    <p className={`text-center font-semibold ${lastScanned.success ? 'text-green-600' : 'text-red-600'}`}>
                        {lastScanned.message}
                    </p>
                ) : (
                    <p className="text-gray-400">Son işlem sonucu burada görünecek</p>
                )}
            </div>
        </div>
        <Link href="/dashboard" className="text-blue-600 hover:underline mt-8">
            &larr; Dashboard'a Dön
        </Link>
    </div>
  );
}
