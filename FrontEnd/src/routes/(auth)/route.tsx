import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute("/(auth)")({
  component: AuthLayout,
  beforeLoad: async () => {
    const token = localStorage.getItem("iot-dashboard-token");
    if (token) {
      throw redirect({ to: "/" });
    }
  },
});
