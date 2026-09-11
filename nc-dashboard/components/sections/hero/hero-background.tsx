"use client";

import { useEffect, useState, useRef } from "react";

const negociosImages = [
  "/negocios/restaurante-gourmet.jpg",
  "/negocios/boutique-moda.jpg",
  "/negocios/clinica-estetica.jpg",
  "/negocios/spa-bienestar.jpg",
  "/negocios/inmobiliaria.jpg",
  "/negocios/showroom-automotriz.jpg",
];

const websitesImages = [
  "/websites/Nuncacierro web y movil.png",
  "/websites/Restaurante website.jpeg",
  "/websites/Mujer sosteniendo smartphone.jpeg",
  "/websites/Negocio mostrando el sitio.jpeg",
  "/websites/Diseño en celular.jpeg",
];

const ROTATE_INTERVAL = 5000; // 5 seconds per image
const FADE_DURATION = 1000; // 1 second fade

type HeroBackgroundProps = {
  images?: "websites" | "negocios";
};

export function HeroBackground({ images = "negocios" }: HeroBackgroundProps = {}) {
  const heroImages = images === "websites" ? websitesImages : negociosImages;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const currentRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

  // Preload next image whenever the current image changes
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % heroImages.length;
    const img = new Image();
    img.src = heroImages[nextIndex];
  }, [currentIndex, heroImages]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const prev = currentRef.current;
      const next = (prev + 1) % heroImages.length;
      currentRef.current = next;

      // Step 1: Show previous image on top (opacity 1), new image behind it
      setPreviousIndex(prev);
      setCurrentIndex(next);
      setFadeOut(false);

      // Step 2: Next frame — trigger the fade-out on the previous image
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setFadeOut(true);
        });
      });

      // Step 3: After fade completes, remove the previous image layer
      timeoutRef.current = setTimeout(() => {
        setPreviousIndex(null);
        setFadeOut(false);
      }, FADE_DURATION);
    }, ROTATE_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [heroImages]);

  return (
    <div className="absolute inset-0 bg-stone-950">
      {/* Current image — always rendered behind */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-stone-950"
        style={{
          backgroundImage: `url('${heroImages[currentIndex]}')`,
          zIndex: 2,
        }}
      />

      {/* Previous image — fades out on top; bg-stone-950 prevents transparent flash */}
      {previousIndex !== null && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-stone-950"
          style={{
            backgroundImage: `url('${heroImages[previousIndex]}')`,
            opacity: fadeOut ? 0 : 1,
            transition: fadeOut ? `opacity ${FADE_DURATION}ms ease-in-out` : "none",
            willChange: "opacity",
            zIndex: 3,
          }}
        />
      )}

      {/* Scrim for text readability — left-weighted gradient. Flat bg-black/20
          worked on the dark images but washes out on the daylight v5/v6 set;
          the gradient keeps the copy readable on both. */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/55 via-black/30 to-transparent" />
    </div>
  );
}
