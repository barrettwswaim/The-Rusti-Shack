// Category data pulled from The_Rusti_Shack_Dataset.xlsx (Products tab) and
// the organized photo set in public/images/products/. Family counts are the
// number of distinct products in each category (sizes/colors collapsed),
// not the raw catalog row count.
export const categories = [
  {
    name: 'Snorkel & Dive',
    slug: 'snorkel-dive',
    blurb: 'Masks, fins, wetsuits, and reef-ready sets.',
    itemCount: 9,
    image: '/images/products/snorkel-dive/SNK-002-black-life.png',
  },
  {
    name: 'Surfing',
    slug: 'surfing',
    blurb: 'Boards, leashes, and kitesurf gear for every level.',
    itemCount: 8,
    image: '/images/products/surfing/SUR-002-life.png',
  },
  {
    name: 'Beach Essentials',
    slug: 'beach-essentials',
    blurb: 'Towels, shade, sunscreen, and the little things you forget.',
    itemCount: 12,
    image: '/images/products/beach-essentials/BCH-003-life.png',
  },
  {
    name: 'Fishing',
    slug: 'fishing',
    blurb: 'Rods, reels, tackle, and bait for a morning on the water.',
    itemCount: 8,
    image: '/images/products/fishing/FSH-001-life.png',
  },
  {
    name: 'Apparel',
    slug: 'apparel',
    blurb: 'Tees, swimwear, hats, and reef-ready everyday wear.',
    itemCount: 8,
    image: '/images/products/apparel/APP-004-tropical-print-life.png',
  },
];
