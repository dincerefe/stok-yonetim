// Dosya Yolu: src/pages/api/categories/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const categorySchema = z.object({
    name: z.string().min(1, "Kategori adı zorunludur."),
    parentId: z.string().cuid().optional().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.companyId) {
        return res.status(401).json({ message: "Yetkisiz erişim." });
    }
    const { companyId } = session.user;

    // Şirkete ait tüm kategorileri listele
    if (req.method === 'GET') {
        try {
            const categories = await prisma.category.findMany({
                where: { companyId },
                orderBy: { name: 'asc' }
            });
            return res.status(200).json(categories);
        } catch (error) {
            return res.status(500).json({ message: "Kategoriler getirilirken bir hata oluştu." });
        }
    }

    // Yeni bir kategori (veya alt kategori) oluştur
    if (req.method === 'POST') {
        // Sadece manager'lar kategori ekleyebilsin (isteğe bağlı kural)
        if (session.user.role !== 'MANAGER') {
            return res.status(403).json({ message: "Kategori ekleme yetkiniz yok." });
        }
        try {
            const { name, parentId } = categorySchema.parse(req.body);
            const newCategory = await prisma.category.create({
                data: {
                    name,
                    companyId,
                    parentId: parentId || null,
                }
            });
            return res.status(201).json(newCategory);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            return res.status(500).json({ message: "Kategori oluşturulurken bir hata oluştu." });
        }
    }
    
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}
