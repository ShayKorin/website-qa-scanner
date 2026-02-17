// Content script - runs on every page, responds to scan requests from popup

// Store scan function globally so we can call it from message handler
window.qaScannerScan = function() {
  const url = window.location.href;
  const doc = document;

  return {
    url,
    timestamp: new Date().toISOString(),
    seo: scanSEO(doc),
    accessibility: scanAccessibility(doc),
    performance: scanPerformance(doc),
    security: scanSecurity(doc),
    content: scanContent(doc),
    mobile: scanMobile(doc),
    bestPractices: scanBestPractices(doc),
  };
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan") {
    try {
      // Call the global scan function
      const report = window.qaScannerScan();
      sendResponse({ success: true, report });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

// Also expose scan function globally for direct calling
if (typeof window !== 'undefined') {
  window.qaScannerReady = true;
}

// ─── SEO ───────────────────────────────────────────────────────

function scanSEO(doc) {
  const issues = [];
  const passes = [];

  // Title
  const title = doc.querySelector("title");
  if (!title || !title.textContent.trim()) {
    issues.push({ severity: "critical", message: "Missing page title" });
  } else {
    const len = title.textContent.trim().length;
    if (len < 30) issues.push({ severity: "warning", message: `Title too short (${len} chars, recommend 30-60)` });
    else if (len > 60) issues.push({ severity: "warning", message: `Title too long (${len} chars, recommend 30-60)` });
    else passes.push(`Title length is good (${len} chars)`);
  }

  // Meta description
  const metaDesc = doc.querySelector('meta[name="description"]');
  if (!metaDesc || !metaDesc.content.trim()) {
    issues.push({ severity: "critical", message: "Missing meta description" });
  } else {
    const len = metaDesc.content.trim().length;
    if (len < 120) issues.push({ severity: "warning", message: `Meta description too short (${len} chars, recommend 120-160)` });
    else if (len > 160) issues.push({ severity: "warning", message: `Meta description too long (${len} chars, recommend 120-160)` });
    else passes.push(`Meta description length is good (${len} chars)`);
  }

  // H1
  const h1s = doc.querySelectorAll("h1");
  if (h1s.length === 0) issues.push({ severity: "critical", message: "No H1 tag found" });
  else if (h1s.length > 1) issues.push({ severity: "warning", message: `Multiple H1 tags found (${h1s.length})` });
  else passes.push("Single H1 tag present");

  // Heading hierarchy
  const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let prevLevel = 0;
  let hierarchyOk = true;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1]);
    if (level > prevLevel + 1 && prevLevel > 0) {
      hierarchyOk = false;
    }
    prevLevel = level;
  });
  if (!hierarchyOk) issues.push({ severity: "warning", message: "Heading hierarchy has gaps (e.g., H1 → H3 skipping H2)" });
  else if (headings.length > 0) passes.push("Heading hierarchy is correct");

  // Canonical
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) issues.push({ severity: "warning", message: "Missing canonical URL" });
  else passes.push("Canonical URL present");

  // Open Graph
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  const ogImage = doc.querySelector('meta[property="og:image"]');
  if (!ogTitle) issues.push({ severity: "info", message: "Missing og:title" });
  else passes.push("og:title present");
  if (!ogDesc) issues.push({ severity: "info", message: "Missing og:description" });
  if (!ogImage) issues.push({ severity: "info", message: "Missing og:image" });

  // Twitter Card
  const twitterCard = doc.querySelector('meta[name="twitter:card"]');
  if (!twitterCard) issues.push({ severity: "info", message: "Missing Twitter Card meta tags" });

  // Images without alt
  const images = doc.querySelectorAll("img");
  const imgsNoAlt = Array.from(images).filter((img) => !img.alt || !img.alt.trim());
  if (imgsNoAlt.length > 0) {
    issues.push({ severity: "warning", message: `${imgsNoAlt.length} image(s) missing alt text (SEO + accessibility)` });
  } else if (images.length > 0) {
    passes.push(`All ${images.length} images have alt text`);
  }

  // Links
  const links = doc.querySelectorAll("a[href]");
  const nofollow = Array.from(links).filter((a) => a.rel && a.rel.includes("nofollow"));
  passes.push(`${links.length} links found, ${nofollow.length} nofollow`);

  // Structured data
  const jsonLd = doc.querySelectorAll('script[type="application/ld+json"]');
  if (jsonLd.length === 0) issues.push({ severity: "info", message: "No structured data (JSON-LD) found" });
  else passes.push(`${jsonLd.length} structured data block(s) found`);

  // Lang attribute
  const lang = doc.documentElement.lang;
  if (!lang) issues.push({ severity: "warning", message: "Missing lang attribute on <html>" });
  else passes.push(`Language set: ${lang}`);

  // Robots meta
  const robotsMeta = doc.querySelector('meta[name="robots"]');
  if (robotsMeta && robotsMeta.content.includes("noindex")) {
    issues.push({ severity: "warning", message: "Page is set to noindex" });
  }

  // Wix-specific checks
  const isWix = doc.querySelector('[data-wix-id]') || doc.URL.includes('.wixsite.com') || doc.URL.includes('.wix.com');
  if (isWix) {
    passes.push("Wix site detected");
    // Wix typically handles a lot of SEO automatically
    const wixSeoPanel = doc.querySelector('[data-wix-seo]');
    if (wixSeoPanel) passes.push("Wix SEO panel detected");
  }

  return { issues, passes, score: calcScore(issues) };
}

