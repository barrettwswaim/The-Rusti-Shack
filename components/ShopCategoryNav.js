import { categories } from '@/lib/categories';

export default function ShopCategoryNav() {
  return (
    <nav
      aria-label="Shop by category"
      className="sticky top-[61px] z-40 -mx-4 overflow-x-auto border-b border-sand-deep bg-sand/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-6"
    >
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap sm:justify-center">
        {categories.map((category) => (
          <li key={category.slug}>
            <a
              href={`#${category.slug}`}
              className="press-scale inline-flex items-center whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-medium tracking-tight text-ink/80 ring-1 ring-black/5 transition-colors hover:bg-ocean hover:text-white"
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
