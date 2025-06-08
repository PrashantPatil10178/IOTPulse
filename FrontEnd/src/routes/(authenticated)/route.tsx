import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";

function AuthenticatedLayout() {
  return (
    <Layout currentPageName="Dashboard">
      <Outlet />
    </Layout>
  );
}

export const Route = createFileRoute("/(authenticated)")({
  component: AuthenticatedLayout,
  beforeLoad: async ({ location }) => {
    const savedUser = localStorage.getItem("iot-dashboard-token");
    if (!savedUser) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
});
