import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth/provider";
import { LocalSessionProvider } from "@/lib/local-session";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: APP_TAGLINE },
      { name: "theme-color", content: "#111111" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 8_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning data-theme="ink" data-accent="blue" data-font="vazirmatn" data-scheme="dark">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
        <AuthProvider>
          <LocalSessionProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                <Outlet />
                <Toaster position="top-center" dir="rtl" richColors />
              </ThemeProvider>
            </QueryClientProvider>
          </LocalSessionProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}