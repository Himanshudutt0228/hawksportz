import Image from "next/image";
import Link from "next/link";

type ProductCardProps = {
  name: string;
  price: string;
  slug: string | null;
  imageUrl: string | null;
};

export default function ProductCard({
  name,
  price,
  slug,
  imageUrl,
}: ProductCardProps) {
  return (
    <article className="min-w-0 rounded-lg border border-gray-200 bg-white p-2.5 sm:p-4 transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 80vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Product image
          </div>
        )}
      </div>

      <h2 className="mt-3 break-words text-sm font-medium sm:mt-4 sm:text-lg">{name}</h2>
      <p className="mt-2 text-sm text-gray-600 sm:text-base">{price}</p>

      {slug ? <Link
        href={`/product/${slug}`}
        className="mt-4 block min-h-11 w-full rounded-md bg-brand px-2 py-2.5 text-sm sm:px-4 sm:text-base text-center text-on-brand"
      >
        View Product
      </Link> : (
        <p className="mt-4 rounded-md bg-gray-100 px-4 py-2.5 text-center text-gray-500">
          Coming soon
        </p>
      )}
    </article>
  );
}
