import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16'da middleware.ts → proxy.ts olarak yeniden adlandırıldı, API aynı
// (bkz. node_modules/next/dist/docs/.../proxy.md). Bu dosya her istekte oturumu
// tazeler ve giriş yapılmadan "/" korunan alana erişimi engeller.

// "/reset-password" da public olmalı: kullanıcı şifre sıfırlama linkine
// tıkladığında ilk istek proxy'e session cookie'si OLMADAN gelir (kurtarma
// kodu, tarayıcı client'ının henüz işlemediği bir URL parametresidir) — public
// olmasaydı bu istek /login'e yönlendirilir ve kod hiç değişime uğramadan
// kaybolurdu (13 Eylül 2026, Şifremi Unuttum akışı eklentisi).
const PUBLIC_PATHS = ["/login", "/reset-password"];

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

  // getUser() token'ı yenilediyse yeni cookie'ler `response` üzerindedir;
  // redirect yanıtına da taşınmazsa oturum yenilemesi kaybolur ve kullanıcı
  // bir sonraki istekte sebepsiz yere çıkış yapmış gibi olur.
  function redirectTo(pathname: string) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (!user && !isPublicPath) return redirectTo("/login");
  if (user && isPublicPath) return redirectTo("/");

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
