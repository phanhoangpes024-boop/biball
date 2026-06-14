export default function manifest() {
  return {
    name: "Note & Lời nhắc",
    short_name: "Note",
    description: "Note, lời nhắc và lịch sử làm việc",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1c1c20",
    lang: "vi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
