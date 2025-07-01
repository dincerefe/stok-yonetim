// Dosya Yolu: src/pages/api/stock/movements.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.companyId) {
    return res.status(401).json({ message: "Yetkisiz erişim." });
  }

  if (req.method === 'GET') {
    try {
      const movements = await prisma.stockMovement.findMany({
        where: {
          stockItem: {
            companyId: session.user.companyId,
          },
        },
        include: {
          stockItem: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100, // Son 100 hareketi getir (sayfalama eklenebilir)
      });
      return res.status(200).json(movements);
    } catch (error) {
      return res.status(500).json({ message: "Stok hareketleri getirilirken bir hata oluştu." });
    }
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}