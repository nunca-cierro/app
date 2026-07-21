"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedWrapper } from "@/components/ui/animated-wrapper";
import { landingExamples, type DemoItem } from "@/data/landing/examples";
import { siteBanner, siteUi, siteWhatsAppMessages } from "@/data/site";

const buildWhatsappLink = (demoName: string) => {
  const message = landingExamples.whatsappMessageTemplate.replace(
    "{demoName}",
    demoName,
  );
  return `https://wa.me/${siteBanner.whatsappNumber}?text=${encodeURIComponent(message)}`;
};

export function LandingExamples() {
  const [activeDemo, setActiveDemo] = useState<DemoItem | null>(null);

  useEffect(() => {
    if (!activeDemo) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveDemo(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeDemo]);

  return (
    <Section
      id={landingExamples.sectionId}
      className="border-stone-700/60 bg-stone-800 text-stone-100"
      containerClassName="max-w-6xl px-3 sm:px-4 lg:px-6"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
            {landingExamples.label}
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white md:text-5xl">
            {landingExamples.title}
          </h2>
          <p className="mt-5 text-pretty text-base text-stone-300/80 md:text-lg">
            {landingExamples.subtitle}
          </p>
          <p className="mt-3 text-sm text-stone-400 md:text-base">
            {landingExamples.secondarySubtitle}
          </p>
        </div>
      </AnimatedWrapper>

      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {landingExamples.demos.map((demo) => (
          <Card
            key={demo.href}
            role="button"
            tabIndex={0}
            onClick={() => setActiveDemo(demo)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveDemo(demo);
              }
            }}
            className="group cursor-pointer overflow-hidden border border-stone-700 bg-stone-900/60 p-0 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-[0_0_0_1px_rgba(242,191,39,0.25),0_20px_40px_rgba(0,0,0,0.3)]"
          >
            <div className="relative h-52 w-full overflow-hidden">
              <Image
                src={demo.image}
                alt={`${landingExamples.imageAltPrefix} ${demo.category}`}
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                quality={75}
              />
              <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-stone-950/55 to-stone-950/15" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300/90">
                  {demo.category}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {demo.name}
                </h3>
              </div>
            </div>

            <div className="space-y-5 px-5 pb-5 pt-4">
              <p className="text-sm text-stone-300/80">{demo.shortDescription}</p>

              <ul className="space-y-2 text-sm text-stone-300/80">
                {demo.features.map((feature) => (
                  <li key={`${demo.name}-${feature}`} className="flex gap-2">
                    <span className="text-amber-400">{siteUi.listBullet}</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 pt-1">
                <Button
                  asChild
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <Link
                    href={demo.href}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {landingExamples.buttons.viewDemo}
                  </Link>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="w-full border border-stone-600 bg-stone-800 text-stone-100 hover:bg-stone-700"
                >
                  <a
                    href={buildWhatsappLink(demo.name)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {landingExamples.buttons.quoteSimilar}
                  </a>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AnimatedWrapper direction="up" duration={0.5}>
        <div className="mt-16 rounded-2xl border border-amber-400/30 bg-stone-900/80 p-8 text-center shadow-lg">
          <h3 className="text-2xl font-semibold text-white md:text-3xl">
            {landingExamples.cta.title}
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-stone-300">
            {landingExamples.cta.description}
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 min-w-64 text-base bg-amber-500 hover:bg-amber-600 text-stone-950"
          >
            <a href={siteWhatsAppMessages.landingUrl} target="_blank" rel="noreferrer">
              {landingExamples.cta.buttonLabel}
            </a>
          </Button>
        </div>
      </AnimatedWrapper>

      {activeDemo ? (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-stone-950/75 p-4 md:items-center"
          onClick={() => setActiveDemo(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-52 w-full overflow-hidden rounded-t-2xl">
              <Image
                src={activeDemo.image}
                alt={activeDemo.name}
                fill
                sizes="(min-width: 768px) 700px, 100vw"
                className="object-cover"
                quality={75}
              />
              <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-stone-900/50 to-stone-950/10" />
              <button
                type="button"
                onClick={() => setActiveDemo(null)}
                className="absolute right-3 top-3 rounded-md bg-stone-950/70 px-2.5 py-1 text-sm text-stone-100 transition hover:bg-stone-800"
                aria-label={landingExamples.modal.closeLabel}
              >
                {landingExamples.modal.closeText}
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300/90">
                  {activeDemo.category}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {activeDemo.name}
                </p>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <p className="text-stone-300">{activeDemo.longDescription}</p>

              <ul className="space-y-2 text-sm text-stone-200">
                {activeDemo.features.map((feature) => (
                  <li key={`modal-${activeDemo.name}-${feature}`}>
                    {siteUi.listBullet} {feature}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button asChild className="flex-1 bg-amber-600 hover:bg-amber-700">
                  <Link href={activeDemo.href}>
                    {landingExamples.buttons.openDemo}
                  </Link>
                </Button>
                <Button asChild className="flex-1 border border-stone-600 bg-stone-800 text-stone-100 hover:bg-stone-700">
                  <a
                    href={buildWhatsappLink(activeDemo.name)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {landingExamples.buttons.quoteWhatsapp}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Section>
  );
}
