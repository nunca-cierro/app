"use client";

import { siteFaq } from "@/data/site";
import { Section } from "@/components/layout/section";
import { Card } from "@/components/ui/card";
import { AnimatedWrapper, itemVariants } from "@/components/ui/animated-wrapper";
import { motion } from "framer-motion";

export function Faq() {
  return (
    <Section
      id={siteFaq.sectionId}
      className="border-stone-800/80 bg-stone-900 text-stone-100"
    >
      <AnimatedWrapper direction="up" duration={0.6}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
            {siteFaq.label}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-stone-100 md:text-4xl">
            {siteFaq.title}
          </h2>
          <p className="mt-4 text-stone-300/90">
            {siteFaq.subtitle}
          </p>
        </div>
      </AnimatedWrapper>

      <motion.div
        className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06 } },
        }}
      >
        {siteFaq.items.map((faq) => (
          <motion.div key={faq.question} variants={itemVariants}>
            <Card className="rounded-lg border border-amber-400/50 bg-stone-900/60 p-6">
              <h3 className="text-base font-semibold text-stone-100">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm text-stone-300/85">{faq.answer}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}
