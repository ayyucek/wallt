import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16'da middleware.ts → proxy.ts olarak yeniden adlandırıldı, API aynı
// (bkz. node_modules/next/dist/docs/.../proxy.md). Bu dosya her istekte oturumu
// tazeler ve giriş yapılmadan "/" korunan alana erişimi engeller.

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.includes(request.nextUrl.pathname);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // sw.js ve manifest.webmanifest hariç tutulmazsa, giriş yapmamış ziyaretçiler
  // için bu isteklere /login yönlendirmesi döner — servis çalışanı script'lerinin
  // ve manifest linklerinin yönlendirilmiş yanıt almasına izin verilmez, bu da
  // "script resource is behind a redirect" hatasıyla PWA kurulabilirliğini
  // tamamen bozar (11 Eylül 2026'da prod'da tespit edildi).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