// ─── ACCESSIBILITY ─────────────────────────────────────────────

function scanAccessibility(doc) {
  const issues = [];
  const passes = [];

  // Images without alt
  const images = doc.querySelectorAll("img");
  const noAlt = Array.from(images).filter((img) => !img.hasAttribute("alt"));
  if (noAlt.length > 0) issues.push({ severity: "critical", message: `${noAlt.length} image(s) missing alt attribute entirely` });
  
  const emptyAlt = Array.from(images).filter((img) => img.hasAttribute("alt") && img.alt === "" && !img.getAttribute("role"));
  if (emptyAlt.length > 5) issues.push({ severity: "info", message: `${emptyAlt.length} images with empty alt (ok if decorative)` });

  // Form labels
  const inputs = doc.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='checkbox']):not([type='radio']), textarea, select");
  let unlabeled = 0;
  inputs.forEach((input) => {
    const id = input.id;
    const hasLabel = id && doc.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby");
    const wrappedInLabel = input.closest("label");
    if (!hasLabel && !hasAriaLabel && !wrappedInLabel) unlabeled++;
  });
  if (unlabeled > 0) issues.push({ severity: "critical", message: `${unlabeled} form input(s) without associated labels` });
  else if (inputs.length > 0) passes.push(`All ${inputs.length} form inputs have labels`);

  // Buttons without text
  const buttons = doc.querySelectorAll("button, [role='button']");
  let emptyButtons = 0;
  buttons.forEach((btn) => {
    const text = btn.textContent.trim();
    const ariaLabel = btn.getAttribute("aria-label") || btn.getAttribute("aria-labelledby");
    const title = btn.getAttribute("title");
    const icon = btn.querySelector("svg, img");
    if (!text && !ariaLabel && !title && !icon) emptyButtons++;
  });
  if (emptyButtons > 0) issues.push({ severity: "warning", message: `${emptyButtons} button(s) without accessible text` });
  else if (buttons.length > 0) passes.push(`All ${buttons.length} buttons have accessible text`);

  // Links without text
  const links = doc.querySelectorAll("a[href]");
  let emptyLinks = 0;
  links.forEach((a) => {
    const text = a.textContent.trim();
    const ariaLabel = a.getAttribute("aria-label");
    const img = a.querySelector("img[alt]");
    const icon = a.querySelector("svg");
    if (!text && !ariaLabel && !img && !icon) emptyLinks++;
  });
  if (emptyLinks > 0) issues.push({ severity: "warning", message: `${emptyLinks} link(s) without accessible text` });

  // ARIA landmarks
  const landmarks = doc.querySelectorAll("main, nav, header, footer, aside, [role='main'], [role='navigation'], [role='banner'], [role='contentinfo']");
  if (landmarks.length === 0) issues.push({ severity: "warning", message: "No ARIA landmarks found (main, nav, header, footer)" });
  else passes.push(`${landmarks.length} ARIA landmarks found`);

  // Skip navigation
  const skipLink = doc.querySelector('a[href="#main"], a[href="#content"], a[href="#main-content"], .skip-link, .skip-nav');
  if (!skipLink) issues.push({ severity: "info", message: "No skip navigation link found" });
  else passes.push("Skip navigation link present");

  // Tabindex
  const positiveTabindex = doc.querySelectorAll("[tabindex]");
  const badTabindex = Array.from(positiveTabindex).filter((el) => parseInt(el.getAttribute("tabindex")) > 0);
  if (badTabindex.length > 0) issues.push({ severity: "warning", message: `${badTabindex.length} element(s) with positive tabindex (disrupts natural tab order)` });

  // Wix-specific accessibility
  const isWix = doc.querySelector('[data-wix-id]') || doc.URL.includes('.wixsite.com') || doc.URL.includes('.wix.com');
  if (isWix) {
    // Wix has some accessibility features built-in
    const wixAccessibility = doc.querySelector('[data-wix-a11y]');
    if (wixAccessibility) passes.push("Wix accessibility features detected");
  }

  return { issues, passes, score: calcScore(issues) };
}

