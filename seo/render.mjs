// Static HTML templates for the past-puzzle archive.
//
// Each historical puzzle gets a permalink at `/puzzle/<n>/` plus a roll-up
// at `/puzzle/`. The pages are server-rendered HTML so search engines can
// index them without executing the React app, and they exist purely as a
// reveal + recap surface — gameplay still happens at `/`.
//
// The templates intentionally keep plant content thin (one line about
// family + native region, an optional one-paragraph fact). Care guides
// remain Aphylia's responsibility.

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function clip(s, max = 155) {
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:]$/, "") + "…";
}

// "WED 26 APR 2026" — verbose enough to read in a SERP snippet.
function formatDateLong(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const dow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()];
  const month = ["January","February","March","April","May","June","July","August","September","October","November","December"][d.getUTCMonth()];
  return `${dow}, ${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleString("en", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function statsLine(dist) {
  if (!dist) return "";
  const wins = (dist.bucket_1||0)+(dist.bucket_2||0)+(dist.bucket_3||0)+(dist.bucket_4||0)+(dist.bucket_5||0)+(dist.bucket_6||0)+(dist.bucket_7||0)+(dist.bucket_8||0)+(dist.bucket_9||0)+(dist.bucket_10||0);
  const total = dist.total_played || (wins + (dist.bucket_lost || 0));
  if (!total) return "";
  const solveRate = Math.round((wins / total) * 100);
  let avg = null;
  if (wins > 0) {
    const sum =
      1*(dist.bucket_1||0)+2*(dist.bucket_2||0)+3*(dist.bucket_3||0)+
      4*(dist.bucket_4||0)+5*(dist.bucket_5||0)+6*(dist.bucket_6||0)+
      7*(dist.bucket_7||0)+8*(dist.bucket_8||0)+9*(dist.bucket_9||0)+
      10*(dist.bucket_10||0);
    avg = (sum / wins).toFixed(1);
  }
  if (avg) {
    return `${total.toLocaleString("en")} players attempted this puzzle. ${solveRate}% solved it, with an average win in ${avg} guesses.`;
  }
  return `${total.toLocaleString("en")} players attempted this puzzle. ${solveRate}% solved it.`;
}

function pageHead({ title, description, canonical, ogImage, ldJson, robots = "index,follow,max-image-preview:large,max-snippet:-1" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0F0F0F" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#E8E2D0" media="(prefers-color-scheme: light)" />
  <meta name="color-scheme" content="dark light" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="${escapeHtml(robots)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Aphydle" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='%230F0F0F'/><path d='M16 44c0-14 12-24 32-26-2 20-12 32-26 32-3 0-6-2-6-6z' fill='%2300D26A'/><path d='M18 46c10-8 18-16 28-22' stroke='%230F0F0F' stroke-width='2' stroke-linecap='round' fill='none'/></svg>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg:#0F0F0F; --bg-soft:#1A1A1A; --fg:#E8E2D0; --muted:#8A8A85; --accent:#00D26A; --border:#2A2A2A;
            --mono:'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace;
            --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    @media (prefers-color-scheme: light) {
      :root { --bg:#E8E2D0; --bg-soft:#F4EFE0; --fg:#1A1814; --muted:#6B6760; --accent:#007F3F; --border:#D4CDB8; }
    }
    *,*::before,*::after { box-sizing: border-box; }
    html, body { margin: 0; }
    body { background: var(--bg); color: var(--fg); font-family: var(--sans); line-height: 1.6; -webkit-font-smoothing: antialiased; }
    a { color: var(--accent); text-underline-offset: 3px; }
    a:hover { text-decoration: none; }
    header.site { border-bottom: 1px solid var(--border); padding: 1rem 1.25rem; background: var(--bg); }
    header.site .inner { max-width: 760px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    header.site a.brand { font-family: var(--mono); font-weight: 700; font-size: 1rem; color: var(--fg); text-decoration: none; }
    header.site nav a { font-family: var(--mono); font-size: 0.85rem; margin-left: 1.25rem; }
    main { max-width: 760px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    h1 { font-family: var(--mono); font-weight: 700; font-size: clamp(1.6rem, 4vw, 2.1rem); letter-spacing: -0.01em; margin: 0 0 0.25rem; }
    h2 { font-family: var(--mono); font-weight: 700; font-size: 0.85rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.12em; margin: 2rem 0 0.6rem; }
    p { margin: 0 0 1rem; }
    .puzzle-no { font-family: var(--mono); color: var(--muted); font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 0.4rem; }
    .answer { font-family: var(--mono); font-weight: 700; font-size: 1.4rem; margin: 0.4rem 0 0.2rem; color: var(--fg); }
    .sci { color: var(--muted); font-style: italic; margin: 0 0 1.5rem; font-family: var(--mono); font-size: 0.95rem; }
    nav.crumbs { font-size: 0.78rem; color: var(--muted); margin-bottom: 1rem; font-family: var(--mono); }
    nav.crumbs ol { list-style: none; padding: 0; margin: 0; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    nav.crumbs li { display: flex; gap: 0.5rem; align-items: center; }
    nav.crumbs li:not(:last-child)::after { content: "›"; color: var(--border); }
    nav.crumbs a { color: var(--muted); text-decoration: none; }
    nav.crumbs a:hover { color: var(--accent); }
    .hero { display: block; width: 100%; aspect-ratio: 16/10; object-fit: cover; border-radius: 4px; background: var(--bg-soft); border: 1px solid var(--border); margin-bottom: 1.5rem; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; padding: 0.85rem 1.1rem; background: var(--bg-soft); border: 1px solid var(--border); border-radius: 4px; font-family: var(--mono); font-size: 0.82rem; margin: 0 0 1rem; }
    .meta-row .label { color: var(--muted); margin-right: 0.4rem; }
    .cta-block { margin: 2rem 0; padding: 1.25rem 1.5rem; background: var(--bg-soft); border: 1px solid var(--border); border-radius: 4px; }
    .cta-block p { margin: 0 0 1rem; }
    .cta { display: inline-block; background: var(--accent); color: #0F0F0F; padding: 0.7rem 1.4rem; border-radius: 4px; font-family: var(--mono); font-weight: 700; text-decoration: none; letter-spacing: 0.04em; font-size: 0.92rem; }
    .cta:hover { filter: brightness(1.05); }
    nav.adj { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 2rem 0 0; }
    nav.adj a { display: block; padding: 0.85rem 1rem; background: var(--bg-soft); border: 1px solid var(--border); border-radius: 4px; color: var(--fg); text-decoration: none; font-family: var(--mono); font-size: 0.85rem; }
    nav.adj a:hover { color: var(--accent); border-color: var(--accent); }
    nav.adj .dir { display: block; color: var(--muted); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 0.25rem; }
    nav.adj a.next { text-align: right; }
    nav.adj a.next .dir { text-align: right; }
    ul.tile-grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.6rem; }
    ul.tile-grid li { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 4px; }
    ul.tile-grid a { display: block; padding: 0.85rem 1rem; color: var(--fg); text-decoration: none; }
    ul.tile-grid a:hover { color: var(--accent); border-color: var(--accent); }
    ul.tile-grid .pn { font-family: var(--mono); color: var(--muted); font-size: 0.72rem; letter-spacing: 0.12em; }
    ul.tile-grid .name { display: block; font-family: var(--mono); font-weight: 700; font-size: 0.92rem; margin-top: 0.25rem; }
    ul.tile-grid .date { display: block; color: var(--muted); font-size: 0.78rem; margin-top: 0.2rem; font-family: var(--mono); }
    footer.site { border-top: 1px solid var(--border); padding: 1.5rem 1.25rem; color: var(--muted); font-size: 0.82rem; font-family: var(--mono); }
    footer.site .inner { max-width: 760px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
    footer.site a { color: var(--muted); }
  </style>
${ldJson ? `  <script type="application/ld+json">${ldJson}</script>` : ""}
</head>`;
}

