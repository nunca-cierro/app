"use client";

import { useEffect, useState, useRef } from "react";

const negociosImages = [
  "/negocios/restaurante.jpg",
  "/negocios/barberia.jpg",
  "/negocios/panaderia.jpg",
  "/negocios/hamburgueseria.jpg",
  "/negocios/tienda-barrio.jpg",
  "/negocios/pasteleria.jpg",
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

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const prev = currentRef.current;
      const next = (prev + 1) % heroImages.length;
      currentRef.current = next;

      // Step 1: Show previous image (renders at opacity 1, no transition yet)
      setPreviousIndex(prev);
      setCurrentIndex(next);
      setFadeOut(false);

      // Step 2: On the next frame, trigger the fade-out transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFadeOut(true);
        });
      });

      // Step 3: After fade completes, clean up
      timeoutRef.current = setTimeout(() => {
        setPreviousIndex(null);
        setFadeOut(false);
      }, FADE_DURATION);
    }, ROTATE_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      {/* Current image — always visible */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${heroImages[currentIndex]}')`,
          zIndex: 2,
        }}
      />

      {/* Previous image — fades out when transitioning */}
      {previousIndex !== null && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroImages[previousIndex]}')`,
            opacity: fadeOut ? 0 : 1,
            transition: fadeOut ? `opacity ${FADE_DURATION}ms ease-in-out` : "none",
            zIndex: 3,
          }}
        />
      )}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/20 z-10" />
    </div>
  );
}
