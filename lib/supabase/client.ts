import { createBrowserClient } from "@supabase/ssr";

// Client Component'lerde (tarayıcıda) kullanılacak Supabase client.
// Server Component/proxy için lib/supabase/server.ts kullanın — ikisi
// farklı cookie mekanizmaları kullandığından birbirinin yerine geçmez.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
