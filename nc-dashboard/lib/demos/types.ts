import type { DemoServiceItem, DemoFaqItem } from "@/components/demo/demo-chat-widget";

export interface DemoPackageItem {
  name: string;
  price: string;
  description: string;
  includes: string[];
  featured: boolean;
}

export interface DemoTestimonialItem {
  name: string;
  service: string;
  text: string;
}

export interface DemoBeforeAfterCase {
  title: string;
  before: string;
  after: string;
}

export interface DemoProfile {
  slug: string;
  businessName: string;
  brandAccent: string;
  categoryName: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  schedule: string;
  instagram: string;
  services: DemoServiceItem[];
  serviceChips: string[];
  packages: DemoPackageItem[];
  galleryImages: string[];
  beforeAfterCases: DemoBeforeAfterCase[];
  testimonials: DemoTestimonialItem[];
  faqs: DemoFaqItem[];
  benefitBox: {
    eyebrow: string;
    title: string;
    ctaText: string;
  };
}

