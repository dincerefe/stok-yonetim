// src/pages/login.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Geçersiz e-posta.'),
  password: z.string().min(1, 'Şifre boş olamaz.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    const toastId = toast.loading('Giriş yapılıyor...');

    const result = await signIn('credentials', {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    setLoading(false);
    
    if (result?.ok) {
      toast.success('Giriş başarılı!', { id: toastId });
      router.push((router.query.callbackUrl as string) || '/dashboard');
    } else {
      toast.error(result?.error || 'Giriş yapılamadı.', { id: toastId });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Giriş Yap</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
         <p className="text-sm text-center">
            Hesabın yok mu? <Link href="/register" className="text-blue-600 hover:underline">Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
}