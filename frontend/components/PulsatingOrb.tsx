import { motion } from 'framer-motion';

export const PulsatingOrb = () => (
  <motion.div
    className="w-3 h-3 bg-primary rounded-full inline-block mr-2"
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);