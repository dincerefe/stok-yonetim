// Dosya Yolu: src/pages/api/stock/[stockId].ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateStockSchema = z.object({
    name: z.string().min(1, "Ürün adı zorunludur.").optional(),
    description: z.string().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    brand: z.string().optional(),
    location: z.string().optional(),
    minStockLevel: z.coerce.number().int().min(0).optional(),
    maxStockLevel: z.coerce.number().int().min(0).optional(),
    unit: z.string().optional(),
    sellingPrice: z.coerce.number().min(0).optional(),
    vatRate: z.coerce.number().min(0).optional(),
    categoryId: z.string().cuid().nullable().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    const { stockId } = req.query;

    if (!session || !session.user?.companyId) {
        return res.status(401).json({ message: "Yetkisiz veya geçersiz istek." });
    }
    if (typeof stockId !== 'string') {
        return res.status(400).json({ message: "Geçersiz Stok ID." });
    }

    const stockItem = await prisma.stockItem.findFirst({
        where: { id: stockId, companyId: session.user.companyId }
    });
    if (!stockItem) {
        return res.status(404).json({ message: "Stok bulunamadı veya bu stoğa erişim yetkiniz yok." });
    }

    if (req.method === 'PATCH') {
        if (!session.user.permissions?.canAddStock) {
            return res.status(403).json({ message: "Stok düzenleme yetkiniz yok." });
        }
        try {
            const dataToUpdate = updateStockSchema.parse(req.body);
            
            await prisma.stockItem.update({
                where: { id: stockId },
                data: dataToUpdate,
            });

            return res.status(200).json({ message: "Ürün başarıyla güncellendi."});

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Güncelleme hatası:", error);
            return res.status(500).json({ message: "Güncelleme sırasında bir hata oluştu." });
        }
    }
    
    // STOK SİLME (DELETE)
    if (req.method === 'DELETE') {
        if (!session.user.permissions?.canRemoveStock) {
            return res.status(403).json({ message: "Stok silme yetkiniz yok." });
        }
        try {
            await prisma.stockItem.delete({ where: { id: stockId } });
            return res.status(204).end(); // No Content: Başarılı ama geri döndürülecek içerik yok.
        } catch (error) {
            console.error("Silme hatası:", error);
            return res.status(500).json({ message: "Silme sırasında bir hata oluştu." });
        }
    }

    res.setHeader("Allow", ["PATCH", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
