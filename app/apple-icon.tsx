import { ImageResponse } from "next/og";
import { WalltIconMark } from "@/lib/pwaIcon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<WalltIconMark size={180} padding={30} />, size);
}
