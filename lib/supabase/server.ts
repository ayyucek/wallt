import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component / Route Handler'larda kullanılacak Supabase client.
// Client Component'lerde bunun yerine lib/supabase/client.ts kullanın.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Bir Server Component içinden çağrılırsa cookie set edilemez.
            // Oturum yenilemesi proxy.ts tarafından yapıldığı için yok sayılabilir.
          }
        },
      },
    }
  );
}
