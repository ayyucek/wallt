import { ImageResponse } from "next/og";
import { WalltIconMark } from "@/lib/pwaIcon";

export const dynamic = "force-static";

// Maskable ikon: OS dairesel/yuvarlatılmış kare gibi maskeler uygulayabilir,
// bu yüzden "W" işareti güvenli bölge (merkeze yakın ~%60) içinde kalacak
// şekilde normal ikonlardan daha fazla iç boşluk bırakılır.
export async function GET() {
  return new ImageResponse(<WalltIconMark size={512} padding={102} />, {
    width: 512,
    height: 512,
  });
}
