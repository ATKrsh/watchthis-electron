import React from 'react';

interface NeonCloudGlowProps {
  active: boolean;
}

export const NeonCloudGlow: React.FC<NeonCloudGlowProps> = ({ active }) => {
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-opacity duration-700 opacity-100 bg-[#04060c]">
      {/* SVG Smoke Turbulence Filter definition for organic volumetric edges */}
      <svg className="absolute w-0 h-0 pointer-events-none">
        <filter id="nebula-smoke-turb">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="55" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Dark Slate / Textured Backdrop */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0,102,255,0.06) 0%, transparent 80%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── CaptureME Deep Blue & Electric Cyan Volumetric Ambient Glow ── */}
      
      {/* Central Wide Atmospheric Deep Blue Glow Aura */}
      <div 
        className="absolute inset-[-10%] opacity-85"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 102, 255, 0.45) 0%, rgba(0, 210, 255, 0.25) 40%, rgba(0, 20, 80, 0.15) 70%, transparent 95%)',
          filter: 'blur(50px)',
        }}
      />

      {/* 1. Left Edge: Radiant Cobalt Blue & Cyan Billow */}
      <div 
        className="absolute -left-16 top-1/2 -translate-y-1/2 w-[420px] h-[98vh] opacity-95 animate-cloud-left"
        style={{
          background: 'radial-gradient(ellipse at 40% 50%, #00f0ff 0%, #0066ff 45%, #001a88 75%, transparent 100%)',
          filter: 'url(#nebula-smoke-turb) blur(32px)',
        }}
      />
      <div 
        className="absolute -left-10 top-1/3 w-[340px] h-[70vh] opacity-90"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,240,255,0.95) 0%, rgba(0,102,255,0.85) 50%, transparent 85%)',
          filter: 'blur(40px)',
        }}
      />

      {/* 2. Top Edge: Vibrant Sky Azure & Deep Blue */}
      <div 
        className="absolute -top-16 left-1/4 w-[70vw] h-[360px] opacity-95 animate-cloud-top"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #00d2ff 0%, #0066ff 40%, #0022aa 70%, #000d44 90%, transparent 100%)',
          filter: 'url(#nebula-smoke-turb) blur(35px)',
        }}
      />
      <div 
        className="absolute -top-10 right-1/4 w-[460px] h-[280px] opacity-90"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,180,255,0.95) 0%, rgba(0,102,255,0.85) 50%, transparent 85%)',
          filter: 'blur(42px)',
        }}
      />

      {/* 3. Right Edge: Electric Cyan & Cobalt Mist */}
      <div 
        className="absolute -right-16 top-1/2 -translate-y-1/3 w-[440px] h-[90vh] opacity-95 animate-cloud-right"
        style={{
          background: 'radial-gradient(circle at 60% 60%, #00d2ff 0%, #0066ff 40%, #001f7a 75%, transparent 100%)',
          filter: 'url(#nebula-smoke-turb) blur(32px)',
        }}
      />
      <div 
        className="absolute -right-8 bottom-1/4 w-[360px] h-[55vh] opacity-90"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,210,255,0.95) 0%, rgba(0,85,255,0.85) 50%, transparent 85%)',
          filter: 'blur(40px)',
        }}
      />

      {/* 4. Bottom Edge: Deep Oceanic Cobalt Blue */}
      <div 
        className="absolute -bottom-16 left-1/4 w-[70vw] h-[360px] opacity-95 animate-cloud-bottom"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, #0088ff 0%, #0055ff 40%, #002288 70%, #000c33 90%, transparent 100%)',
          filter: 'url(#nebula-smoke-turb) blur(35px)',
        }}
      />
      <div 
        className="absolute -bottom-10 left-1/3 w-[460px] h-[260px] opacity-90"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,136,255,0.9) 0%, rgba(0,51,187,0.8) 50%, transparent 85%)',
          filter: 'blur(42px)',
        }}
      />
    </div>
  );
};


