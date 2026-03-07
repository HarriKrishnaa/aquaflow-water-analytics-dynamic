import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AquaFlow AI - Water Analytics Dashboard',
  description: 'Real-time water consumption and leakage analytics for apartment buildings',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>
          {`
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 100%;
              height: 100%;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
          `}
        </style>
      </head>
      <body>{children}</body>
    </html>
  );
}
