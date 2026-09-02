import React, { useState, useCallback } from 'react';

export interface ReactionParticle {
  id: string;
  emoji: string;
  dx: number;
  rot: number;
  delayMs: number;
  sizeRem: number;
}

const LIKE_EMOJIS = ['👍', '❤️', '🔥', '😍', '👏', '🎉', '⚡', '💖', '✨', '🤩', '🌟', '🥰'];
const DISLIKE_EMOJIS = ['👎', '💔', '😢', '😠', '🥀', '🤯', '🤐', '❌', '👀', '🥺'];

export function useReactionBurst() {
  const [particles, setParticles] = useState<ReactionParticle[]>([]);

  const triggerBurst = useCallback((type: 'like' | 'dislike') => {
    const pool = type === 'like' ? LIKE_EMOJIS : DISLIKE_EMOJIS;
    const count = 7;
    const newParticles: ReactionParticle[] = [];

    for (let i = 0; i < count; i++) {
      const emoji = pool[Math.floor(Math.random() * pool.length)];
      // Random horizontal spread between -35px and +35px
      const dx = Math.floor(Math.random() * 70) - 35;
      // Random rotation between -25deg and +25deg
      const rot = Math.floor(Math.random() * 50) - 25;
      const delayMs = i * 45;
      const sizeRem = 1.2 + Math.random() * 0.7; // 1.2rem - 1.9rem

      newParticles.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        emoji,
        dx,
        rot,
        delayMs,
        sizeRem
      });
    }

    setParticles(newParticles);

    // Auto cleanup after animation finishes
    setTimeout(() => {
      setParticles([]);
    }, 1300);
  }, []);

  return { particles, triggerBurst };
}

export const ReactionBurstOverlay: React.FC<{ particles: ReactionParticle[] }> = ({ particles }) => {
  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center z-50">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute anim-float-reaction select-none drop-shadow-lg"
          style={
            {
              '--dx': `${p.dx}px`,
              '--rot': `${p.rot}deg`,
              animationDelay: `${p.delayMs}ms`,
              fontSize: `${p.sizeRem}rem`,
              top: '10%'
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
};
