import './global.css';

export const metadata = {
  title: 'my-little-pony',
  description: 'Open-source authenticated login system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
