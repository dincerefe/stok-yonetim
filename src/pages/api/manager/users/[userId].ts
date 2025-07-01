// Dosya Yolu: src/pages/api/manager/users/[userId].ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    const { userId } = req.query;

    if (!session || session.user.role !== 'MANAGER' || !session.user.companyId) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok." });
    }
    if (typeof userId !== 'string') {
        return res.status(400).json({ message: "Geçersiz kullanıcı ID." });
    }

    if (req.method === 'PATCH') {
        try {
            // Güvenlik: Yöneticinin, güncellenecek kullanıcının kendi şirketinde olduğundan emin ol
            const targetUser = await prisma.user.findFirst({
                where: { id: userId, companyId: session.user.companyId, role: { not: 'ADMIN' } }
            });

            if (!targetUser) {
                 return res.status(404).json({ message: "Kullanıcı bulunamadı veya bu kullanıcıyı düzenleme yetkiniz yok." });
            }

            // Gelen veriden rolü ve yetkileri ayır
            const { role, ...permissions } = req.body;

            await prisma.$transaction(async (tx) => {
                // Eğer bir rol değişikliği geldiyse, kullanıcının rolünü güncelle
                if (role && ['USER', 'MANAGER'].includes(role)) {
                    await tx.user.update({ 
                        where: { id: userId }, 
                        data: { role: role as Role } 
                    });
                }
                
                // DÜZELTME: Gelen tüm yetkileri dinamik olarak güncelle.
                // Bu yapı, gelecekte eklenecek yeni yetkileri de otomatik olarak destekler.
                if (Object.keys(permissions).length > 0) {
                    await tx.userPermission.update({
                        where: { userId: userId },
                        data: permissions
                    });
                }
            });

            return res.status(200).json({ message: 'Kullanıcı başarıyla güncellendi.' });
        } catch (error) {
            console.error("Kullanıcı güncelleme hatası:", error);
            return res.status(500).json({ message: "Güncelleme sırasında bir hata oluştu." });
        }
    }
    
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ message: 'Method Not Allowed' });
}