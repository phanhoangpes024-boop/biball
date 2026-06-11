export default function manifest() {
  return {
    name: "Ghi chú & Công việc",
    short_name: "Công việc",
    description: "Ứng dụng ghi chú và quản lý công việc",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1c1c20",
    lang: "vi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
