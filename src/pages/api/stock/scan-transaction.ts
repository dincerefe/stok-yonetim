// Dosya Yolu: src/pages/api/stock/scan-transaction.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { StockMovementType } from "@prisma/client";

// Gelen isteğin verisini doğrulamak için şema
const transactionSchema = z.object({
  code: z.string().min(1, "Kod boş olamaz."),
  quantity: z.coerce.number().int().positive("Miktar pozitif bir sayı olmalıdır."),
  type: z.enum([StockMovementType.IN, StockMovementType.OUT]),
  costPrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.companyId) {
    return res.status(401).json({ message: "Yetkisiz veya geçersiz istek." });
  }

  try {
    const { code, quantity, type, costPrice, sellingPrice } = transactionSchema.parse(req.body);

    // Yetki kontrolü
    if (type === 'IN' && !session.user.permissions?.canAddStock) {
      return res.status(403).json({ message: "Stok girişi yapma yetkiniz yok." });
    }
    if (type === 'OUT' && !session.user.permissions?.canRemoveStock) {
      return res.status(403).json({ message: "Stok çıkışı yapma yetkiniz yok." });
    }

    const updatedStockItem = await prisma.$transaction(async (tx) => {
      // GÜNCELLEME: Ürünü hem SKU'ya hem de barkoda göre ara
      const stockItem = await tx.stockItem.findFirst({
        where: {
          companyId: session.user.companyId!,
          OR: [
            { sku: code },
            { barcode: code },
          ],
        },
      });

      if (!stockItem) {
        throw new Error(`'${code}' koduna sahip ürün bulunamadı.`);
      }

      if (type === 'OUT' && stockItem.quantity < quantity) {
        throw new Error(`Yetersiz stok. Mevcut miktar: ${stockItem.quantity}`);
      }

      const newQuantity = type === 'IN' ? stockItem.quantity + quantity : stockItem.quantity - quantity;

      let newAverageCost = stockItem.costPrice;
      if (type === 'IN' && costPrice !== undefined && costPrice >= 0) {
          const currentTotalCost = stockItem.costPrice * stockItem.quantity;
          const newEntryCost = costPrice * quantity;
          const newTotalQuantity = stockItem.quantity + quantity;
          newAverageCost = (currentTotalCost + newEntryCost) / newTotalQuantity;
      }

      const updatedItem = await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { 
            quantity: newQuantity,
            costPrice: newAverageCost
        },
      });

      await tx.stockMovement.create({
        data: {
          type,
          quantity: type === 'IN' ? quantity : -quantity,
          notes: 'Hızlı işlem ile yapıldı.',
          stockItemId: stockItem.id,
          userId: session.user.id,
          costPrice: type === 'IN' ? costPrice : undefined,
          sellingPrice: type === 'OUT' ? (sellingPrice ?? stockItem.sellingPrice) : undefined,
        },
      });

      return updatedItem;
    });

    const actionText = type === 'IN' ? 'stoka eklendi' : 'stoktan düşüldü';
    return res.status(200).json({ message: `${quantity} adet '${updatedStockItem.name}' ${actionText}. Kalan: ${updatedStockItem.quantity}` });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Sunucuda bir hata oluştu." });
  }
}
