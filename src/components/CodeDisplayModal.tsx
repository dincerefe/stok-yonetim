// Dosya Yolu: src/components/CodeDisplayModal.tsx
import { useEffect, useRef } from 'react';
import Modal from './Modal';
import toast from 'react-hot-toast';

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

interface CodeDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItem: { sku?: string | null; barcode?: string | null; name: string } | null;
}

export default function CodeDisplayModal({ isOpen, onClose, stockItem }: CodeDisplayModalProps) {
  const qrCodeRef = useRef<HTMLCanvasElement>(null);
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && stockItem) {
      // Gerekli kütüphaneleri yükle
      Promise.all([
        loadScript("https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"),
        loadScript("https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js")
      ]).then(() => {
        // QR Kodu Oluştur
        if (stockItem.sku && qrCodeRef.current) {
          // @ts-ignore
          window.QRCode.toCanvas(qrCodeRef.current, stockItem.sku, { width: 200 }, (error) => {
            if (error) toast.error("QR Kod oluşturulamadı.");
          });
        }
        // Barkod Oluştur
        if (stockItem.barcode && barcodeRef.current) {
          // @ts-ignore
          window.JsBarcode(barcodeRef.current, stockItem.barcode, {
            format: 'CODE128',
            height: 60,
            displayValue: true,
            fontSize: 16
          });
        }
      }).catch(err => console.error(err));
    }
  }, [isOpen, stockItem]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow?.document.write('<html><head><title>Kodları Yazdır</title>');
        printWindow?.document.write('<style>body { text-align: center; margin-top: 50px; } .code-container { margin-bottom: 40px; } </style>');
        printWindow?.document.write('</head><body>');
        printWindow?.document.write(printContent.innerHTML);
        printWindow?.document.write('</body></html>');
        printWindow?.document.close();
        printWindow?.focus();
        printWindow?.print();
        printWindow?.close();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Kodlar: ${stockItem?.name || ''}`}>
        <div ref={printRef} className="flex flex-col items-center justify-center space-y-8 py-4">
            {stockItem?.sku ? (
                <div className="code-container text-center">
                    <h4 className="font-semibold mb-2">Stok Kodu (SKU)</h4>
                    <canvas ref={qrCodeRef}></canvas>
                    <p className="font-mono mt-2">{stockItem.sku}</p>
                </div>
            ) : <p>Bu ürün için Stok Kodu (SKU) bulunmuyor.</p>}

            {stockItem?.barcode ? (
                <div className="code-container text-center">
                    <h4 className="font-semibold mb-2">Barkod</h4>
                    <canvas ref={barcodeRef}></canvas>
                </div>
            ) : <p>Bu ürün için Barkod bulunmuyor.</p>}
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