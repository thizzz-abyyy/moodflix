import { useEffect } from 'react';

export function useParticles() {
  useEffect(() => {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles, animId;
    const colors = ['168,85,247', '59,130,246', '236,72,153'];
    
    function resize() { 
      w = canvas.width = window.innerWidth; 
      h = canvas.height = window.innerHeight; 
    }
    
    function mkParticles() { 
      particles = Array.from({length: 55}, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.1,
        c: colors[Math.floor(Math.random() * 3)]
      })); 
    }
    
    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if(p.x < 0) p.x = w;
        if(p.x > w) p.x = 0;
        if(p.y < 0) p.y = h;
        if(p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},${p.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    
    resize(); 
    mkParticles(); 
    draw();
    window.addEventListener('resize', () => { resize(); mkParticles(); });
    return () => cancelAnimationFrame(animId);
  }, []);
}
