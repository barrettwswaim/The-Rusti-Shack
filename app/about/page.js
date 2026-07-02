import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AboutHero from '@/components/AboutHero';
import IslandStory from '@/components/IslandStory';
import GettingThere from '@/components/GettingThere';
import ShopCTA from '@/components/ShopCTA';

export const metadata = {
  title: 'About Apo Island | The Rusti Shack',
  description:
    "The reef, the boat ride over, and the shop that's grown up around both — what to know about Apo Island before your trip.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <AboutHero />
        <IslandStory />
        <GettingThere />
        <ShopCTA />
      </main>
      <Footer />
    </>
  );
}
