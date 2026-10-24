import type { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { refreshSession } from "@/lib/supabase/refresh-session";

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  return refreshSession(request, intlMiddleware(request));
}

export const config = {
  matcher: "/((?!api|auth|_next|_vercel|.*\\..*).*)",
};
