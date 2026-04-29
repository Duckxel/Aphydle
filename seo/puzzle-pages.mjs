// Emits per-puzzle SEO shells at build time.
//
// For every past puzzle pulled from aphydle.daily_log we generate a static
// HTML file at /puzzle/<n>/index.html, plus a /puzzle/index.html archive
// landing page. Each shell:
//
//   - Reuses the built index.html (so the hashed /assets script tag and
//     CSS bundle still resolve).
//   - Overrides <title>, <meta description>, <link canonical>, OG/Twitter
//     URLs and titles, JSON-LD identifiers and breadcrumbs.
//   - Ships a visible, server-rendered fragment inside #root so crawlers
//     get unique, indexable body content per URL.
//   - Reveals nothing about the answer — only the puzzle number and date.
//
// React's createRoot wipes #root on mount, so end users never see the
// fallback fragment once the JS bundle loads — they go straight into the
// SPA, which then routes /puzzle and /puzzle/<n> as it normally does.

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function escHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseUtcDate(iso) {
  // iso = "YYYY-MM-DD"
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

function formatLong(iso) {
  const d = parseUtcDate(iso);
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatShort(iso) {
  const d = parseUtcDate(iso);
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Replace the contents of <head> tags we want to override. We do not touch
// the rest of <head> (preconnects, fonts, viewport, theme-color, icon, etc.)
// — those are correct as-is from the base index.html.
function rewriteHead(html, { title, description, canonicalUrl, ogTitle, ogDescription, ogUrl, ldJson }) {
  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(title)}</title>`);

  out = out.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${escHtml(description)}" />`,
  );

  out = out.replace(
    /<link\s+rel="canonical"[\s\S]*?\/>/,
    `<link rel="canonical" href="${escHtml(canonicalUrl)}" />`,
  );

  out = out.replace(
    /<meta\s+property="og:title"[\s\S]*?\/>/,
    `<meta property="og:title" content="${escHtml(ogTitle)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${escHtml(ogDescription)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:url"[\s\S]*?\/>/,
    `<meta property="og:url" content="${escHtml(ogUrl)}" />`,
  );

  out = out.replace(
    /<meta\s+name="twitter:title"[\s\S]*?\/>/,
    `<meta name="twitter:title" content="${escHtml(ogTitle)}" />`,
  );
  out = out.replace(
    /<meta\s+name="twitter:description"[\s\S]*?\/>/,
    `<meta name="twitter:description" content="${escHtml(ogDescription)}" />`,
  );

  // Replace the entire JSON-LD <script> with a per-page graph.
  out = out.replace(
    /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${ldJson}</script>`,
  );

  return out;
}

function rewriteBody(html, fragment) {
  return html.replace(
    /<div id="root">[\s\S]*?<\/div>/,
    `<div id="root">${fragment}</div>`,
  );
}

function shellStyle() {
  // Inline styles only — these shells must render identically before the
  // CSS bundle loads. Kept intentionally minimal: no fonts, no images, no
  // colours that depend on theme variables.
  return [
    "max-width:720px",
    "margin:3rem auto",
    "padding:0 1.25rem",
    "font-family:system-ui,-apple-system,Segoe UI,sans-serif",
    "line-height:1.55",
    "color:#1a1814",
  ].join(";");
}

function puzzleFragment({ puzzleNo, puzzleDate, prev, next, archiveUrl, homeUrl }) {
  const longDate = formatLong(puzzleDate);
  const shortDate = formatShort(puzzleDate);
  const links = [];
  if (prev) {
    links.push(
      `<a href="/puzzle/${prev.puzzleNo}/" rel="prev">&larr; Puzzle #${prev.puzzleNo} (${escHtml(formatShort(prev.puzzleDate))})</a>`,
    );
  }
  if (next) {
    links.push(
      `<a href="/puzzle/${next.puzzleNo}/" rel="next">Puzzle #${next.puzzleNo} (${escHtml(formatShort(next.puzzleDate))}) &rarr;</a>`,
    );
  }
  return `
    <main style="${shellStyle()}">
      <p style="opacity:.7;font-size:.9em;margin:0 0 .25rem">
        <a href="${escHtml(homeUrl)}">Aphydle</a> &nbsp;·&nbsp;
        <a href="${escHtml(archiveUrl)}">Archive</a> &nbsp;·&nbsp;
        Puzzle #${puzzleNo}
      </p>
      <h1 style="margin:0 0 .5rem;font-size:1.6em">Aphydle Puzzle #${puzzleNo} &mdash; ${escHtml(longDate)}</h1>
      <p>
        This is the replay page for the Aphydle daily plant puzzle from
        <strong>${escHtml(longDate)}</strong> (puzzle number ${puzzleNo}).
        Aphydle is a free daily plant guessing game: identify the mystery
        houseplant in ten attempts, with attribute hints and a pixelated
        mosaic that clears with every wrong guess.
      </p>
      <p>
        Loading the puzzle interface&hellip; If the game does not appear,
        please <a href="${escHtml(homeUrl)}">open the home page</a> and
        select puzzle #${puzzleNo} from the Archive.
      </p>
      <h2 style="font-size:1.1em;margin-top:1.5rem">How Aphydle works</h2>
      <ul>
        <li>One mystery plant per day, ten guesses, pixelated image clears as you go.</li>
        <li>Each guess is graded attribute-by-attribute against the answer (family, habitat, growth form, foliage, light, native region, toxicity).</li>
        <li>A new text hint is unlocked at every attempt from one through nine.</li>
        <li>Already-played daily puzzles are locked from replay; archive puzzles you skipped remain replayable.</li>
      </ul>
      ${
        links.length
          ? `<nav style="margin-top:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;font-size:.95em">${links.join("")}</nav>`
          : ""
      }
      <p style="margin-top:1.5rem;font-size:.9em;opacity:.7">
        Permalink: <code>/puzzle/${puzzleNo}/</code> &nbsp;·&nbsp; ${escHtml(shortDate)}
      </p>
    </main>
  `.trim();
}

function archiveFragment({ puzzles, homeUrl }) {
  const items = puzzles
    .slice()
    .reverse()
    .map(
      (p) =>
        `<li><a href="/puzzle/${p.puzzleNo}/">Puzzle #${p.puzzleNo}</a> &mdash; ${escHtml(formatLong(p.puzzleDate))}</li>`,
    )
    .join("");
  const total = puzzles.length;
  return `
    <main style="${shellStyle()}">
      <p style="opacity:.7;font-size:.9em;margin:0 0 .25rem">
        <a href="${escHtml(homeUrl)}">Aphydle</a> &nbsp;·&nbsp; Archive
      </p>
      <h1 style="margin:0 0 .5rem;font-size:1.6em">Aphydle Archive &mdash; All Past Daily Plant Puzzles</h1>
      <p>
        Browse and replay every past Aphydle daily plant puzzle.
        Aphydle is a free daily plant guessing game: identify the mystery
        plant in ten attempts. The archive currently lists
        <strong>${total} puzzle${total === 1 ? "" : "s"}</strong>; a new
        puzzle is added every day at UTC midnight.
      </p>
      <p>
        Loading the archive interface&hellip; If the game does not appear,
        please <a href="${escHtml(homeUrl)}">open the home page</a> and
        tap the Archive button.
      </p>
      ${
        total === 0
          ? "<p><em>No past puzzles yet &mdash; check back tomorrow.</em></p>"
          : `<h2 style="font-size:1.1em;margin-top:1.5rem">Past puzzles (newest first)</h2>
             <ul style="line-height:1.9;padding-left:1.25rem">${items}</ul>`
      }
    </main>
  `.trim();
}

function puzzleLdJson({ puzzleNo, puzzleDate, siteUrl, ogImage, canonicalUrl, prev, next }) {
  const longDate = formatLong(puzzleDate);
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: `Aphydle Puzzle #${puzzleNo} — ${longDate}`,
      isPartOf: { "@id": `${siteUrl}/#website` },
      datePublished: puzzleDate,
      inLanguage: "en",
      primaryImageOfPage: { "@type": "ImageObject", url: ogImage },
      breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Aphydle", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Archive", item: `${siteUrl}/puzzle/` },
        { "@type": "ListItem", position: 3, name: `Puzzle #${puzzleNo}`, item: canonicalUrl },
      ],
    },
    {
      "@type": "CreativeWork",
      "@id": `${canonicalUrl}#puzzle`,
      name: `Aphydle Puzzle #${puzzleNo}`,
      url: canonicalUrl,
      datePublished: puzzleDate,
      inLanguage: "en",
      isAccessibleForFree: true,
      isPartOf: { "@id": `${siteUrl}/#game` },
      position: puzzleNo,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "Aphydle",
      inLanguage: "en",
    },
  ];
  const json = { "@context": "https://schema.org", "@graph": graph };
  // prev/next are advisory — encoded as separate WebPage relations.
  if (prev) graph[0].previousItem = `${siteUrl}/puzzle/${prev.puzzleNo}/`;
  if (next) graph[0].nextItem = `${siteUrl}/puzzle/${next.puzzleNo}/`;
  return JSON.stringify(json);
}