function siteChrome(base) {
  return {
    header: `<header class="site"><div class="inner">
  <a class="brand" href="${base}">Aphydle</a>
  <nav><a href="${base}">Play today</a><a href="${base}puzzle/">Archive</a></nav>
</div></header>`,
    footer: `<footer class="site"><div class="inner">
  <span>Aphydle — daily plant guessing game</span>
  <span><a href="${base}">Play today</a> · <a href="${base}puzzle/">All puzzles</a></span>
</div></footer>`,
  };
}

export function renderPuzzlePage({ puzzle, prev, next, siteUrl, base, ogImage }) {
  const canonical = `${siteUrl}${base}puzzle/${puzzle.puzzleNo}/`;
  const dateLong = formatDateLong(puzzle.puzzleDate);
  const dateShort = formatDateShort(puzzle.puzzleDate);
  const sciSuffix = puzzle.scientificName && puzzle.scientificName !== puzzle.commonName
    ? ` (${puzzle.scientificName})`
    : "";
  const title = `Aphydle Puzzle #${puzzle.puzzleNo} Answer — ${dateShort} | ${puzzle.commonName}`;
  const description = clip(
    `Answer to Aphydle puzzle #${puzzle.puzzleNo} (${dateLong}): ${puzzle.commonName}${sciSuffix}. Recap, plant fact, and link to today's puzzle.`,
  );
  const heroImage = puzzle.imageUrl || ogImage;
  const stats = statsLine(puzzle.distribution);
  const { header, footer } = siteChrome(base);

  const metaCells = [
    puzzle.family && `<span><span class="label">Family</span>${escapeHtml(puzzle.family)}</span>`,
    puzzle.nativeRegion && puzzle.nativeRegion.length > 0 && `<span><span class="label">Native to</span>${escapeHtml(puzzle.nativeRegion.join(", "))}</span>`,
    `<span><span class="label">Date</span>${escapeHtml(dateShort)}</span>`,
  ].filter(Boolean).join("");

  const ldJson = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": `Aphydle Puzzle #${puzzle.puzzleNo} Answer — ${puzzle.commonName}`,
      "description": description,
      "datePublished": `${puzzle.puzzleDate}T00:00:00Z`,
      "dateModified": `${puzzle.puzzleDate}T00:00:00Z`,
      "image": heroImage,
      "url": canonical,
      "inLanguage": "en",
      "isPartOf": { "@type": "WebSite", "@id": `${siteUrl}/#website` },
      "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
      "publisher": { "@type": "Organization", "name": "Aphylia", "url": `${siteUrl}/` },
      "about": { "@type": "Game", "@id": `${siteUrl}/#game`, "name": "Aphydle" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}${base}` },
        { "@type": "ListItem", "position": 2, "name": "Puzzle archive", "item": `${siteUrl}${base}puzzle/` },
        { "@type": "ListItem", "position": 3, "name": `Puzzle #${puzzle.puzzleNo}` },
      ],
    },
  ]);

  return `${pageHead({ title, description, canonical, ogImage: heroImage, ldJson })}
<body>
${header}
<main>
  <article>
    <nav class="crumbs" aria-label="Breadcrumb"><ol>
      <li><a href="${base}">Aphydle</a></li>
      <li><a href="${base}puzzle/">Puzzle archive</a></li>
      <li>Puzzle #${puzzle.puzzleNo}</li>
    </ol></nav>
    <p class="puzzle-no">Aphydle · No. ${puzzle.puzzleNo} · ${escapeHtml(dateLong)}</p>
    <h1>Puzzle #${puzzle.puzzleNo} Answer</h1>
${heroImage ? `    <img class="hero" src="${escapeHtml(heroImage)}" alt="${escapeHtml(puzzle.commonName)}${puzzle.scientificName ? " (" + escapeHtml(puzzle.scientificName) + ")" : ""}" loading="lazy" decoding="async" />` : ""}
    <p class="answer">${escapeHtml(puzzle.commonName)}</p>
${puzzle.scientificName && puzzle.scientificName !== puzzle.commonName ? `    <p class="sci">${escapeHtml(puzzle.scientificName)}</p>` : ""}
    <h2>The reveal</h2>
    <p>The answer to Aphydle puzzle #${puzzle.puzzleNo}, played on <strong>${escapeHtml(dateLong)}</strong>, was <strong>${escapeHtml(puzzle.commonName)}</strong>${sciSuffix ? `, scientifically <em>${escapeHtml(puzzle.scientificName)}</em>` : ""}.</p>
${metaCells ? `    <div class="meta-row">${metaCells}</div>` : ""}
${puzzle.fact ? `    <h2>Plant fact</h2>\n    <p>${escapeHtml(puzzle.fact)}</p>` : ""}
${stats ? `    <h2>How players did</h2>\n    <p>${escapeHtml(stats)}</p>` : ""}
    <div class="cta-block">
      <p>A new mystery plant goes live every day at UTC midnight. Want to take the streak forward?</p>
      <a class="cta" href="${base}">Play today's puzzle</a>
    </div>
    <nav class="adj" aria-label="Adjacent puzzles">
${prev ? `      <a class="prev" href="${base}puzzle/${prev.puzzleNo}/"><span class="dir">← Previous</span>Puzzle #${prev.puzzleNo}</a>` : `      <span></span>`}
${next ? `      <a class="next" href="${base}puzzle/${next.puzzleNo}/"><span class="dir">Next →</span>Puzzle #${next.puzzleNo}</a>` : `      <span></span>`}
    </nav>
  </article>