// ─── PERFORMANCE ───────────────────────────────────────────────

function scanPerformance(doc) {
  const issues = [];
  const passes = [];

  // Image sizes
  const images = doc.querySelectorAll("img");
  let noSize = 0;
  let noLazy = 0;
  let oversized = 0;
  images.forEach((img, i) => {
    if (!img.width && !img.height && !img.style.width && !img.getAttribute("width") && !img.getAttribute("height")) noSize++;
    if (i > 2 && !img.loading && img.loading !== "lazy") noLazy++;
    if (img.naturalWidth > 2000) oversized++;
  });
  if (noSize > 0) issues.push({ severity: "warning", message: `${noSize} image(s) missing explicit width/height (causes layout shift)` });
  if (noLazy > 0) issues.push({ severity: "warning", message: `${noLazy} below-fold image(s) not using lazy loading` });
  if (oversized > 0) issues.push({ severity: "warning", message: `${oversized} image(s) over 2000px wide (consider resizing)` });

  // Scripts
  const scripts = doc.querySelectorAll("script[src]");
  const blockingScripts = Array.from(scripts).filter((s) => !s.async && !s.defer && !s.type?.includes("module"));
  if (blockingScripts.length > 0) {
    issues.push({ severity: "warning", message: `${blockingScripts.length} render-blocking script(s) (missing async/defer)` });
  } else {
    passes.push("All external scripts use async/defer or modules");
  }
  passes.push(`${scripts.length} total external scripts`);

  // Stylesheets
  const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]');
  passes.push(`${stylesheets.length} external stylesheets`);
  if (stylesheets.length > 10) issues.push({ severity: "info", message: `${stylesheets.length} stylesheets loaded — consider consolidating` });

  // Inline styles
  const inlineStyles = doc.querySelectorAll("[style]");
  if (inlineStyles.length > 50) issues.push({ severity: "info", message: `${inlineStyles.length} elements with inline styles (consider CSS classes)` });

  // DOM size
  const allElements = doc.querySelectorAll("*");
  const domSize = allElements.length;
  if (domSize > 3000) issues.push({ severity: "warning", message: `Large DOM: ${domSize} elements (recommend < 1500)` });
  else if (domSize > 1500) issues.push({ severity: "info", message: `DOM has ${domSize} elements (acceptable but watch growth)` });
  else passes.push(`DOM size is good (${domSize} elements)`);

  // DOM depth
  let maxDepth = 0;
  function getDepth(el, depth) {
    if (depth > maxDepth) maxDepth = depth;
    if (depth < 32) {
      for (const child of el.children) getDepth(child, depth + 1);
    }
  }
  if (doc.body) {
    getDepth(doc.body, 0);
    if (maxDepth > 15) issues.push({ severity: "info", message: `Deep DOM nesting (${maxDepth} levels deep)` });
    else passes.push(`DOM depth is fine (${maxDepth} levels)`);
  }

  // Preload / prefetch hints
  const preloads = doc.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"]');
  if (preloads.length > 0) passes.push(`${preloads.length} resource hints (preload/prefetch/preconnect)`);
  else issues.push({ severity: "info", message: "No resource hints found (preload/prefetch/preconnect)" });

  // Third-party scripts
  const thirdParty = Array.from(scripts).filter((s) => {
    try { return s.src && new URL(s.src).hostname !== window.location.hostname; } catch { return false; }
  });
  if (thirdParty.length > 10) {
    issues.push({ severity: "warning", message: `${thirdParty.length} third-party scripts loaded` });
  }
  passes.push(`${thirdParty.length} third-party scripts`);

  // Wix-specific performance
  const isWix = doc.querySelector('[data-wix-id]') || doc.URL.includes('.wixsite.com') || doc.URL.includes('.wix.com');
  if (isWix) {
    passes.push("Wix site - performance optimizations handled by Wix");
    // Check for Wix optimization features
    const wixStatic = doc.querySelector('script[src*="static.wixstatic.com"]');
    if (wixStatic) passes.push("Wix static CDN detected");
  }

  return { issues, passes, score: calcScore(issues) };
}

