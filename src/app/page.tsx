'use client';

import Navigation from '@/components/arch/Navigation';
import HeroSection from '@/components/arch/HeroSection';
import ProblemSection from '@/components/arch/ProblemSolution';
import C4SystemContext from '@/components/arch/C4SystemContext';
import C4Container from '@/components/arch/C4Container';
import C4Deployment from '@/components/arch/C4Deployment';
import UserFlowSection from '@/components/arch/UserFlowSection';
import TechSpecsSection from '@/components/arch/TechSpecsSection';
import Footer from '@/components/arch/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A12]">
      <Navigation />
      <HeroSection />
      
      <div className="section-divider" />
      <ProblemSection />
      
      <div className="section-divider" />
      <C4SystemContext />
      
      <div className="section-divider" />
      <C4Container />
      
      <div className="section-divider" />
      <C4Deployment />
      
      <div className="section-divider" />
      <UserFlowSection />
      
      <div className="section-divider" />
      <TechSpecsSection />
      
      <Footer />
    </div>
  );
}
