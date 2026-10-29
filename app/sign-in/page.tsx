import AuthForm from "@/components/auth/AuthForm";
import DismissibleNotice from "@/components/DismissibleNotice";

export const metadata = { title: "Sign in | Hawk Sportz" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  return <main className="mobile-content px-5 py-12">
    {params.link === "invalid" && <DismissibleNotice tone="error" className="mx-auto mb-6 max-w-md">This link is invalid or expired. Request a new link and open it in the same browser.</DismissibleNotice>}
    {params.password === "updated" && <DismissibleNotice tone="success" className="mx-auto mb-6 max-w-md">Password updated. Sign in with your new password.</DismissibleNotice>}
    <AuthForm mode="sign-in" />
  </main>;
}
