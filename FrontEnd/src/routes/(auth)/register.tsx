import { createFileRoute } from "@tanstack/react-router";
import RegisterPage from "@/pages/Auth/RegisterPage";

export const Route = createFileRoute("/(auth)/register")({
  component: RegisterPage,
});
