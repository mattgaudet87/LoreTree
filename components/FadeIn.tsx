"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// A soft fade used when moving between timeline levels (Lifetime -> year ->
// feed). Each level is its own route, so this just fades its own content in
// on mount rather than crossfading between two pages at once.
export default function FadeIn({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  );
}
