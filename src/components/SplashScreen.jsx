import { useRef, useState } from "react";
import { gsap } from "gsap";
import useGameStore from "../store/useGameStore";

export default function SplashScreen() {
  const setSplashDone = useGameStore((s) => s.setSplashDone);
  const [started, setStarted] = useState(false);

  const wrapRef = useRef();
  const logoRef = useRef();
  const audioRef = useRef();
  const maskPathRef = useRef();

  const startAnimation = () => {
    if (started) return;
    setStarted(true);

    const tl = gsap.timeline();

    // 🔊 1. Start Audio
    tl.add(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    }, 0);

    // 🎬 2. The Authentic "Spray Motion" Reveal
    // Animates a round, feathered brush stroke dragging diagonally across the mask
    tl.fromTo(
      maskPathRef.current,
      {
        strokeDashoffset: 150, // Initially drawn out of bounds (hidden)
      },
      {
        strokeDashoffset: 0,   // Draws the massive round spray dot across the logo
        duration: 2.1, 
        ease: "power1.inOut",  // Acceleration mimics a human hand sweeping the can
        onUpdate: function () {
          // Camera shake while spraying
          gsap.to(wrapRef.current, {
            x: (Math.random() - 0.5) * 6,
            y: (Math.random() - 0.5) * 6,
            duration: 0.05,
          });
        },
      },
      1.8 // Audio sync delay
    );

    // 💥 3. The Solid Impact Drop
    tl.add(() => {
      // Impact shake reset
      gsap.to(wrapRef.current, { x: 0, y: 0, duration: 0.1 });
      
      if (logoRef.current) {
        // Brightness pop matching the GTA beat drop
        gsap.fromTo(logoRef.current,
          { filter: 'brightness(3) contrast(1.2)' },
          { filter: 'brightness(1) contrast(1)', duration: 0.8, ease: 'power2.out' }
        );
      }
    }, 1.8 + 2.1);

    // 🚪 4. Fade to Menu
    tl.to(wrapRef.current, {
      opacity: 0,
      duration: 0.6,
      delay: 0.8,
      onComplete: () => setSplashDone(true),
    });
  };

  return (
    <div ref={wrapRef} onClick={startAnimation} style={styles.container}>

      {/* 🏙️ Self-Contained SVG Spray Masking System */}
      <div style={{ ...styles.logoWrapper, opacity: started ? 1 : 0, transition: 'opacity 0.1s' }}>
        {/* We use an SVG viewBox of 100x100 so all mask points are percentage-based and scale perfectly */}
        <svg ref={logoRef} width="480" height="auto" viewBox="0 0 100 100" style={{ pointerEvents: 'none', filter: 'brightness(1) contrast(1)' }}>
          <defs>
            {/* The blur gives the trace a feathered edge exactly like aerosol overspray */}
            <filter id="spray-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
            
            <mask id="spray-mask">
              {/* This path physically draws a thick, round-capped line diagonally from top-left to bottom-right */}
              <path
                ref={maskPathRef}
                d="M 5 5 L 95 95" 
                stroke="white"
                strokeWidth="70" // Massive brush size to sweep across the width of the logo
                strokeLinecap="round" // Round tip like a nozzle spray dot
                strokeDasharray="150"
                strokeDashoffset="150"
                filter="url(#spray-blur)"
                fill="none"
              />
            </mask>
          </defs>

          {/* The logo is embedded fully within the SVG and constrained by the animated path mask */}
          <image
            href="/favicon.png"
            x="0"
            y="0"
            width="100"
            height="100"
            mask="url(#spray-mask)"
          />
        </svg>
      </div>

      {/* AUDIO */}
      <audio ref={audioRef} src="/sounds/spray.mp3" />

      {!started && (
        <div style={styles.instruction}>[ CLICK TO INITIALIZE ]</div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    inset: 0,
    background: "#000", // Solid black exactly like real intro
    overflow: "hidden",
    zIndex: 9999,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "480px", // Proper size for the logo
    height: "auto",
    filter: "brightness(1) contrast(1)",
  },
  instruction: {
    position: "absolute",
    bottom: "15%",
    width: "100%",
    textAlign: "center",
    color: "#555",
    fontFamily: "monospace",
    fontSize: "14px",
    letterSpacing: "0.25em",
    animation: "pulse 1.8s infinite",
  },
};