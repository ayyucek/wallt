import { ImageResponse } from "next/og";
import { WalltIconMark } from "@/lib/pwaIcon";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<WalltIconMark size={512} padding={76} />, {
    width: 512,
    height: 512,
  });
}
