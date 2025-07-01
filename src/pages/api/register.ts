// src/pages/api/register.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const registerUserSchema = z.object({
  name: z.string().min(3, { message: 'İsim en az 3 karakter olmalıdır.' }),
  email: z.string().email({ message: 'Geçersiz e-posta adresi.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { name, email, password } = registerUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Bu e-posta adresi zaten kullanılıyor.' });
    }

    const hashedPassword = await hash(password, 12);

    // Kullanıcıyı ve varsayılan yetkilerini bir transaction içinde oluştur
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      await tx.userPermission.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    return res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.', userId: user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
}