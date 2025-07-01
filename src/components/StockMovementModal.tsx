// Dosya Yolu: src/components/StockMovementModal.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from './Modal';
import toast from 'react-hot-toast';

// Props arayüzü
interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stockItem: { id: string; name: string; } | null;
  movementType: 'IN' | 'OUT';
}

// Şema, boş string'leri NaN hatasını önlemek için undefined'a dönüştürecek şekilde güncellendi.
const formSchema = z.object({
  quantity: z.coerce.number().int().positive("Miktar pozitif bir tam sayı olmalıdır."),
  costPrice: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({ invalid_type_error: 'Geçerli bir sayı girin.' }).min(0).optional()
  ),
  sellingPrice: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({ invalid_type_error: 'Geçerli bir sayı girin.' }).min(0).optional()
  ),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function StockMovementModal({ isOpen, onClose, onSuccess, stockItem, movementType }: StockMovementModalProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // DÜZELTME: Formun başlangıç değerlerini açıkça ayarlamak, kararlılığı artırır.
    defaultValues: {
        quantity: undefined,
        costPrice: undefined,
        sellingPrice: undefined,
        notes: ""
    }
  });
  const [loading, setLoading] = useState(false);

  // Modal her açıldığında veya stockItem değiştiğinde formu sıfırla
  useEffect(() => {
    if (isOpen) {
        reset({
            quantity: undefined,
            costPrice: undefined,
            sellingPrice: undefined,
            notes: ""
        });
    }
  }, [isOpen, stockItem, reset]);


  const onSubmit = async (data: FormValues) => {
    if (!stockItem) return;
    setLoading(true);

    // HATA AYIKLAMA: Gönderilen form verilerini konsola yazdır
    console.log("Form verileri gönderiliyor:", data);

    const payload = {
      stockItemId: stockItem.id,
      quantity: data.quantity,
      type: movementType,
      notes: data.notes,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
    };

    // HATA AYIKLAMA: API'ye gönderilen son payload'ı konsola yazdır
    console.log("API'ye gönderilen payload:", payload);

    try {
      const response = await fetch('/api/stock/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'İşlem başarısız oldu.');
      }
      toast.success('İşlem başarılı!');
      onSuccess();
      handleClose();
    } catch (error) {
      // HATA AYIKLAMA: Oluşan hatayı konsola yazdır
      console.error("Stok hareketi hatası:", error);
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Formu sıfırlayarak modal'ı kapat
    reset();
    onClose();
  };

  if (!stockItem) return null;
  const title = movementType === 'IN' ? `Stok Girişi: ${stockItem.name}` : `Stok Çıkışı: ${stockItem.name}`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Miktar</label>
          <input id="quantity" type="number" {...register('quantity')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" autoFocus />
          {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>}
        </div>

        {/* Koşullu Fiyat Alanları */}
        {movementType === 'IN' && (
          <div>
            <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700">Birim Maliyet (Opsiyonel)</label>
            <input id="costPrice" type="number" step="0.01" {...register('costPrice')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            {errors.costPrice && <p className="mt-1 text-sm text-red-600">{errors.costPrice.message}</p>}
          </div>
        )}
        {movementType === 'OUT' && (
          <div>
            <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700">Birim Satış Fiyatı (Opsiyonel)</label>
            <input id="sellingPrice" type="number" step="0.01" {...register('sellingPrice')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            {errors.sellingPrice && <p className="mt-1 text-sm text-red-600">{errors.sellingPrice.message}</p>}
          </div>
        )}

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notlar (Opsiyonel)</label>
          <textarea id="notes" {...register('notes')} rows={2} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div className="flex justify-end pt-4 space-x-3">
          <button type="button" onClick={handleClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
          <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
}