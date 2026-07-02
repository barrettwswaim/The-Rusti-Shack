import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Intro from '@/components/Intro';
import CategoryPreview from '@/components/CategoryPreview';
import ShopCTA from '@/components/ShopCTA';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Intro />
        <CategoryPreview />
        <ShopCTA />
      </main>
      <Footer />
    </>
  );
}
