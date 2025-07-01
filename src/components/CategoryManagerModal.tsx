// Dosya Yolu: src/components/CategoryManagerModal.tsx
import { useState, useEffect, useMemo, FC } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { Category } from '@prisma/client';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Kategori adı zorunludur."),
  parentId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type CategoryWithChildren = Category & { children: CategoryWithChildren[] };

// Özyineli bileşen - DÜZELTİLMİŞ YAPI
const CategoryTree: FC<{ categories: CategoryWithChildren[], level?: number, onDelete: (id: string) => void, confirmingDeleteId: string | null }> = ({ categories, level = 0, onDelete, confirmingDeleteId }) => {
    if (!categories || categories.length === 0) return null;

    return (
        <ul className={level > 0 ? 'pl-4' : ''}>
            {categories.map(cat => (
                <li key={cat.id} className="my-1.5"> {/* Ana liste elemanı */}
                    {/* Kategori adı ve butonunu içeren satır */}
                    <div className="flex justify-between items-center p-2 bg-gray-100 rounded-md text-sm group">
                        <span>{cat.name}</span>
                        <button
                            onClick={() => onDelete(cat.id)}
                            className={`px-2 py-1 text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                confirmingDeleteId === cat.id 
                                ? 'bg-red-600 text-white' 
                                : 'bg-red-200 text-red-800 hover:bg-red-300'
                            }`}
                        >
                            {confirmingDeleteId === cat.id ? 'Emin misin?' : 'Sil'}
                        </button>
                    </div>
                    {/* Alt kategoriler varsa, onları bu satırın altına render et */}
                    {cat.children && cat.children.length > 0 && (
                        <div className="pt-1 border-l-2 border-gray-200 ml-2">
                            <CategoryTree categories={cat.children} level={level + 1} onDelete={onDelete} confirmingDeleteId={confirmingDeleteId} />
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
};


// Açılır menü için hiyerarşik <option> elemanları oluşturan fonksiyon
const renderCategoryOptions = (categories: CategoryWithChildren[], level = 0): JSX.Element[] => {
    return categories.flatMap(cat => [
        <option key={cat.id} value={cat.id}>
            {'\u00A0'.repeat(level * 4)} {cat.name}
        </option>,
        ...(cat.children ? renderCategoryOptions(cat.children, level + 1) : [])
    ]);
};

export default function CategoryManagerModal({ isOpen, onClose }: CategoryManagerModalProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const fetchCategories = () => {
    setLoading(true);
    fetch('/api/categories')
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setCategories(data); })
        .catch(() => toast.error("Kategoriler yüklenemedi."))
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    } else {
      setConfirmingDeleteId(null);
    }
  }, [isOpen]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: data.name,
            parentId: data.parentId || null
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Kategori oluşturulamadı.');
      }
      toast.success('Kategori başarıyla oluşturuldu!');
      reset();
      fetchCategories();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirmingDeleteId !== categoryId) {
      setConfirmingDeleteId(categoryId);
      setTimeout(() => {
        setConfirmingDeleteId(currentId => currentId === categoryId ? null : currentId);
      }, 3000);
      return;
    }

    setLoading(true);
    try {
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'DELETE',
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Kategori silinemedi.');
        }
        toast.success('Kategori başarıyla silindi!');
        fetchCategories();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
        setConfirmingDeleteId(null);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Kategorileri Yönet">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 className="font-semibold mb-2 text-gray-800">Mevcut Kategoriler</h4>
                <div className="h-72 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                    {loading && <p>Yükleniyor...</p>}
                    {!loading && categoryTree.length === 0 && <p className="text-gray-500">Henüz kategori eklenmemiş.</p>}
                    {!loading && <CategoryTree categories={categoryTree} onDelete={handleDeleteCategory} confirmingDeleteId={confirmingDeleteId} />}
                </div>
            </div>
            <div>
                <h4 className="font-semibold mb-2 text-gray-800">Yeni Kategori Ekle</h4>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 bg-white rounded-lg border">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Kategori Adı</label>
                        <input id="name" {...register('name')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="parentId" className="block text-sm font-medium text-gray-700">Ana Kategori (Opsiyonel)</label>
                        <select id="parentId" {...register('parentId')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                            <option value="">Ana Kategori Olarak Ekle</option>
                            {renderCategoryOptions(categoryTree)}
                        </select>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
                            {loading ? 'Ekleniyor...' : 'Ekle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </Modal>
  );
}
