import { motion } from "framer-motion";

export function ParticleBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(139, 92, 246, 0.25), transparent 60%)",
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, 60, -40, 0],
          y: [0, 40, -20, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 w-[36rem] h-[36rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(236, 72, 153, 0.22), transparent 60%)",
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, -50, 30, 0],
          y: [0, -30, 50, 0],
          scale: [1, 0.9, 1.2, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(99, 102, 241, 0.18), transparent 60%)",
          filter: "blur(50px)",
        }}
        animate={{
          x: ["-50%", "-45%", "-55%", "-50%"],
          y: ["-50%", "-55%", "-45%", "-50%"],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}