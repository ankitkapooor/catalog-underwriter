import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Catalog Underwriter',
    template: '%s · Catalog Underwriter',
  },
  description:
    'A public-data workbench for reconstructing, stress-testing, and valuing music catalog economics.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
