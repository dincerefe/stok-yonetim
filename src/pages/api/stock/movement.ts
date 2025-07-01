// Dosya Yolu: src/pages/api/stock/movement.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { StockMovementType } from "@prisma/client";

const movementSchema = z.object({
  stockItemId: z.string().cuid("Geçersiz Stok ID."),
  quantity: z.coerce.number().int().positive("Miktar pozitif bir sayı olmalıdır."),
  type: z.enum([StockMovementType.IN, StockMovementType.OUT]),
  notes: z.string().optional(),
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
    const { stockItemId, quantity, type, notes, costPrice, sellingPrice } = movementSchema.parse(req.body);

    // Yetki kontrolü...
    if (type === 'IN' && !session.user.permissions?.canAddStock) {
      return res.status(403).json({ message: "Stok girişi yapma yetkiniz yok." });
    }
    if (type === 'OUT' && !session.user.permissions?.canRemoveStock) {
      return res.status(403).json({ message: "Stok çıkışı yapma yetkiniz yok." });
    }

    await prisma.$transaction(async (tx) => {
      const stockItem = await tx.stockItem.findFirstOrThrow({
        where: { id: stockItemId, companyId: session.user.companyId! },
      });

      if (type === 'OUT' && stockItem.quantity < quantity) {
        throw new Error(`Yetersiz stok. Mevcut miktar: ${stockItem.quantity}`);
      }

      let newAverageCost = stockItem.costPrice;
      // Eğer yeni bir maliyetle giriş yapılıyorsa, ağırlıklı ortalama maliyeti hesapla
      if (type === 'IN' && costPrice !== undefined && costPrice >= 0) {
          const currentTotalCost = stockItem.costPrice * stockItem.quantity;
          const newEntryCost = costPrice * quantity;
          const newTotalQuantity = stockItem.quantity + quantity;
          // newTotalQuantity sıfır olamaz çünkü quantity > 0
          newAverageCost = (currentTotalCost + newEntryCost) / newTotalQuantity;
      }

      const newQuantity = type === 'IN' ? stockItem.quantity + quantity : stockItem.quantity - quantity;
      await tx.stockItem.update({
        where: { id: stockItemId },
        data: { 
            quantity: newQuantity,
            costPrice: newAverageCost // Güncellenmiş ortalama maliyet
        },
      });

      await tx.stockMovement.create({
        data: {
          type,
          quantity: type === 'IN' ? quantity : -quantity,
          notes,
          stockItemId,
          userId: session.user.id,
          costPrice: type === 'IN' ? costPrice : undefined,
          sellingPrice: type === 'OUT' ? sellingPrice : undefined,
        },
      });
    });

    return res.status(200).json({ message: "İşlem başarılı." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    // Transaction içinden gelen özel hataları yakala ve kullanıcıya göster
    if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Sunucuda bir hata oluştu." });
  }
}