function archiveLdJson({ siteUrl, canonicalUrl, puzzles }) {
  const items = puzzles
    .slice()
    .reverse()
    .map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl}/puzzle/${p.puzzleNo}/`,
      name: `Aphydle Puzzle #${p.puzzleNo} — ${formatShort(p.puzzleDate)}`,
    }));
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: "Aphydle Archive — Past Daily Plant Puzzles",
        isPartOf: { "@id": `${siteUrl}/#website` },
        inLanguage: "en",
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
        mainEntity: { "@id": `${canonicalUrl}#list` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Aphydle", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Archive", item: canonicalUrl },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${canonicalUrl}#list`,
        name: "Past Aphydle puzzles",
        numberOfItems: items.length,
        itemListElement: items,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: "Aphydle",
        inLanguage: "en",
      },
    ],
  };
  return JSON.stringify(json);
}

export function buildPuzzleShell({ baseHtml, puzzleNo, puzzleDate, prev, next, siteUrl, ogImage }) {
  const canonicalUrl = `${siteUrl}/puzzle/${puzzleNo}/`;
  const longDate = formatLong(puzzleDate);
  const title = `Aphydle Puzzle #${puzzleNo} — ${longDate} | Daily Plant Guessing Game`;
  const description =
    `Replay Aphydle puzzle #${puzzleNo} from ${longDate}. Identify the mystery plant in ten guesses — a free daily plant guessing game with attribute clues and a pixelated mosaic that clears as you go.`;
  const ogTitle = `Aphydle Puzzle #${puzzleNo} — ${longDate}`;
  const ogDescription = `Daily plant guessing game: replay puzzle #${puzzleNo} from ${longDate}. Ten guesses, attribute hints, no answer spoilers.`;
  const fragment = puzzleFragment({
    puzzleNo,
    puzzleDate,
    prev,
    next,
    archiveUrl: `${siteUrl}/puzzle/`,
    homeUrl: `${siteUrl}/`,
  });
  const ldJson = puzzleLdJson({ puzzleNo, puzzleDate, siteUrl, ogImage, canonicalUrl, prev, next });
  const withHead = rewriteHead(baseHtml, {
    title,
    description,
    canonicalUrl,
    ogTitle,
    ogDescription,
    ogUrl: canonicalUrl,
    ldJson,
  });
  return rewriteBody(withHead, fragment);
}

export function buildArchiveShell({ baseHtml, puzzles, siteUrl, ogImage }) {
  const canonicalUrl = `${siteUrl}/puzzle/`;
  const title = `Aphydle Archive — Past Daily Plant Puzzles`;
  const total = puzzles.length;
  const description =
    total > 0
      ? `Browse and replay all ${total} past Aphydle daily plant puzzles. A new botanical guessing puzzle is added every day at UTC midnight.`
      : `Browse and replay past Aphydle daily plant puzzles. A new botanical guessing puzzle is added every day at UTC midnight.`;
  const fragment = archiveFragment({ puzzles, homeUrl: `${siteUrl}/` });
  const ldJson = archiveLdJson({ siteUrl, canonicalUrl, puzzles });
  const withHead = rewriteHead(baseHtml, {
    title,
    description,
    canonicalUrl,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ldJson,
  });
  return rewriteBody(withHead, fragment);
}
