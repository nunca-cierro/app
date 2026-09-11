import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("sitemap", () => {
  it("lists the public landing routes with the production base URL", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://nuncacierro.com");
    expect(urls).toContain("https://nuncacierro.com/inicio");
    expect(urls).toContain("https://nuncacierro.com/legal");
    expect(entries[0].priority).toBe(1);
  });
});

describe("robots", () => {
  it("allows crawling and points to the sitemap", () => {
    const config = robots();
    expect(config.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(config.sitemap).toBe("https://nuncacierro.com/sitemap.xml");
  });
});