// ─── SECURITY ──────────────────────────────────────────────────

function scanSecurity(doc) {
  const issues = [];
  const passes = [];

  // HTTPS
  if (window.location.protocol !== "https:") {
    issues.push({ severity: "critical", message: "Page not served over HTTPS" });
  } else {
    passes.push("Page served over HTTPS");
  }

  // Mixed content
  const allSrcs = doc.querySelectorAll("[src], [href]");
  let mixedContent = 0;
  allSrcs.forEach((el) => {
    const url = el.src || el.href;
    if (url && url.startsWith("http://") && !url.includes("localhost")) mixedContent++;
  });
  if (mixedContent > 0) issues.push({ severity: "critical", message: `${mixedContent} mixed content resource(s) loaded over HTTP` });
  else passes.push("No mixed content detected");

  // External links without rel="noopener"
  const externalLinks = Array.from(doc.querySelectorAll('a[target="_blank"]'));
  const unsafeLinks = externalLinks.filter((a) => {
    const rel = a.getAttribute("rel") || "";
    return !rel.includes("noopener");
  });
  if (unsafeLinks.length > 0) {
    issues.push({ severity: "warning", message: `${unsafeLinks.length} external link(s) with target="_blank" missing rel="noopener"` });
  } else if (externalLinks.length > 0) {
    passes.push("All target=\"_blank\" links have rel=\"noopener\"");
  }

  // Content Security Policy
  const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!csp) issues.push({ severity: "info", message: "No Content Security Policy meta tag (may be set via header)" });
  else passes.push("Content Security Policy meta tag found");

  // Inline event handlers
  const inlineHandlers = doc.querySelectorAll("[onclick], [onload], [onerror], [onmouseover], [onfocus], [onblur]");
  if (inlineHandlers.length > 0) {
    issues.push({ severity: "info", message: `${inlineHandlers.length} inline event handler(s) found (prefer addEventListener)` });
  }

  // Forms
  const forms = doc.querySelectorAll("form");
  let insecureForms = 0;
  forms.forEach((f) => {
    const action = f.getAttribute("action");
    if (action && action.startsWith("http://")) insecureForms++;
  });
  if (insecureForms > 0) issues.push({ severity: "critical", message: `${insecureForms} form(s) submit to HTTP (insecure)` });

  // Password inputs
  const pwInputs = doc.querySelectorAll('input[type="password"]');
  pwInputs.forEach((input) => {
    if (!input.getAttribute("autocomplete")) {
      issues.push({ severity: "info", message: "Password input missing autocomplete attribute" });
    }
  });

  return { issues, passes, score: calcScore(issues) };
}

