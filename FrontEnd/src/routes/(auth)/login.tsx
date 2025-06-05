import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/components/pages/Auth/LoginPage";

export const Route = createFileRoute("/(auth)/login")({
  component: LoginPage,
});
