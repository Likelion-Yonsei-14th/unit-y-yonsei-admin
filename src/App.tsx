import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes';
import { AuthInitializer } from '@/features/auth/auth-initializer';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>
          <RouterProvider router={router} />
        </AuthInitializer>
        <Toaster position="top-right" richColors />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