// ─── CONTENT QUALITY ───────────────────────────────────────────

function scanContent(doc) {
  const issues = [];
  const passes = [];

  // Text content length
  const bodyText = doc.body?.innerText || "";
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 100) issues.push({ severity: "warning", message: `Very little text content (${wordCount} words)` });
  else if (wordCount < 300) issues.push({ severity: "info", message: `Thin content (${wordCount} words — consider 300+ for SEO)` });
  else passes.push(`Good content length (${wordCount} words)`);

  // Broken image detection
  const images = doc.querySelectorAll("img");
  let brokenImages = 0;
  images.forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.src) brokenImages++;
  });
  if (brokenImages > 0) issues.push({ severity: "critical", message: `${brokenImages} broken/failed image(s) detected` });
  else if (images.length > 0) passes.push(`All ${images.length} images loaded successfully`);

  // Empty links
  const emptyLinks = doc.querySelectorAll('a[href=""], a[href="#"], a:not([href])');
  if (emptyLinks.length > 0) issues.push({ severity: "warning", message: `${emptyLinks.length} empty or hash-only link(s)` });

  // Duplicate IDs
  const allIds = doc.querySelectorAll("[id]");
  const idMap = {};
  let dupes = 0;
  allIds.forEach((el) => {
    if (idMap[el.id]) dupes++;
    idMap[el.id] = true;
  });
  if (dupes > 0) issues.push({ severity: "warning", message: `${dupes} duplicate ID(s) found in DOM` });
  else passes.push("No duplicate IDs");

  // iframes
  const iframes = doc.querySelectorAll("iframe");
  if (iframes.length > 0) {
    const noTitle = Array.from(iframes).filter((f) => !f.title);
    if (noTitle.length > 0) issues.push({ severity: "warning", message: `${noTitle.length} iframe(s) missing title attribute` });
    passes.push(`${iframes.length} iframe(s) found`);
  }

  // Favicon
  const favicon = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (!favicon) issues.push({ severity: "warning", message: "No favicon found" });
  else passes.push("Favicon present");

  // Wix-specific content
  const isWix = doc.querySelector('[data-wix-id]') || doc.URL.includes('.wixsite.com') || doc.URL.includes('.wix.com');
  if (isWix) {
    // Wix typically handles SEO-friendly URLs
    const wixUrl = doc.URL;
    if (wixUrl.includes('/~') || wixUrl.includes('?__rc=')) {
      issues.push({ severity: "info", message: "Wix URL may not be SEO-friendly (contains tracking params)" });
    } else {
      passes.push("Wix SEO-friendly URL structure");
    }
  }

  return { issues, passes, score: calcScore(issues) };
}

// ─── MOBILE ────────────────────────────────────────────────────

