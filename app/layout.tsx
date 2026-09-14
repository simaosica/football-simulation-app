// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import React from 'react';
import Providers from './providers';

export const metadata = {
  title: 'Football Simulation App',
  description: 'Simulation Engine for Football Strategies',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}