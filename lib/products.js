// Product catalog data, read live from Supabase (table: public.products).
// This mirrors the Products tab of The_Rusti_Shack_Dataset.xlsx (197 rows -
// one per SKU, including size/color/gender variants). The site only ever
// selects customer-facing columns - unit_cost and supplier are intentionally
// left out of every query below, even though they exist in the table for
// the business's own use.
//
// Images are not stored in Supabase; they stay local static files matched
// via lib/productImages.js, exactly as before.

import { supabase } from '@/lib/supabaseClient';
import { categories } from '@/lib/categories';
import { productImages } from '@/lib/productImages';

const PUBLIC_COLUMNS =
  'sku, product_name, category, subcategory, unit_price, rental_rate, ' +
  'availability, year_introduced, parent_sku, size, color, gender, variant_type';

function categorySlugFor(categoryName) {
  const match = categories.find((c) => c.name === categoryName);
  return match ? match.slug : null;
}

// Groups raw Supabase rows (one per SKU, including variants) into one card
// per product family - same shape the site has always used for the shop
// grid and product detail pages.
function buildFamilies(rows) {
  const families = new Map();

  for (const row of rows) {
    const familyKey = row.parent_sku || row.sku;
    if (!families.has(familyKey)) {
      families.set(familyKey, []);
    }
    families.get(familyKey).push(row);
  }

  const products = [];
  for (const [familyKey, variants] of families) {
    const base =
      variants.find((v) => v.variant_type === 'Parent' || v.variant_type === 'Standalone') ||
      variants[0];

    const prices = [...new Set(variants.map((v) => Number(v.unit_price)))];
    const price = Math.min(...prices);
    const priceIsFrom = prices.length > 1;

    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

    const images = productImages[familyKey] || { image: null, lifeImage: null };

    products.push({
      sku: familyKey,
      slug: familyKey.toLowerCase(),
      name: base.product_name,
      category: base.category,
      categorySlug: categorySlugFor(base.category),
      subcategory: base.subcategory,
      price,
      priceIsFrom,
      availability: base.availability,
      image: images.image,
      lifeImage: images.lifeImage,
      colors,
      sizes,
      yearIntroduced: base.year_introduced,
    });
  }

  products.sort((a, b) => a.categorySlug.localeCompare(b.categorySlug) || a.name.localeCompare(b.name));
  return products;
}

// All 45 product-family cards, for the shop grid.
export async function getShopProducts() {
  const { data, error } = await supabase.from('products').select(PUBLIC_COLUMNS);
  if (error) {
    throw new Error(`Failed to load products from Supabase: ${error.message}`);
  }
  return buildFamilies(data);
}

// Every family slug, for generateStaticParams on /shop/[slug].
export async function getAllProductSlugs() {
  const products = await getShopProducts();
  return products.map((p) => p.slug);
}

// A single product family by slug, for the detail page. Returns null if the
// slug doesn't match any known product (the page shows a 404).
export async function getProductBySlug(slug) {
  const products = await getShopProducts();
  return products.find((p) => p.slug === slug) || null;
}
