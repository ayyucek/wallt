import { ImageResponse } from "next/og";
import { WalltIconMark } from "@/lib/pwaIcon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<WalltIconMark size={32} padding={4} />, size);
}
