// Dosya Yolu: src/pages/dashboard/index.tsx
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback, useMemo, Fragment, FC } from "react";
import Link from "next/link";
import StockMovementModal from "@/components/StockMovementModal";
import NewStockItemModal from "@/components/NewStockItemModal";
import CategoryManagerModal from "@/components/CategoryManagerModal";
import StockHistoryModal from "@/components/StockHistoryModal";
import EditStockItemModal from "@/components/EditStockItemModal";
import CodePrintModal from "@/components/CodePrintModal";
import { StockItem as PrismaStockItem, Category } from "@prisma/client";
import toast from "react-hot-toast";

// --- İkonlar ---
const IconPlus: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const IconMinus: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>;
const IconPencil: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const IconTrash: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconClipboardList: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const IconChevronDown: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const IconFolder: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const IconAlertTriangle: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const IconQrcode: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6.5 2.5l-2.5 2.5M12 4a8 8 0 100 16 8 8 0 000-16z" /><path d="M12 4a8 8 0 018 8" /></svg>;
const IconBarcode: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5A.75.75 0 0 1 4.5 3.75h15a.75.75 0 0 1 .75.75v15a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75v-15Zm5.25 1.5v12m3-12v12m3-12v12m3-12v12M5.25 6v.008h.008V6H5.25Zm3 0v.008h.008V6H8.25Zm3 0v.008h.008V6h-.008Zm3 0v.008h.008V6h-.008Zm3 0v.008h.008V6h-.008Z" /></svg>;
const IconPrinter: FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;


// --- Tipler ---
type StockItemWithCategory = PrismaStockItem & {
  category?: Category | null;
  profit?: number;
  [key: string]: any;
};

type CategoryNode = {
    category: Category | { id: string, name: string, parentId: null };
    items: StockItemWithCategory[];
    children: CategoryNode[];
    totalCost: number;
    totalProfit: number;
};

