import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Admin yetkisi gerekir." });
    }

    // Mevcut kullanıcıları listeleme
    if (req.method === 'GET') {
        const users = await prisma.user.findMany({ 
            where: { role: { not: 'ADMIN' } }, 
            include: { company: true } 
        });
        return res.status(200).json(users);
    }

    // Kullanıcıyı güncelleme (Şirket ve Rol Atama)
    if (req.method === 'PATCH') {
        const { userId, companyId, role } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "Kullanıcı ID zorunludur." });
        }
        
        const dataToUpdate: { companyId?: string | null; role?: Role } = {};

        // companyId tanımsız değilse, güncelleme verisine ekle
        // Frontend null değerini doğrudan gönderecek.
        if (companyId !== undefined) {
            dataToUpdate.companyId = companyId;
        }

        // Eğer bir rol gönderildiyse ve geçerliyse, güncelleme verisine ekle
        if (role) {
            if (role === 'ADMIN' || !['USER', 'MANAGER'].includes(role)) {
                return res.status(400).json({ message: "Geçersiz rol ataması." });
            }
            dataToUpdate.role = role;
        }

        // Güncellenecek herhangi bir veri yoksa hata döndür
        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: "Güncellenecek veri bulunamadı." });
        }

        try {
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: dataToUpdate
            });
            return res.status(200).json(updatedUser);
        } catch (error) {
            console.error("Kullanıcı güncelleme hatası:", error);
            return res.status(500).json({ message: "Kullanıcı güncellenirken bir hata oluştu." });
        }
    }
    
    res.setHeader("Allow", ["GET", "PATCH"]);
    return res.status(405).json({ message: "Method Not Allowed" });
}
