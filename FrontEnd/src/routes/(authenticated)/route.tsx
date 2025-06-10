import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";

function formatPageName(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  // Extract the last segment of the path and capitalize it
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "Dashboard";
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
}

function AuthenticatedLayout() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const currentPageName = formatPageName(currentPath);

  return (
    <Layout currentPageName={currentPageName}>
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
