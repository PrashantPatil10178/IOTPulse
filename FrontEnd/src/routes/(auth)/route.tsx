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
    // Check if user is already authenticated
    const savedUser = localStorage.getItem("iot-dashboard-user");
    if (savedUser) {
      throw redirect({ to: "/" });
    }
  },
});
