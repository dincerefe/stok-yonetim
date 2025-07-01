// Dosya Yolu: src/components/EditStockItemModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { Category, StockItem } from '@prisma/client';

interface EditStockItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stockItem: (StockItem & { category?: Category | null }) | null;
}

// Zod şeması tüm yeni alanları içerecek şekilde güncellendi
const formSchema = z.object({
  name: z.string().min(1, "Ürün adı zorunludur."),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  location: z.string().optional(),
  minStockLevel: z.coerce.number().int().min(0).optional(),
  maxStockLevel: z.coerce.number().int().min(0).optional(),
  unit: z.string().optional(),
  sellingPrice: z.coerce.number().min(0, "Satış fiyatı 0 veya daha büyük olmalıdır."),
  vatRate: z.coerce.number().min(0, "KDV oranı 0 veya daha büyük olmalıdır."),
  categoryId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type CategoryWithChildren = Category & { children: CategoryWithChildren[] };

const renderCategoryOptions = (categories: CategoryWithChildren[], level = 0): JSX.Element[] => {
    return categories.flatMap(cat => [
        <option key={cat.id} value={cat.id}>
            {'\u00A0'.repeat(level * 4)} {cat.name}
        </option>,
        ...(cat.children ? renderCategoryOptions(cat.children, level + 1) : [])
    ]);
};

export default function EditStockItemModal({ isOpen, onClose, onSuccess, stockItem }: EditStockItemModalProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => setCategories(data))
        .catch(() => toast.error("Kategoriler yüklenemedi."));
      
      if (stockItem) {
        // Formu tüm yeni alanlarla doldur
        reset({
            name: stockItem.name,
            description: stockItem.description || "",
            sku: stockItem.sku || "",
            barcode: stockItem.barcode || "",
            brand: stockItem.brand || "",
            location: stockItem.location || "",
            minStockLevel: stockItem.minStockLevel || 0,
            maxStockLevel: stockItem.maxStockLevel || 0,
            unit: stockItem.unit || "adet",
            sellingPrice: stockItem.sellingPrice,
            vatRate: stockItem.vatRate,
            categoryId: stockItem.categoryId || "",
        });
      }
    }
  }, [isOpen, stockItem, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!stockItem) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/stock/${stockItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            categoryId: data.categoryId || null
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Ürün güncellenemedi.');
      }
      toast.success('Ürün başarıyla güncellendi!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const categoryTree = useMemo(() => {
    const map = new Map(categories.map(cat => [cat.id, { ...cat, children: [] }]));
    const tree: CategoryWithChildren[] = [];
    map.forEach(cat => {
        if (cat.parentId && map.has(cat.parentId)) {
            (map.get(cat.parentId)!.children as any).push(cat);
        } else {
            tree.push(cat as any);
        }
    });
    return tree;
  }, [categories]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Stok Kartı Düzenle: ${stockItem?.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Ürün Tanımlayıcı Bilgiler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Ürün Adı</label>
                <input id="edit-name" {...register('name')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div>
                <label htmlFor="edit-sku" className="block text-sm font-medium text-gray-700">Stok Kodu (SKU)</label>
                <input id="edit-sku" {...register('sku')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
                <label htmlFor="edit-categoryId" className="block text-sm font-medium text-gray-700">Kategori</label>
                <select id="edit-categoryId" {...register('categoryId')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                    <option value="">Kategorisiz</option>
                    {renderCategoryOptions(categoryTree)}
                </select>
            </div>
             <div>
                <label htmlFor="edit-brand" className="block text-sm font-medium text-gray-700">Marka</label>
                <input id="edit-brand" {...register('brand')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
        </div>
        <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Açıklama</label>
            <textarea id="edit-description" {...register('description')} rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        
        {/* Fiyat Bilgileri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-sellingPrice" className="block text-sm font-medium text-gray-700">Satış Fiyatı</label>
                <input id="edit-sellingPrice" type="number" step="0.01" {...register('sellingPrice')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                {errors.sellingPrice && <p className="mt-1 text-sm text-red-600">{errors.sellingPrice.message}</p>}
            </div>
            <div>
                <label htmlFor="edit-vatRate" className="block text-sm font-medium text-gray-700">KDV Oranı (%)</label>
                <input id="edit-vatRate" type="number" step="1" {...register('vatRate')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                {errors.vatRate && <p className="mt-1 text-sm text-red-600">{errors.vatRate.message}</p>}
            </div>
        </div>

        {/* Stok Seviye Bilgileri */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label htmlFor="edit-unit" className="block text-sm font-medium text-gray-700">Birim</label>
                <input id="edit-unit" {...register('unit')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
             <div>
                <label htmlFor="edit-minStockLevel" className="block text-sm font-medium text-gray-700">Min. Stok</label>
                <input id="edit-minStockLevel" type="number" {...register('minStockLevel')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
             <div>
                <label htmlFor="edit-maxStockLevel" className="block text-sm font-medium text-gray-700">Max. Stok</label>
                <input id="edit-maxStockLevel" type="number" {...register('maxStockLevel')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
        </div>

        {/* Depolama ve Takip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700">Lokasyon</label>
                <input id="edit-location" {...register('location')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
                <label htmlFor="edit-barcode" className="block text-sm font-medium text-gray-700">Barkod</label>
                <input id="edit-barcode" {...register('barcode')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
        </div>

        <div className="flex justify-end pt-4 space-x-3 border-t mt-6">
          <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
          <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
