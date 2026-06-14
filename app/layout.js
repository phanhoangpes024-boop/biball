import "./globals.css";
import { Be_Vietnam_Pro } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import Providers from "@/components/Providers";

const sans = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata = {
  title: "Note & Lời nhắc",
  description: "Note, lời nhắc và lịch sử làm việc",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Note",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#16161a" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={sans.variable}>
      <body>
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