function scanMobile(doc) {
  const issues = [];
  const passes = [];

  // Viewport meta
  const viewport = doc.querySelector('meta[name="viewport"]');
  if (!viewport) {
    issues.push({ severity: "critical", message: "Missing viewport meta tag" });
  } else {
    const content = viewport.content;
    if (!content.includes("width=device-width")) {
      issues.push({ severity: "warning", message: "Viewport missing width=device-width" });
    } else {
      passes.push("Viewport correctly configured");
    }
    if (content.includes("user-scalable=no") || content.includes("maximum-scale=1")) {
      issues.push({ severity: "warning", message: "Viewport disables user zoom (accessibility concern)" });
    }
  }

  // Touch targets
  const clickables = doc.querySelectorAll("a, button, input, select, textarea");
  let tooSmall = 0;
  clickables.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
      tooSmall++;
    }
  });
  if (tooSmall > 10) issues.push({ severity: "warning", message: `${tooSmall} interactive elements smaller than 44x44px (touch target size)` });
  else if (tooSmall > 0) issues.push({ severity: "info", message: `${tooSmall} small touch targets detected` });
  else passes.push("Touch targets are adequately sized");

  // Horizontal overflow
  const bodyWidth = doc.body?.scrollWidth || 0;
  const viewportWidth = window.innerWidth;
  if (bodyWidth > viewportWidth + 10) {
    issues.push({ severity: "warning", message: `Page has horizontal overflow (${bodyWidth}px body vs ${viewportWidth}px viewport)` });
  } else {
    passes.push("No horizontal overflow");
  }

  // Font size
  const textElements = doc.querySelectorAll("p, li, span, a, td, th");
  let tooSmallText = 0;
  textElements.forEach((el) => {
    const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
    if (fontSize < 12 && el.textContent.trim().length > 0) tooSmallText++;
  });
  if (tooSmallText > 5) issues.push({ severity: "warning", message: `${tooSmallText} text elements with font-size < 12px` });
  else passes.push("Text sizes are mobile-friendly");

  return { issues, passes, score: calcScore(issues) };
}

// ─── BEST PRACTICES ────────────────────────────────────────────

function scanBestPractices(doc) {
  const issues = [];
  const passes = [];

  // Doctype
  if (!doc.doctype) issues.push({ severity: "warning", message: "Missing DOCTYPE declaration" });
  else passes.push("DOCTYPE present");

  // Charset
  const charset = doc.querySelector('meta[charset]');
  if (!charset) issues.push({ severity: "warning", message: "Missing charset declaration" });
  else passes.push(`Charset: ${charset.getAttribute("charset")}`);

  // Deprecated HTML tags
  const deprecated = doc.querySelectorAll("font, center, marquee, blink, big, strike, tt, frame, frameset, applet");
  if (deprecated.length > 0) {
    issues.push({ severity: "warning", message: `${deprecated.length} deprecated HTML element(s) found` });
  }

  // Empty tags
  const emptyTags = doc.querySelectorAll("p:empty, div:empty, span:empty, h1:empty, h2:empty, h3:empty");
  if (emptyTags.length > 10) {
    issues.push({ severity: "info", message: `${emptyTags.length} empty HTML elements (cleanup recommended)` });
  }

  // Print stylesheet
  const printCSS = doc.querySelector('link[media="print"]');
  if (!printCSS) issues.push({ severity: "info", message: "No print stylesheet" });
  else passes.push("Print stylesheet present");

  // 404 detection
  const bodyText = doc.body?.innerText?.toLowerCase() || "";
  if (bodyText.includes("404") && bodyText.includes("not found")) {
    issues.push({ severity: "critical", message: "Page appears to be a 404 error page" });
  }

  // Web app manifest
  const manifest = doc.querySelector('link[rel="manifest"]');
  if (!manifest) issues.push({ severity: "info", message: "No web app manifest" });
  else passes.push("Web app manifest present");

  // Apple touch icon
  const touchIcon = doc.querySelector('link[rel="apple-touch-icon"]');
  if (!touchIcon) issues.push({ severity: "info", message: "No Apple touch icon" });
  else passes.push("Apple touch icon present");

  // Wix-specific best practices
  const isWix = doc.querySelector('[data-wix-id]') || doc.URL.includes('.wixsite.com') || doc.URL.includes('.wix.com');
  if (isWix) {
    passes.push("Wix site - managed platform");
    // Check for Wix custom domain
    if (!doc.URL.includes('.wixsite.com') && !doc.URL.includes('.wix.com')) {
      passes.push("Custom domain detected (good for SEO)");
    }
  }

  return { issues, passes, score: calcScore(issues) };
}

// ─── SCORING ───────────────────────────────────────────────────

function calcScore(issues) {
  let score = 100;
  issues.forEach((issue) => {
    if (issue.severity === "critical") score -= 15;
    else if (issue.severity === "warning") score -= 7;
    else if (issue.severity === "info") score -= 2;
  });
  return Math.max(0, Math.min(100, score));
}
