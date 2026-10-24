"use client";

import { m } from "motion/react";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";

type MagneticButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  strength?: number;
  type?: "button" | "submit";
  ariaLabel?: string;
};

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-sage focus-visible:ring-offset-2";

/** A button or in-page link that drifts a little toward the cursor and springs back on leave. */
export function MagneticButton({ children, onClick, href, className = "", strength = 0.28, type = "button", ariaLabel }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    setPosition({ x: (e.clientX - (left + width / 2)) * strength, y: (e.clientY - (top + height / 2)) * strength });
  };

  return (
    <m.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPosition({ x: 0, y: 0 })}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 240, damping: 18, mass: 0.4 }}
      className="inline-block"
    >
      {href ? (
        <a href={href} onClick={onClick} aria-label={ariaLabel} className={`${BASE} ${className}`}>
          {children}
        </a>
      ) : (
        <button type={type} onClick={onClick} aria-label={ariaLabel} className={`${BASE} ${className}`}>
          {children}
        </button>
      )}
    </m.div>
  );
}
