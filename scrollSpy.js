/**
 * scrollSpy.js
 * Sets active nav link based on visible section (Single Page)
 */

export default function initScrollSpy() {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = Array.from(navLinks)
    .map((link) => {
      const id = link.getAttribute("href");
      return id && id.startsWith("#") ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if (!navLinks.length || !sections.length) return;

  const setActiveLink = (id) => {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", isActive);
    });
  };

  // Keep track of which sections are currently intersecting
  const visibleSections = new Set();

  const observerOptions = {
    // Offset for the fixed header (approx 80px)
    rootMargin: "-85px 0px -20% 0px",
    threshold: [0, 0.1, 0.2, 0.5, 0.8, 1.0],
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        visibleSections.add(entry.target);
      } else {
        visibleSections.delete(entry.target);
      }
    });

    // Find the section that occupies the largest portion of the visible area
    // or is simply the highest visible section
    if (visibleSections.size > 0) {
      const sorted = Array.from(visibleSections).sort((a, b) => {
        return a.offsetTop - b.offsetTop;
      });
      setActiveLink(sorted[0].id);
    }
  }, observerOptions);

  sections.forEach((section) => observer.observe(section));

  // Handle manual clicks to prevent scroll-jump desync
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').substring(1);
      setTimeout(() => setActiveLink(id), 100);
    });
  });
}
