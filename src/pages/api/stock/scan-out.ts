// Dosya Yolu: src/pages/api/stock/scan-out.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const scanSchema = z.object({
  code: z.string().min(1, "Kod boş olamaz."),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.companyId) {
    return res.status(401).json({ message: "Yetkisiz veya geçersiz istek." });
  }

  // Stok çıkışı için yetki kontrolü
  if (!session.user.permissions?.canRemoveStock) {
    return res.status(403).json({ message: "Stok çıkışı yapma yetkiniz yok." });
  }

  try {
    const { code } = scanSchema.parse(req.body);

    const updatedStockItem = await prisma.$transaction(async (tx) => {
      // Önce SKU'ya göre, sonra barkoda göre ürünü ara
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

      if (stockItem.quantity < 1) {
        throw new Error(`Stokta yok! '${stockItem.name}' ürününün mevcut miktarı 0.`);
      }

      // Stok miktarını 1 azalt
      const updatedItem = await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { quantity: { decrement: 1 } },
      });

      // Stok çıkış hareketini kaydet
      await tx.stockMovement.create({
        data: {
          type: 'OUT',
          quantity: -1,
          notes: 'Okuyucu ile çıkış yapıldı.',
          stockItemId: stockItem.id,
          userId: session.user.id,
          sellingPrice: stockItem.sellingPrice, // Varsayılan satış fiyatını kaydet
        },
      });

      return updatedItem;
    });

    return res.status(200).json({ message: `'${updatedStockItem.name}' stoktan düşüldü. Kalan: ${updatedStockItem.quantity}` });

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
