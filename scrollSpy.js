/**
 * scrollSpy.js
 * Sets active nav link based on visible section (Single Page)
 */

export default function initScrollSpy() {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = Array.from(navLinks)
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!navLinks.length || !sections.length) return;

  const setActiveLink = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    },
    {
      root: null,
      threshold: 0.5, // section must be 50% visible
      rootMargin: "-50px 0px 0px", // adjust if header height changes
    }
  );

  sections.forEach((section) => observer.observe(section));
}
