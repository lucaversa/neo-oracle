// src/app/layout.tsx
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import SessionTimeoutWrapper from '@/components/auth/SessionTimeoutWrapper';

export const metadata = {
  title: 'Oráculo Empresarial',
  description: 'Chat inteligente para sua empresa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <SessionTimeoutWrapper>
            {children}
          </SessionTimeoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}