</main>
${footer}
</body>
</html>
`;
}

export function renderPuzzleIndexPage({ puzzles, siteUrl, base, ogImage }) {
  const canonical = `${siteUrl}${base}puzzle/`;
  const total = puzzles.length;
  const title = `Aphydle Puzzle Archive — ${total} past plant puzzles | Aphydle`;
  const description = clip(
    `Browse every past Aphydle daily plant puzzle: ${total} puzzles with answers, dates, and recap pages. New puzzle live every UTC midnight.`,
  );
  const { header, footer } = siteChrome(base);

  // Newest first — reverse-chronological is what archive readers expect.
  const sorted = [...puzzles].sort((a, b) => b.puzzleNo - a.puzzleNo);

  const ldJson = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Aphydle puzzle archive",
      "description": description,
      "url": canonical,
      "isPartOf": { "@type": "WebSite", "@id": `${siteUrl}/#website` },
      "inLanguage": "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}${base}` },
        { "@type": "ListItem", "position": 2, "name": "Puzzle archive" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Aphydle puzzle archive",
      "url": canonical,
      "numberOfItems": total,
      "itemListElement": sorted.slice(0, 200).map((p, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `${siteUrl}${base}puzzle/${p.puzzleNo}/`,
        "name": `Puzzle #${p.puzzleNo} — ${p.commonName}`,
      })),
    },
  ]);

  const tiles = sorted
    .map(
      (p) => `      <li><a href="${base}puzzle/${p.puzzleNo}/">
        <span class="pn">No. ${p.puzzleNo}</span>
        <span class="name">${escapeHtml(p.commonName)}</span>
        <span class="date">${escapeHtml(formatDateShort(p.puzzleDate))}</span>
      </a></li>`,
    )
    .join("\n");

  return `${pageHead({ title, description, canonical, ogImage, ldJson })}
<body>
${header}
<main>
  <nav class="crumbs" aria-label="Breadcrumb"><ol>
    <li><a href="${base}">Aphydle</a></li>
    <li>Puzzle archive</li>
  </ol></nav>
  <h1>Aphydle Puzzle Archive</h1>
  <p class="puzzle-no">${total} past puzzle${total === 1 ? "" : "s"}</p>
  <p>Every Aphydle daily puzzle ever played, with answers, dates and recap pages. A new mystery plant goes live every day at UTC midnight — today's puzzle is excluded from this archive while it's still in play.</p>
  <div class="cta-block">
    <p>One mystery plant. Ten guesses. The pixelated mosaic clears as you go.</p>
    <a class="cta" href="${base}">Play today's Aphydle</a>
  </div>
  <h2>All past puzzles (newest first)</h2>
  <ul class="tile-grid">
${tiles}
  </ul>
</main>
${footer}
</body>
</html>
`;
}
