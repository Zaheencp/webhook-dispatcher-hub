import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Webhook Dispatcher — Developer Workbench',
  description:
    'Developer infrastructure workbench for cryptographic HMAC signing, automated exponential backoff retries, idempotency enforcement, and Dead-Letter Queue isolation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#f8fafc]">
      <body className="min-h-full bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}
