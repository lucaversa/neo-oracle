// src/app/layout.tsx
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
import { ThemeProvider } from '@/context/ThemeContext';
import SessionTimeoutWrapper from '@/components/auth/SessionTimeoutWrapper';

export const metadata = {
  title: 'Oráculo',
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
          <AdminProvider>
            <ThemeProvider>
              <SessionTimeoutWrapper>
                {children}
              </SessionTimeoutWrapper>
            </ThemeProvider>
          </AdminProvider>
        </AuthProvider>
      </body>
    </html>
  );
}