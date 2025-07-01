// Dosya Yolu: src/pages/api/categories/[categoryId].ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.companyId || session.user.role !== 'MANAGER') {
    return res.status(403).json({ message: "Bu işlem için yetkiniz yok." });
  }

  const { categoryId } = req.query;

  if (typeof categoryId !== 'string') {
    return res.status(400).json({ message: "Geçersiz Kategori ID." });
  }

  if (req.method === 'DELETE') {
    try {
      // GÜVENLİK KONTROLÜ: Silmeden önce bu kategoriye bağlı ürün olup olmadığını kontrol et.
      const associatedStockItems = await prisma.stockItem.count({
        where: { 
          categoryId: categoryId,
          companyId: session.user.companyId // Sadece kendi şirketindeki ürünleri kontrol et
        }
      });

      if (associatedStockItems > 0) {
        return res.status(400).json({ message: `Bu kategoriye bağlı ${associatedStockItems} ürün bulunduğu için silinemez.` });
      }

      // Prisma şemasındaki "onDelete: Cascade" sayesinde, bu kategori silindiğinde
      // tüm alt kategorileri de otomatik olarak silinecektir.
      await prisma.category.delete({
        where: { 
          id: categoryId,
          // Ek güvenlik: Yöneticinin sadece kendi şirketindeki kategoriyi silebildiğinden emin ol
          companyId: session.user.companyId 
        }
      });

      return res.status(200).json({ message: "Kategori başarıyla silindi." });

    } catch (error) {
      // Eğer kategori bulunamazsa Prisma bir hata fırlatır, bunu yakala.
      console.error("Kategori silme hatası:", error);
      return res.status(500).json({ message: "Kategori silinirken bir hata oluştu." });
    }
  }

  res.setHeader("Allow", ["DELETE"]);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}
