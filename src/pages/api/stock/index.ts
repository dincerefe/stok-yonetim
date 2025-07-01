// Dosya Yolu: src/pages/api/stock/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from 'crypto';

// Zod şeması, tüm yeni alanları içerecek şekilde güncellendi
const createStockSchema = z.object({
  name: z.string().min(1, "Ürün adı zorunludur."),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  location: z.string().optional(),
  quantity: z.coerce.number().int().min(0),
  minStockLevel: z.coerce.number().int().min(0).optional(),
  maxStockLevel: z.coerce.number().int().min(0).optional(),
  unit: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).optional(),
  categoryId: z.string().cuid().nullable().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.companyId) {
    return res.status(401).json({ message: "Yetkisiz erişim." });
  }
  const { user } = session;

  if (req.method === "POST") {
    if (!user.permissions?.canAddStock) {
      return res.status(403).json({ message: "Stok ekleme yetkiniz yok." });
    }
    try {
      const data = createStockSchema.parse(req.body);

      // --- YENİ: Otomatik Kod Üretme Mantığı ---
      // Eğer SKU girilmemişse, rastgele bir SKU oluştur
      const finalSku = data.sku || `SKU-${randomBytes(4).toString('hex').toUpperCase()}`;
      // Eğer barkod girilmemişse, 13 haneli rastgele bir sayısal barkod oluştur
      const finalBarcode = data.barcode || Math.random().toString().slice(2, 15);
      // -----------------------------------------

      const newStockItem = await prisma.$transaction(async (tx) => {
        const item = await tx.stockItem.create({
          data: {
            name: data.name,
            description: data.description,
            sku: finalSku, // Oluşturulan veya girilen SKU'yu kullan
            barcode: finalBarcode, // Oluşturulan veya girilen barkodu kullan
            brand: data.brand,
            location: data.location,
            quantity: data.quantity,
            minStockLevel: data.minStockLevel,
            maxStockLevel: data.maxStockLevel,
            unit: data.unit,
            costPrice: data.costPrice,
            sellingPrice: data.sellingPrice,
            vatRate: data.vatRate,
            companyId: user.companyId!,
            categoryId: data.categoryId,
          },
        });

        await tx.stockMovement.create({
          data: {
            type: 'IN',
            quantity: item.quantity,
            notes: 'İlk stok girişi',
            stockItemId: item.id,
            userId: user.id,
            costPrice: item.costPrice,
          },
        });

        return item;
      });
      return res.status(201).json(newStockItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Stok oluşturma hatası:", error);
      return res.status(500).json({ message: "Sunucu hatası." });
    }
  }
  // Stokları listeleme (GET)
  if (req.method === 'GET') {
    try {
        const stockItems = await prisma.stockItem.findMany({
          where: { companyId: user.companyId },
          // DÜZELTME: İlişkili kategori verisini de sorguya dahil et
          include: {
            category: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        const sanitizedItems = stockItems.map(item => {
          const { costPrice, ...rest } = item;
          const profit = (item.sellingPrice - item.costPrice) * item.quantity;
          const visibleItem: any = { ...rest };
          if (user.permissions?.canSeeCost) {
            visibleItem.costPrice = costPrice;
          }
          if (user.permissions?.canSeeProfit) {
            visibleItem.profit = profit;
          }
          return visibleItem;
        });

        return res.status(200).json(sanitizedItems);
    } catch (error) {
        console.error("Stok listeleme hatası:", error);
        return res.status(500).json({ message: "Stoklar listelenirken bir hata oluştu." });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}