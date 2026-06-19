import React from "react";
import Nav from "../components/landing/Nav";
import Hero from "../components/landing/Hero";
import TrustGrid from "../components/landing/TrustGrid";
import DuoSection from "../components/landing/DuoSection";
import Pillars from "../components/landing/Pillars";
import Personas from "../components/landing/Personas";
import CustomerStories from "../components/landing/CustomerStories";
import Blog from "../components/landing/Blog";
import WallOfLove from "../components/landing/WallOfLove";
import FinalCTA from "../components/landing/FinalCTA";
import Footer from "../components/landing/Footer";

export default function Landing() {
  return (
    <div className="bg-white min-h-screen text-[#111111]">
      <Nav />
      <main>
        <Hero />
        <TrustGrid />
        <DuoSection />
        <Pillars />
        <Personas />
        <CustomerStories />
        <Blog />
        <WallOfLove />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
