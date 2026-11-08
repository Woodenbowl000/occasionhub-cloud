"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Different spring configs for parallax effect
  const orb1X = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const orb1Y = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const orb2X = useSpring(mouseX, { stiffness: 30, damping: 25 });
  const orb2Y = useSpring(mouseY, { stiffness: 30, damping: 25 });

  const orb3X = useSpring(mouseX, { stiffness: 40, damping: 30 });
  const orb3Y = useSpring(mouseY, { stiffness: 40, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      // Convert to relative movement (parallax effect)
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const moveX = (clientX - centerX) / 20; // Divide for subtle movement
      const moveY = (clientY - centerY) / 20;

      mouseX.set(moveX);
      mouseY.set(moveY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div
      className={cn(
        "relative flex flex-col h-full w-full bg-gradient-to-br from-primary via-primary to-primary-600 text-primary-foreground overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            `
            [--white-gradient:repeating-linear-gradient(100deg,var(--primary)_0%,var(--primary)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--primary)_16%)]
            [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)]
            [background-image:var(--white-gradient),var(--aurora)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[10px] invert
            after:content-[""] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] 
            after:[background-size:200%,_100%] 
            after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference
            pointer-events-none
            absolute -inset-[10px] opacity-50 will-change-transform`,

            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`
          )}
        ></div>
      </div>

      {/* Animated gradient orbs - now follow mouse with parallax */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Purple orb - fastest parallax response */}
        <motion.div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
            x: orb1X,
            y: orb1Y,
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            scale: {
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        />

        {/* Indigo orb - medium parallax response */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)",
            filter: "blur(70px)",
            x: orb2X,
            y: orb2Y,
          }}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            scale: {
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        />

        {/* Pink accent orb - slowest parallax for depth */}
        <motion.div
          className="absolute bottom-0 left-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)",
            filter: "blur(50px)",
            x: orb3X,
            y: orb3Y,
          }}
          animate={{
            scale: [1, 1.15, 1],
          }}
          transition={{
            scale: {
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        />
      </motion.div>

      {/* Content wrapper with proper z-index */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};
