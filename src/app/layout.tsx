import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { unstable_noStore as noStore } from "next/cache";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Laura's Pots",
  description: "Handmade pottery by Laura. Find your perfect piece.",
};

async function getHeroImage(): Promise<string | null> {
  noStore();
  try {
    const { prisma } = await import("@/lib/prisma");
    const hero = await prisma.heroImage.findFirst({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
    return hero?.imageUrl ?? null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const heroImageUrl = await getHeroImage();

  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col items-center"
        style={heroImageUrl
          ? { background: '#e8e0d8' }
          : { background: 'radial-gradient(ellipse at center, #f5f5f5 0%, #d4d4d4 60%, #a3a3a3 100%)' }
        }
      >
        {heroImageUrl && (
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${heroImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(32px) brightness(0.85) saturate(0.7)',
              transform: 'scale(1.1)',
            }}
            aria-hidden="true"
          />
        )}

        <div className="relative w-full max-w-[430px] min-h-screen bg-white shadow-2xl flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}