// --- Hiyerarşik Listeyi Render Eden Bileşen ---
const CategoryGroupRenderer: FC<{
    group: CategoryNode,
    level: number,
    userPermissions: any,
    collapsedCategories: Set<string>,
    onToggleCollapse: (categoryId: string) => void,
    openMovementModal: (item: StockItemWithCategory, type: 'IN' | 'OUT') => void,
    openHistoryModal: (item: StockItemWithCategory) => void,
    openEditModal: (item: StockItemWithCategory) => void,
    openCodeModal: (item: StockItemWithCategory, type: 'qr' | 'barcode') => void,
    handleDeleteStock: (id: string, name: string) => void,
}> = ({ group, level, userPermissions, collapsedCategories, onToggleCollapse, ...handlers }) => {
    const isCollapsed = collapsedCategories.has(group.category.id);
    const hasChildren = group.children.length > 0 || group.items.length > 0;

    return (
        <Fragment>
            <tr className="bg-gray-200">
                <td colSpan={userPermissions?.canSeeCost ? 8 : 7}>
                    <div 
                        className="flex items-center cursor-pointer p-2"
                        style={{ paddingLeft: `${0.5 + level * 1.5}rem` }}
                        onClick={() => hasChildren && onToggleCollapse(group.category.id)}
                    >
                        {hasChildren && <IconChevronDown className={`w-4 h-4 mr-2 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />}
                        <IconFolder className="w-5 h-5 mr-2 text-gray-500" />
                        <span className="font-bold text-gray-800">{group.category.name}</span>
                    </div>
                </td>
            </tr>
            
            {!isCollapsed && (
                <>
                    {group.items.map(item => {
                        const isLowStock = item.minStockLevel !== null && item.quantity <= item.minStockLevel;
                        return (
                            <tr key={item.id} className={`border-b hover:bg-sky-50/50 text-sm ${isLowStock ? 'bg-yellow-50' : ''}`}>
                                <td className="p-3" style={{ paddingLeft: `${2 + level * 1.5}rem` }}>
                                    <div className="font-medium text-gray-800">{item.name}</div>
                                    <div className="text-xs text-gray-500">SKU: {item.sku || '-'}</div>
                                </td>
                                <td className="p-3 text-center">{item.brand || '-'}</td>
                                <td className="p-3 text-center">{item.location || '-'}</td>
                                <td className="p-3 text-center font-medium">
                                    <div className="flex items-center justify-center">
                                        {isLowStock && <IconAlertTriangle className="w-4 h-4 text-yellow-500 mr-2" title={`Minimum stok seviyesi (${item.minStockLevel}) altına düştü!`} />}
                                        {item.quantity} {item.unit}
                                    </div>
                                </td>
                                {userPermissions?.canSeeCost && <td className="p-3 text-center font-mono">{item.costPrice ? `${item.costPrice.toFixed(2)}` : 'N/A'}</td>}
                                <td className="p-3 text-center font-mono">{item.sellingPrice ? `${item.sellingPrice.toFixed(2)}` : 'N/A'}</td>
                                <td className="p-3 text-center font-mono">{item.vatRate}%</td>
                                <td className="p-3 text-center space-x-1">
                                    <button onClick={() => handlers.openCodeModal(item, 'qr')} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full" title="QR Kodu Göster"><IconQrcode className="w-4 h-4" /></button>
                                    <button onClick={() => handlers.openCodeModal(item, 'barcode')} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full" title="Barkodu Göster"><IconBarcode className="w-4 h-4" /></button>
                                    {userPermissions?.canAddStock && <button onClick={() => handlers.openMovementModal(item, 'IN')} className="p-1.5 text-green-600 hover:bg-green-100 rounded-full" title="Stok Girişi"><IconPlus className="w-4 h-4" /></button>}
                                    {userPermissions?.canRemoveStock && <button onClick={() => handlers.openMovementModal(item, 'OUT')} className="p-1.5 text-red-600 hover:bg-red-100 rounded-full" title="Stok Çıkışı"><IconMinus className="w-4 h-4" /></button>}
                                    {userPermissions?.canSeeLogs && <button onClick={() => handlers.openHistoryModal(item)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full" title="Stok Geçmişi"><IconClipboardList className="w-4 h-4" /></button>}
                                    {userPermissions?.canAddStock && <button onClick={() => handlers.openEditModal(item)} className="p-1.5 text-yellow-500 hover:bg-yellow-100 rounded-full" title="Düzenle"><IconPencil className="w-4 h-4" /></button>}
                                    {userPermissions?.canDeleteStock && <button onClick={() => handlers.handleDeleteStock(item.id, item.name)} className="p-1.5 text-gray-700 hover:bg-red-100 hover:text-red-700 rounded-full" title="Sil"><IconTrash className="w-4 h-4" /></button>}
                                </td>
                            </tr>
                        )
                    })}

                    {group.children.map(childGroup => (
                        <CategoryGroupRenderer key={childGroup.category.id} group={childGroup} level={level + 1} userPermissions={userPermissions} collapsedCategories={collapsedCategories} onToggleCollapse={onToggleCollapse} {...handlers} />
                    ))}
                </>
            )}
        </Fragment>
    );
};


export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stockItems, setStockItems] = useState<StockItemWithCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // Modal state'leri
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItemWithCategory | null>(null);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [isNewStockModalOpen, setIsNewStockModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeModalType, setCodeModalType] = useState<'qr' | 'barcode'>('qr');

  const fetchStockData = useCallback(() => {
    if (status === "authenticated") {
      fetch('/api/stock', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setStockItems(data) })
        .catch(err => console.error("Stok verisi çekilemedi:", err));
    }
  }, [status]);

  useEffect(() => {
    if (status === "unauthenticated") router.push('/login');
    fetchStockData();
  }, [status, router, fetchStockData]);

  const processedData = useMemo(() => {
    const categoryMap = new Map<string, CategoryNode>();
    const rootCategories: CategoryNode[] = [];

    stockItems.forEach(item => {
        let currentCategory = item.category;
        const categoryPath: (Category | { id: string, name: string, parentId: null })[] = [];
        while(currentCategory) {
            categoryPath.unshift(currentCategory);
            const parent = stockItems.find(i => i.category?.id === currentCategory?.parentId)?.category;
            currentCategory = parent;
        }
        
        if (categoryPath.length === 0) {
            categoryPath.push(item.category || { id: 'kategorisiz', name: 'Kategorisiz', parentId: null });
        }

        categoryPath.forEach(cat => {
            if (!categoryMap.has(cat.id)) {
                categoryMap.set(cat.id, { category: cat, items: [], children: [], totalCost: 0, totalProfit: 0 });
            }
        });

        const leafCategoryId = item.categoryId || 'kategorisiz';
        const leafNode = categoryMap.get(leafCategoryId);
        if (leafNode) {
            leafNode.items.push(item);
        }
    });

    categoryMap.forEach(node => {
        if (node.category.parentId && categoryMap.has(node.category.parentId)) {
            categoryMap.get(node.category.parentId)!.children.push(node);
        } else {
            rootCategories.push(node);
        }
    });

    const calculateRecursiveTotals = (node: CategoryNode) => {
        let itemsTotalCost = node.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
        let itemsTotalProfit = node.items.reduce((sum, item) => sum + (item.profit || 0), 0);
        
        node.children.forEach(child => {
            const childTotals = calculateRecursiveTotals(child);
            itemsTotalCost += childTotals.totalCost;
            itemsTotalProfit += childTotals.totalProfit;
        });
        node.totalCost = itemsTotalCost;
        node.totalProfit = itemsTotalProfit;
        return { totalCost: node.totalCost, totalProfit: node.totalProfit };
    };
    rootCategories.forEach(calculateRecursiveTotals);
    
    const term = searchTerm.toLowerCase();
    if (!term) return rootCategories;

    const filterTree = (nodes: CategoryNode[]): CategoryNode[] => {
        return nodes.map(node => ({
            ...node,
            items: node.items.filter(item => item.name.toLowerCase().includes(term) || item.sku?.toLowerCase().includes(term)),
            children: filterTree(node.children)
        })).filter(node => 
            node.items.length > 0 || 
            node.children.length > 0 || 
            node.category.name.toLowerCase().includes(term)
        );
    };

    return filterTree(rootCategories);
  }, [stockItems, searchTerm]);

  const lowStockItems = useMemo(() => {
    return stockItems.filter(item => item.minStockLevel !== null && item.quantity <= item.minStockLevel);
  }, [stockItems]);
  
  const toggleCategoryCollapse = (categoryId: string) => {
      setCollapsedCategories(prev => {
          const newSet = new Set(prev);
          if (newSet.has(categoryId)) {
              newSet.delete(categoryId);
          } else {
              newSet.add(categoryId);
          }
          return newSet;
      });
  };

  const openMovementModal = (stockItem: StockItemWithCategory, type: 'IN' | 'OUT') => { setSelectedStock(stockItem); setMovementType(type); setIsMovementModalOpen(true); };
  const openHistoryModal = (stockItem: StockItemWithCategory) => { setSelectedStock(stockItem); setIsHistoryModalOpen(true); };
  const openEditModal = (stockItem: StockItemWithCategory) => { setSelectedStock(stockItem); setIsEditModalOpen(true); };
  const openCodeModal = (stockItem: StockItemWithCategory, type: 'qr' | 'barcode') => {
    setSelectedStock(stockItem);
    setCodeModalType(type);
    setIsCodeModalOpen(true);
  };
  
  const closeModal = () => {
    setSelectedStock(null);
    setIsMovementModalOpen(false);
    setIsHistoryModalOpen(false);
    setIsEditModalOpen(false);
    setIsCodeModalOpen(false);
  };
  
  const handleDeleteStock = async (stockItemId: string, stockItemName: string) => {
    if (!window.confirm(`'${stockItemName}' adlı ürünü ve tüm hareket kayıtlarını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    const toastId = toast.loading('Ürün siliniyor...');
    try {
        const response = await fetch(`/api/stock/${stockItemId}`, { method: 'DELETE' });
        if (!response.ok) {
            if (response.status !== 204) {
                const result = await response.json();
                throw new Error(result.message || 'Silme işlemi başarısız oldu.');
            }
            throw new Error('Silme işlemi başarısız oldu.');
        }
        toast.success('Ürün başarıyla silindi!', { id: toastId });
        fetchStockData();
    } catch (error) {
        toast.error((error as Error).message, { id: toastId });
    }
  };

  const handlePrintList = () => {
    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) {
        toast.error("Yazdırma penceresi açılamadı. Lütfen pop-up engelleyicinizi kontrol edin.");
        return;
    }

    const renderPrintRows = (nodes: CategoryNode[], level = 0): string => {
        let html = '';
        nodes.forEach(group => {
            html += `<tr style="background-color: #f3f4f6; font-weight: bold;"><td colspan="8" style="padding: 8px; padding-left: ${10 + level * 20}px;">${group.category.name}</td></tr>`;
            group.items.forEach(item => {
                const isLowStock = item.minStockLevel !== null && item.quantity <= item.minStockLevel;
                html += `<tr ${isLowStock ? 'style="background-color: #fef9c3;"' : ''}>
                            <td style="padding: 8px; padding-left: ${20 + level * 20}px;"><div>${item.name}</div><div style="font-size: 10px; color: #6b7280;">SKU: ${item.sku || '-'}</div></td>
                            <td style="text-align: center; padding: 8px;">${item.brand || '-'}</td>
                            <td style="text-align: center; padding: 8px;">${item.location || '-'}</td>
                            <td style="text-align: center; padding: 8px;">${item.quantity} ${item.unit}</td>
                            <td style="text-align: center; padding: 8px;">${(userPermissions?.canSeeCost && item.costPrice) ? `${item.costPrice.toFixed(2)}` : 'N/A'}</td>
                            <td style="text-align: center; padding: 8px;">${item.sellingPrice ? `${item.sellingPrice.toFixed(2)}` : 'N/A'}</td>
                            <td style="text-align: center; padding: 8px;">${item.vatRate}%</td>
                            <td style="text-align: center; padding: 8px;">-</td>
                         </tr>`;
            });
            if (group.children.length > 0) {
                html += renderPrintRows(group.children, level + 1);
            }
        });
        return html;
    };

    const tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
                <tr>
                    <th style="padding: 8px; text-align: left;">Ürün Bilgisi</th>
                    <th style="padding: 8px; text-align: center;">Marka</th>
                    <th style="padding: 8px; text-align: center;">Lokasyon</th>
                    <th style="padding: 8px; text-align: center;">Miktar</th>
                    ${userPermissions?.canSeeCost ? '<th style="padding: 8px; text-align: center;">Maliyet (TL)</th>' : ''}
                    <th style="padding: 8px; text-align: center;">Satış (TL)</th>
                    <th style="padding: 8px; text-align: center;">KDV</th>
                    <th style="padding: 8px; text-align: center;">İşlemler</th>
                </tr>
            </thead>
            <tbody>
                ${renderPrintRows(processedData)}
            </tbody>
        </table>
    `;

    printWindow.document.write(`
        <html><head><title>Stok Listesi Raporu</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 600; }
            @media print { @page { size: A4 landscape; margin: 15mm; } body { margin: 0; } .no-print { display: none; } }
        </style>
        </head><body>
            <h1>Stok Listesi Raporu</h1>
            <div class="header-info">
                <div><strong>Rapor Tarihi:</strong> ${new Date().toLocaleString('tr-TR')}</div>
                <div>Filtre: "${searchTerm || 'Yok'}"</div>
            </div>
            ${tableHtml}
        </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
  };

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><p>Oturum kontrol ediliyor...</p></div>;
  if (!session) return null;

  const userPermissions = session.user.permissions;

  return (
    <>
      <StockMovementModal isOpen={isMovementModalOpen} onClose={closeModal} onSuccess={fetchStockData} stockItem={selectedStock} movementType={movementType} />
      <NewStockItemModal isOpen={isNewStockModalOpen} onClose={() => setIsNewStockModalOpen(false)} onSuccess={fetchStockData} />
      <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
      <StockHistoryModal isOpen={isHistoryModalOpen} onClose={closeModal} stockItem={selectedStock} />
      <EditStockItemModal isOpen={isEditModalOpen} onClose={closeModal} onSuccess={fetchStockData} stockItem={selectedStock} />
      <CodePrintModal isOpen={isCodeModalOpen} onClose={closeModal} stockItem={selectedStock} codeType={codeModalType} />

      <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600">Hoş geldin, {session.user.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
                {session.user.role === "MANAGER" && (
                    <Link href="/manager" className="text-blue-600 hover:underline">Yönetici Paneli</Link>
                )}
                <button onClick={() => signOut({ callbackUrl: '/' })} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">Çıkış Yap</button>
            </div>
        </header>

        {lowStockItems.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                <div className="flex">
                    <div className="py-1"><IconAlertTriangle className="w-6 h-6 text-yellow-500 mr-4" /></div>
                    <div>
                        <p className="font-bold">Kritik Stok Uyarısı</p>
                        <p className="text-sm">{lowStockItems.length} adet ürün minimum stok seviyesinin altına düştü.</p>
                    </div>
                </div>
            </div>
        )}

        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                {userPermissions?.canAddStock && (
                    <button onClick={() => setIsNewStockModalOpen(true)} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors">+ Yeni Stok Ekle</button>
                )}
                {userPermissions?.canRemoveStock && (
                    <Link href="/dashboard/scan" className="bg-red-600 text-white px-5 py-2 rounded-lg shadow hover:bg-red-700 transition-colors">Hızlı İşlem (Scan)</Link>
                )}
                {session.user.role === "MANAGER" && (
                    <>
                    <button onClick={() => setIsCategoryModalOpen(true)} className="bg-gray-700 text-white px-5 py-2 rounded-lg shadow hover:bg-gray-800 transition-colors">Kategorileri Yönet</button>
                    <Link href="/dashboard/logs" className="bg-purple-600 text-white px-5 py-2 rounded-lg shadow hover:bg-purple-700 transition-colors">Stok Hareketleri</Link>
                    </>
                )}
                <button onClick={handlePrintList} className="bg-teal-600 text-white px-5 py-2 rounded-lg shadow hover:bg-teal-700 transition-colors flex items-center gap-2">
                    <IconPrinter className="w-4 h-4" /> Listeyi Yazdır
                </button>
            </div>
            <div className="relative">
                <input 
                    type="text"
                    placeholder="Ürün, SKU veya kategori ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg w-64"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Stok Listesi</h2>
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="bg-gray-200">
              <tr className="text-left text-sm font-semibold text-gray-600">
                <th className="p-3">Ürün Bilgisi</th>
                <th className="p-3 text-center">Marka</th>
                <th className="p-3 text-center">Lokasyon</th>
                <th className="p-3 text-center">Miktar</th>
                {userPermissions?.canSeeCost && <th className="p-3 text-center">Maliyet (TL)</th>}
                <th className="p-3 text-center">Satış (TL)</th>
                <th className="p-3 text-center">KDV</th>
                <th className="p-3 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {processedData.length > 0 ? processedData.map(group => (
                <CategoryGroupRenderer 
                    key={group.category.id} 
                    group={group} 
                    level={0} 
                    userPermissions={userPermissions}
                    collapsedCategories={collapsedCategories}
                    onToggleCollapse={toggleCategoryCollapse}
                    openMovementModal={openMovementModal}
                    openHistoryModal={openHistoryModal}
                    openEditModal={openEditModal}
                    openCodeModal={openCodeModal}
                    handleDeleteStock={handleDeleteStock}
                />
              )) : (
                <tr>
                  <td colSpan={userPermissions?.canSeeCost ? 8 : 7} className="text-center p-4 text-gray-500">Arama kriterlerinize uygun ürün bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}