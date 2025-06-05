import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AuthProvider } from "@/context/AuthContext";
import { AppearanceProvider } from "@/context/AppearanceContext";
import { LanguageProvider } from "@/context/LangContext";
import { Toaster } from "sonner";
import { SocketProvider } from "@/context/SocketContext";

function RootComponent() {
  return (
    <AuthProvider>
      <AppearanceProvider>
        <LanguageProvider>
          <SocketProvider>
            <Outlet />
            <Toaster
              position="top-right"
              richColors
              closeButton
              expand={false}
              duration={4000}
            />
          </SocketProvider>
          <TanStackRouterDevtools />
        </LanguageProvider>
      </AppearanceProvider>
    </AuthProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
