import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Webhook Dispatcher & Reliability Hub',
  description:
    'Production-grade developer infrastructure for cryptographic HMAC signing, automated exponential backoff retries, idempotency enforcement, and Dead-Letter Queue isolation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-zinc-800 selection:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
