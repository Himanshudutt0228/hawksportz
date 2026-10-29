import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="mobile-content mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold">Product not found</h1>
      <p className="mt-4 text-gray-600">This product may no longer be available.</p>
      <Link href="/product" className="mt-6 inline-block underline">Back to products</Link>
    </main>
  );
}
