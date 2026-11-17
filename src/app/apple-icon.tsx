import { renderIcon } from "@/lib/icon";

// iOS aplica sus propias esquinas redondeadas: el icono debe ser cuadrado y opaco.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderIcon(180);
}
