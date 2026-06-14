import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

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
    <html lang="vi">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
