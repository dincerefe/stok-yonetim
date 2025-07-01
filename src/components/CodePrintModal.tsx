// Dosya Yolu: src/components/CodePrintModal.tsx
import { useEffect, useState, useRef } from 'react';
import Modal from './Modal';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

interface CodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItem: { sku?: string | null; barcode?: string | null; name: string } | null;
  codeType: 'qr' | 'barcode';
}

export default function CodePrintModal({ isOpen, onClose, stockItem, codeType }: CodePrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  // YENİ: Yazdırma adedini tutmak için state
  const [copyCount, setCopyCount] = useState<number>(1);

  useEffect(() => {
    if (!isOpen || !stockItem) {
      setImageDataUrl('');
      return;
    }

    const generateCode = async () => {
      const codeToGenerate = codeType === 'qr' ? stockItem.sku : stockItem.barcode;
      
      if (!codeToGenerate) {
          setImageDataUrl('');
          return;
      }

      setIsGenerating(true);
      setImageDataUrl('');

      try {
        if (codeType === 'qr') {
          const url = await QRCode.toDataURL(codeToGenerate, { width: 128, margin: 2 });
          setImageDataUrl(url);
        } else if (codeType === 'barcode') {
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, codeToGenerate, {
            format: 'CODE128',
            height: 60,
            displayValue: true,
            fontSize: 16,
            margin: 10
          });
          setImageDataUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        toast.error(`${codeType === 'qr' ? 'QR Kod' : 'Barkod'} oluşturulamadı.`);
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    };

    generateCode();

  }, [isOpen, stockItem, codeType]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
        const printWindow = window.open('', '', 'height=800,width=600');
        if (!printWindow) {
            toast.error("Yazdırma penceresi açılamadı. Lütfen pop-up engelleyicinizi kontrol edin.");
            return;
        }

        let contentToPrint = '';
        // Döngü ile istenen adette etiket oluştur
        for (let i = 0; i < copyCount; i++) {
            contentToPrint += printContent.innerHTML;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>${stockItem?.name || ''} - Etiket Yazdır</title>
                    <style>
                        @media print {
                            @page { size: auto; margin: 10mm; }
                            body { margin: 0; }
                        }
                        body { 
                            font-family: sans-serif;
                        }
                        .print-grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                            gap: 20px;
                        }
                        .print-container { 
                            border: 1px dashed #ccc;
                            padding: 10px;
                            text-align: center;
                            page-break-inside: avoid;
                        }
                        .print-container img {
                            max-width: 100%;
                            height: auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-grid">
                        ${contentToPrint}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        // Yazdırma penceresi yüklendikten sonra yazdırma işlemini başlat
        printWindow.onload = function() {
            printWindow.print();
            printWindow.close();
        };
    }
  };

  const title = codeType === 'qr' ? `QR Kod: ${stockItem?.name}` : `Barkod: ${stockItem?.name}`;
  const codeValue = codeType === 'qr' ? stockItem?.sku : stockItem?.barcode;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div ref={printRef} className="flex flex-col items-center justify-center space-y-4 py-4 min-h-[200px]">
            {isGenerating ? (
                <p>Kod oluşturuluyor...</p>
            ) : codeValue && imageDataUrl ? (
                <div className="print-container text-center">
                    <img src={imageDataUrl} alt={title} />
                    {codeType === 'qr' && <p className="font-mono mt-2 text-sm">{codeValue}</p>}
                </div>
            ) : (
                <p className="text-center text-gray-600">Bu ürün için gösterilecek bir {codeType === 'qr' ? 'Stok Kodu (SKU)' : 'Barkod'} bulunmuyor.</p>
            )}
        </div>
        <div className="flex justify-between items-center pt-4 space-x-3 border-t mt-6">
            {/* YENİ: Adet seçme alanı */}
            <div>
                <label htmlFor="copy-count" className="block text-sm font-medium text-gray-700">Adet</label>
                <input
                    id="copy-count"
                    type="number"
                    value={copyCount}
                    onChange={(e) => setCopyCount(Math.max(1, Number(e.target.value)))}
                    min="1"
                    className="mt-1 w-24 p-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>
            <div className="flex space-x-3">
                <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Kapat</button>
                {codeValue && (
                    <button type="button" onClick={handlePrint} className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Yazdır
                    </button>
                )}
            </div>
        </div>
    </Modal>
  );
}