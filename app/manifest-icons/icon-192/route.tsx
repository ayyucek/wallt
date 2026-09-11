import { ImageResponse } from "next/og";
import { WalltIconMark } from "@/lib/pwaIcon";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<WalltIconMark size={192} padding={28} />, {
    width: 192,
    height: 192,
  });
}
