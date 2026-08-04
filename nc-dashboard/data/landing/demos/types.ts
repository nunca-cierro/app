export interface DemoItem {
  name: string;
  category: string;
  /** Canonical category slug from lib/business-categories (shared vocabulary). */
  categorySlug: string;
  href: string;
  image: string;
  shortDescription: string;
  longDescription: string;
  features: string[];
}
