// Dosya Yolu: src/pages/_app.tsx
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      {/*
        Tüm uygulamayı saran bu div'e global stilleri uyguluyoruz.
        Bu, en kararlı ve hatasız yöntemdir.
      */}
      <div className="bg-gray-50 text-gray-900 min-h-screen">
        <Component {...pageProps} />
      </div>
      <Toaster position="bottom-right" />
    </SessionProvider>
  );
}
