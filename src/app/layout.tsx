// src/app/layout.tsx
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
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
      <body className="vsc-initialized">
        <AuthProvider>
          <ThemeProvider>
            <SessionTimeoutWrapper>
              {children}
            </SessionTimeoutWrapper>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}