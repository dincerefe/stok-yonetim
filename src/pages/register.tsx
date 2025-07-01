// src/pages/register.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  name: z.string().min(3, 'İsim en az 3 karakter olmalıdır.'),
  email: z.string().email('Geçersiz e-posta.'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    const toastId = toast.loading('Kayıt yapılıyor...');
    
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    setLoading(false);

    if (response.ok) {
      toast.success('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz.', { id: toastId });
      router.push('/login');
    } else {
      toast.error(result.message || 'Bir hata oluştu.', { id: toastId });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Hesap Oluştur</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">İsim</label>
            <input {...register('name')} className="w-full px-3 py-2 border rounded-md" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block mb-1 font-medium">E-posta</label>
            <input type="email" {...register('email')} className="w-full px-3 py-2 border rounded-md" />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Şifre</label>
            <input type="password" {...register('password')} className="w-full px-3 py-2 border rounded-md" />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="w-full px-4 py-2 text-white bg-blue-600 rounded-md disabled:bg-blue-300">
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>
        <p className="text-sm text-center">
            Zaten bir hesabın var mı? <Link href="/login" className="text-blue-600 hover:underline">Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}