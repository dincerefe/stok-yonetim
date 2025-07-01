// Dosya Yolu: src/components/NewStockItemModal.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { Category } from '@prisma/client';

// Gerekli kütüphaneler için script yükleyici fonksiyonu
const loadScript = (src: string) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error(`Script load error for ${src}`));
    document.body.appendChild(script);
  });
};


interface NewStockItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Zod şeması tüm yeni alanları içerecek şekilde güncellendi
const formSchema = z.object({
  name: z.string().min(1, "Ürün adı zorunludur."),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  location: z.string().optional(),
  quantity: z.coerce.number().int().min(0, "Miktar 0 veya daha büyük olmalıdır."),
  minStockLevel: z.coerce.number().int().min(0).optional(),
  maxStockLevel: z.coerce.number().int().min(0).optional(),
  unit: z.string().optional(),
  costPrice: z.coerce.number().min(0, "Maliyet fiyatı 0 veya daha büyük olmalıdır."),
  sellingPrice: z.coerce.number().min(0, "Satış fiyatı 0 veya daha büyük olmalıdır."),
  vatRate: z.coerce.number().min(0).optional(),
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

export default function NewStockItemModal({ isOpen, onClose, onSuccess }: NewStockItemModalProps) {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        unit: 'adet',
        vatRate: 20,
    }
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  // DÜZELTME: Barkod ref'i kaldırıldı, çünkü artık görsel olarak çizilmeyecek.

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        loadScript("https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"),
        loadScript("https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js")
      ]).catch(err => console.error(err));

      fetch('/api/categories')
        .then(res => res.json())
        .then(data => setCategories(data))
        .catch(() => toast.error("Kategoriler yüklenemedi."));
    }
  }, [isOpen]);

  const generateSkuAndQrCode = () => {
    const newSku = `SKU-${Date.now()}`;
    setValue('sku', newSku);
    // @ts-ignore
    if (window.QRCode) {
        // @ts-ignore
        window.QRCode.toDataURL(newSku, { width: 128 }, (err, url) => {
            if (err) {
                toast.error("QR Kod oluşturulamadı.");
                return;
            }
            setQrCodeUrl(url);
        });
    }
  };

  const generateBarcode = () => {
    const newBarcode = Math.random().toString().slice(2, 15); // 13 haneli rastgele numara
    setValue('barcode', newBarcode);
    // DÜZELTME: Görsel çizim kısmı kaldırıldı.
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const response = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            categoryId: data.categoryId || null
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Stok oluşturulamadı.');
      }
      toast.success('Yeni stok başarıyla oluşturuldu!');
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setQrCodeUrl('');
    // DÜZELTME: Barkod canvas'ını temizleme kısmı kaldırıldı.
    onClose();
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Yeni Stok Kartı Oluştur">
      <div className="flex flex-col" style={{maxHeight: '80vh'}}>
        <div className="flex-grow overflow-y-auto px-4">
          <form id="new-stock-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
            {/* Ürün Tanımlayıcı Bilgiler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="new-name" className="block text-sm font-medium text-gray-700">Ürün Adı</label>
                    <input id="new-name" {...register('name')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>
                <div>
                    <label htmlFor="new-sku" className="block text-sm font-medium text-gray-700">Stok Kodu (SKU)</label>
                    <div className="flex items-center space-x-2">
                        <input id="new-sku" {...register('sku')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        <button type="button" onClick={generateSkuAndQrCode} className="mt-1 px-3 py-2 bg-gray-200 rounded-md text-sm hover:bg-gray-300">Oluştur</button>
                    </div>
                    {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="mt-2" />}
                </div>
                <div>
                    <label htmlFor="new-categoryId" className="block text-sm font-medium text-gray-700">Kategori</label>
                    <select id="new-categoryId" {...register('categoryId')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="">Kategorisiz</option>
                        {renderCategoryOptions(categoryTree)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="new-brand" className="block text-sm font-medium text-gray-700">Marka</label>
                    <input id="new-brand" {...register('brand')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>
            <div>
                <label htmlFor="new-description" className="block text-sm font-medium text-gray-700">Açıklama</label>
                <textarea id="new-description" {...register('description')} rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            
            {/* Fiyat Bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="new-costPrice" className="block text-sm font-medium text-gray-700">Maliyet Fiyatı</label>
                    <input id="new-costPrice" type="number" step="0.01" {...register('costPrice')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                    {errors.costPrice && <p className="mt-1 text-sm text-red-600">{errors.costPrice.message}</p>}
                </div>
                <div>
                    <label htmlFor="new-sellingPrice" className="block text-sm font-medium text-gray-700">Satış Fiyatı</label>
                    <input id="new-sellingPrice" type="number" step="0.01" {...register('sellingPrice')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                    {errors.sellingPrice && <p className="mt-1 text-sm text-red-600">{errors.sellingPrice.message}</p>}
                </div>
                <div>
                    <label htmlFor="new-vatRate" className="block text-sm font-medium text-gray-700">KDV Oranı (%)</label>
                    <input id="new-vatRate" type="number" step="1" {...register('vatRate')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                    {errors.vatRate && <p className="mt-1 text-sm text-red-600">{errors.vatRate.message}</p>}
                </div>
            </div>

            {/* Stok Seviye Bilgileri */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="new-quantity" className="block text-sm font-medium text-gray-700">Başlangıç Miktarı</label>
                    <input id="new-quantity" type="number" step="1" {...register('quantity')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                    {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>}
                </div>
                <div>
                    <label htmlFor="new-unit" className="block text-sm font-medium text-gray-700">Birim</label>
                    <input id="new-unit" {...register('unit')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="new-minStockLevel" className="block text-sm font-medium text-gray-700">Min. Stok</label>
                    <input id="new-minStockLevel" type="number" {...register('minStockLevel')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>

            {/* Depolama ve Takip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="new-location" className="block text-sm font-medium text-gray-700">Lokasyon</label>
                    <input id="new-location" {...register('location')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label htmlFor="new-barcode" className="block text-sm font-medium text-gray-700">Barkod</label>
                     <div className="flex items-center space-x-2">
                        <input id="new-barcode" {...register('barcode')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        <button type="button" onClick={generateBarcode} className="mt-1 px-3 py-2 bg-gray-200 rounded-md text-sm hover:bg-gray-300">Oluştur</button>
                    </div>
                    {/* DÜZELTME: Barkod canvas'ı kaldırıldı. */}
                </div>
            </div>
          </form>
        </div>
        <div className="flex-shrink-0 flex justify-end pt-4 space-x-3 border-t mt-4">
          <button type="button" onClick={handleClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
          <button type="submit" form="new-stock-form" disabled={loading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
            {loading ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
