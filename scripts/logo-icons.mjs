// Sinh bộ icon app từ public/logo.png (favicon, apple-touch, PWA 192/512, maskable).
// Chạy lại khi đổi logo:  node scripts/logo-icons.mjs
import sharp from "sharp";
import path from "node:path";

const root = process.cwd();
const SRC = path.join(root, "public", "logo.png");
const pub = (f) => path.join(root, "public", f);
const app = (f) => path.join(root, "app", f);

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const fit = "contain";

// PWA icons (giữ nền trong suốt)
await sharp(SRC).resize(192, 192, { fit, background: transparent }).png().toFile(pub("icon-192.png"));
await sharp(SRC).resize(512, 512, { fit, background: transparent }).png().toFile(pub("icon-512.png"));

// Maskable: logo 80% trên nền trắng để không bị cắt bởi mặt nạ tròn
await sharp(SRC)
  .resize(410, 410, { fit, background: transparent })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#ffffff" })
  .png()
  .toFile(pub("icon-maskable.png"));

// Favicon (Next dùng app/icon.png)
await sharp(SRC).resize(256, 256, { fit, background: transparent }).png().toFile(app("icon.png"));

// Apple touch icon: iOS biến nền trong suốt thành đen -> nền trắng
await sharp(SRC)
  .resize(180, 180, { fit, background: "#ffffff" })
  .flatten({ background: "#ffffff" })
  .png()
  .toFile(app("apple-icon.png"));

console.log("Đã tạo icon từ logo.png");
