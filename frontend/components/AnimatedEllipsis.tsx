import { motion } from 'framer-motion';

export const AnimatedEllipsis = () => (
  <motion.span
    className="inline-block w-4 text-primary"
    animate={{ opacity: [0, 1, 0] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
  >
    ...
  </motion.span>
);