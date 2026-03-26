import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import useGameStore from "../store/useGameStore";

export default function SplashScreen() {
  const setSplashDone = useGameStore((s) => s.setSplashDone);
  
  const wrapRef = useRef();
  const logoRef = useRef();

  // 🎬 Auto Start Animation on Mount
  useEffect(() => {
    const tl = gsap.timeline();

    // 1. Cinematic Fade In
    tl.to(logoRef.current, {
      opacity: 1,
      duration: 1.5,
      ease: "power2.inOut",
    });

    // 2. The "Good" Out-Animation: Cinematic Zoom + Blur + Disintegrate
    tl.to(logoRef.current, {
      scale: 1.6,              // Dramatically push toward the camera
      filter: "blur(15px)",    // Intense cinematic lens blur 
      opacity: 0,              // Fade out simultaneously
      duration: 1.5,
      ease: "power3.inOut",
    }, "+=1.2"); // Hold solid on screen for 1.2 seconds before zooming out

    // 🚪 3. Fade entire container to Menu, overlapping with the zoom
    tl.to(wrapRef.current, {
      opacity: 0,
      duration: 1.0,
      ease: "power2.inOut",
      onComplete: () => setSplashDone(true),
    }, "-=0.6"); // Triggers during the last 0.6 seconds of the logo zoom

  }, [setSplashDone]);

  return (
    <div ref={wrapRef} style={styles.container}>

      <div style={styles.logoWrapper}>
        <img
          ref={logoRef}
          className="logo-img"
          src="/favicon.png"
          alt="Logo"
          style={{
             ...styles.logo,
             opacity: 0, // Starts completely hidden for fade-in
             filter: "blur(0px)", // Initialize filter for smooth GSAP transitioning
          }}
        />
      </div>

    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    inset: 0,
    background: "#000",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  },
  logoWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "320px",
    height: "auto",
  },
};