// Dosya Yolu: src/pages/api/stock/[stockId]/movements.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.companyId) {
    return res.status(401).json({ message: "Yetkisiz erişim." });
  }

  const { stockId } = req.query;

  if (typeof stockId !== 'string') {
    return res.status(400).json({ message: "Geçersiz Stok ID." });
  }

  if (req.method === 'GET') {
    try {
      // Güvenlik: Kullanıcının sadece kendi şirketindeki stok hareketlerini görebildiğinden emin ol
      const movements = await prisma.stockMovement.findMany({
        where: {
          stockItemId: stockId,
          stockItem: {
            companyId: session.user.companyId,
          },
        },
        include: {
          user: { select: { name: true } }, // Hareketi yapan kullanıcının adını da al
        },
        orderBy: {
          createdAt: 'desc', // En yeni hareketler üstte olacak şekilde sırala
        },
        take: 100, // Performans için son 100 hareketi getir
      });
      return res.status(200).json(movements);
    } catch (error) {
      return res.status(500).json({ message: "Stok hareketleri getirilirken bir hata oluştu." });
    }
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}
