import React, { useEffect, useRef, useState } from 'react';

interface ReactiveLogoProps {
  size?: number;
  theme?: 'neon' | 'minimal';
}

export const ReactiveLogo: React.FC<ReactiveLogoProps> = ({ size = 36, theme = 'neon' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ rotX: 0, rotY: 0, pupilX: 0, pupilY: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Distance normalized
      const maxDistance = 600;
      const dist = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), maxDistance);
      const angle = Math.atan2(deltaY, deltaX);

      const pull = dist / maxDistance;
      const pupilX = Math.cos(angle) * pull * 4;
      const pupilY = Math.sin(angle) * pull * 4;

      const rotY = Math.max(-20, Math.min(20, (deltaX / window.innerWidth) * 35));
      const rotX = Math.max(-20, Math.min(20, -(deltaY / window.innerHeight) * 35));

      setCoords({ rotX, rotY, pupilX, pupilY });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const isNeon = theme === 'neon';

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        perspective: '600px',
      }}
      className="relative flex items-center justify-center cursor-pointer select-none group"
    >
      {/* 3D Rotating Lens Body */}
      <div
        style={{
          transform: `rotateX(${coords.rotX}deg) rotateY(${coords.rotY}deg)`,
          transition: 'transform 0.12s cubic-bezier(0.2, 0.8, 0.4, 1)',
        }}
        className={`relative w-full h-full rounded-xl flex items-center justify-center p-[1.5px] shadow-sm ${
          isNeon
            ? 'bg-gradient-to-tr from-accent via-accent-cyan to-accent-magenta shadow-accent/20'
            : 'bg-gradient-to-tr from-white/20 via-slate-600 to-white/10'
        }`}
      >
        {/* Inner Chamber */}
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
          {/* Shutter Blade Radial Rings */}
          <div className="absolute inset-0.5 rounded-lg border border-white/[0.08] flex items-center justify-center">
            {/* Holographic aperture ring */}
            <div
              className={`w-4 h-4 rounded-full border border-dashed animate-spin transition-colors ${
                isNeon ? 'border-accent-cyan/60' : 'border-white/30'
              }`}
              style={{ animationDuration: '14s' }}
            />
          </div>

          {/* Mouse-Tracking Pupil / Core */}
          <div
            style={{
              transform: `translate(${coords.pupilX}px, ${coords.pupilY}px)`,
              transition: 'transform 0.08s ease-out',
            }}
            className={`relative w-2.5 h-2.5 rounded-full flex items-center justify-center ${
              isNeon ? 'bg-accent-neon shadow-glow-cyan' : 'bg-slate-200'
            }`}
          >
            {/* Center Core Glint */}
            <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
          </div>

          {/* Reactive Lens Reflection */}
          <div
            style={{
              transform: `translate(${-coords.pupilX * 0.5}px, ${-coords.pupilY * 0.5}px)`,
            }}
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white/20 blur-[1px] pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
};
