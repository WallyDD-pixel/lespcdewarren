"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isHome = pathname === "/";

  // Padding: aucun espace en haut sur l’accueil
  const cls = isHome
    ? "flex-1 pt-0 pb-16 md:pb-24"
    : "flex-1 pt-12 md:pt-20 pb-16 md:pb-24";

  // Variants d’animation (fade + léger slide)
  const variants = {
    hidden: { opacity: 0, y: 6 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  } as const;

  return (
    <main className={cls}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={variants}
          initial="hidden"
          animate="enter"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
