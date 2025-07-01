// src/pages/api/admin/companies.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Bu işlem için admin yetkisi gerekir." });
    }

    if (req.method === 'GET') {
        const companies = await prisma.company.findMany({ include: { _count: { select: { users: true } } } });
        return res.status(200).json(companies);
    }
    if (req.method === 'POST') {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Şirket adı zorunludur." });
        const newCompany = await prisma.company.create({ data: { name } });
        return res.status(201).json(newCompany);
    }
    // ... DELETE için [companyId].ts kullanacağız ...
}
