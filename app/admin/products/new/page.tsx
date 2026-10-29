import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import NewProductForm from "./NewProductForm";

export const metadata = { title: "New product | Hawk Sportz" };

export default async function NewProductPage() {
  await requireAdmin();
  return <main className="mobile-content mx-auto w-full max-w-2xl px-5 py-12">
    <Link href="/admin" className="text-sm underline">Back to products</Link>
    <h1 className="mt-6 text-3xl font-semibold">New product</h1>
    <p className="mt-3 text-gray-600">Creating a product makes it available on your storefront immediately.</p>
    <NewProductForm />
  </main>;
}
