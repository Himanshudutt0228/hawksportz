import AuthForm from "@/components/auth/AuthForm";

export const metadata = { title: "Create account | Hawk Sportz" };

export default function SignUpPage() {
  return <main className="mobile-content px-5 py-12"><AuthForm mode="sign-up" /></main>;
}
