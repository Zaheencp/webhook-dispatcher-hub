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
    <html lang="en" className="h-full bg-[#09090b]">
      <body className="min-h-full bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-indigo-900/50 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
