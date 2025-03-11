import { redirect } from 'next/navigation';

export default function Home() {
  // Redireciona para a página de login
  redirect('/login');

  // Este código abaixo não será executado devido ao redirecionamento acima
  return null;
}