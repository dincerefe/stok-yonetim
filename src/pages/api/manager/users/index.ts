// src/pages/api/manager/users/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user.role !== 'MANAGER' || !session.user.companyId) {
        return res.status(403).json({ message: "Yetkiniz yok veya bir şirkete atanmamışsınız." });
    }

    if (req.method === 'GET') {
        const usersInCompany = await prisma.user.findMany({
            where: {
                companyId: session.user.companyId,
                role: {
                    not: 'ADMIN' // Adminleri listeleme
                },
            },
            include: {
                permission: true // Kullanıcıların yetkilerini de getir
            }
        });
        return res.status(200).json(usersInCompany);
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}