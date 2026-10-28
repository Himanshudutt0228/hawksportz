import AuthForm from "@/components/auth/AuthForm";

export const metadata = { title: "Reset password | Hawk Sportz" };

export default function ForgotPasswordPage() {
  return <main className="px-5 py-12"><AuthForm mode="forgot-password" /></main>;
}
