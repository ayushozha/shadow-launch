import AccessCta from "@/components/landing/AccessCta";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import Jury from "@/components/landing/Jury";
import Method from "@/components/landing/Method";
import Nav from "@/components/landing/Nav";
import ScrollReveal from "@/components/landing/ScrollReveal";
import Stack from "@/components/landing/Stack";
import Thesis from "@/components/landing/Thesis";
import TraceTicker from "@/components/landing/TraceTicker";
import Wedge from "@/components/landing/Wedge";

export default function Home() {
  return (
    <>
      <TraceTicker />
      <Nav />
      <Hero />
      <Thesis />
      <Method />
      <Jury />
      <Wedge />
      <Stack />
      <AccessCta />
      <Footer />
      <ScrollReveal />
    </>
  );
}
