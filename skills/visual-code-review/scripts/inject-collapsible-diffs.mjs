#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error("Usage: inject-collapsible-diffs.mjs --repo PATH --input HTML [--output HTML] [--base REF]");
    }
    values[key.slice(2)] = value;
  }
  if (!values.repo || !values.input) {
    throw new Error("Both --repo and --input are required.");
  }
  return {
    repo: resolve(values.repo),
    input: resolve(values.input),
    output: resolve(values.output || values.input),
    base: values.base,
  };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function resolveBase(repo, explicitBase) {
  if (explicitBase) return explicitBase;

  const remotes = execFileSync("git", ["remote"], {
    cwd: repo,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean);
  const defaults = [];

  for (const remote of remotes) {
    try {
      defaults.push(
        execFileSync(
          "git",
          ["symbolic-ref", "--quiet", "--short", `refs/remotes/${remote}/HEAD`],
          { cwd: repo, encoding: "utf8" },
        ).trim(),
      );
    } catch {
      // A remote without a configured default branch is not a usable base.
    }
  }

  const unique = [...new Set(defaults)];
  if (unique.length !== 1) {
    throw new Error(
      "Could not determine one integration branch. Pass it explicitly with --base REF.",
    );
  }
  return unique[0];
}

function buildDiff(repo, baseRef) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "visual-review-index-"));
  const indexPath = join(temporaryDirectory, "index");
  const environment = { ...process.env, GIT_INDEX_FILE: indexPath };
  const git = (argumentsList) =>
    execFileSync("git", argumentsList, {
      cwd: repo,
      env: environment,
      encoding: "utf8",
      maxBuffer: 150 * 1024 * 1024,
    });

  try {
    const base = execFileSync("git", ["merge-base", baseRef, "HEAD"], {
      cwd: repo,
      encoding: "utf8",
    }).trim();
    git(["read-tree", "HEAD"]);
    git(["add", "-A", "--", "."]);

    const unified = git([
      "-c",
      "core.quotePath=false",
      "diff",
      "--cached",
      base,
      "--no-color",
      "--no-ext-diff",
      "--unified=3",
      "--src-prefix=a/",
      "--dst-prefix=b/",
    ]);
    const numstat = git(["diff", "--cached", "--numstat", base]);
    const changedPaths = git([
      "diff",
      "--cached",
      "--name-only",
      "-z",
      base,
    ]).split("\0").filter(Boolean);
    const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: repo,
      encoding: "utf8",
    }).trim();

    return { unified, numstat, commit, base, changedPaths };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function parseDiffSections(unified) {
  const sections = new Map();
  let currentPath = null;
  let currentLines = [];

  const flush = () => {
    if (currentPath) {
      sections.set(currentPath, currentLines.join("\n"));
    }
  };

  for (const line of unified.split("\n")) {
    const header = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (header) {
      flush();
      currentPath = header[2];
      currentLines = [line];
    } else if (currentPath) {
      currentLines.push(line);
    }
  }
  flush();
  return sections;
}

function parseStats(numstat) {
  const perFile = new Map();
  let additions = 0;
  let deletions = 0;

  for (const line of numstat.trim().split("\n")) {
    if (!line) continue;
    const [added, deleted, ...pathParts] = line.split("\t");
    const path = pathParts.join("\t");
    const add = added === "-" ? 0 : Number(added);
    const remove = deleted === "-" ? 0 : Number(deleted);
    additions += add;
    deletions += remove;
    perFile.set(path, { additions: add, deletions: remove });
  }

  return { perFile, additions, deletions };
}

function readBaseFile(repo, base, path) {
  try {
    const content = execFileSync("git", ["show", `${base}:${path}`], {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 150 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return content.includes("\0")
      ? "Binary file in the base commit. Text preview is unavailable."
      : content;
  } catch {
    return "File did not exist in the base commit.";
  }
}

function readWorkingFile(repo, path) {
  try {
    const filePath = resolve(repo, path);
    if (lstatSync(filePath).isSymbolicLink()) {
      return "Symbolic link in the working tree. Target content is not embedded.";
    }
    const content = readFileSync(filePath, "utf8");
    return content.includes("\0")
      ? "Binary file in the working tree. Text preview is unavailable."
      : content;
  } catch {
    return "File does not exist in the working tree.";
  }
}

function resolveLabel(label, paths) {
  const normalized = decodeHtml(label).trim();
  const labels = normalized.split(/\s+\+\s+/);
  const resolved = [];

  for (const fileLabel of labels) {
    const candidates = paths.filter(
      (path) => path === fileLabel || path.endsWith(`/${fileLabel}`),
    );
    if (candidates.length !== 1) {
      throw new Error(
        `Could not resolve feature file label "${fileLabel}". Candidates: ${candidates.join(", ") || "none"}`,
      );
    }
    resolved.push(candidates[0]);
  }

  return resolved;
}

function featureDetails(label, delta, description, resolvedPaths) {
  const primaryPath = resolvedPaths[0];
  const extraPaths = resolvedPaths.slice(1);
  const combined = extraPaths.length ? ` data-extra-files="${escapeHtml(extraPaths.join("|"))}"` : "";
  return `<li class="file-item">
        <details class="file-review" data-file="${escapeHtml(primaryPath)}"${combined}>
          <summary>
            <div class="file-summary-copy">
              <div class="file-line"><code>${label}</code><span class="delta">${delta}</span></div>
              <p>${description}</p>
            </div>
            <span class="expand-label" aria-hidden="true">Changed lines</span>
          </summary>
          <div class="file-view-toolbar" role="group" aria-label="Code view for ${escapeHtml(label)}">
            <button class="file-view-button active" type="button" data-file-view="diff" aria-pressed="true">Diff</button>
            <button class="file-view-button" type="button" data-file-view="before" aria-pressed="false">Before</button>
            <button class="file-view-button" type="button" data-file-view="after" aria-pressed="false">After</button>
          </div>
          <pre class="file-diff" aria-label="Changed lines for ${escapeHtml(label)}"><code></code></pre>
        </details>
      </li>`;
}

function injectStyles(html) {
  const styles = `
    .file-review { border: 1px solid var(--line); border-radius: 10px; background: color-mix(in srgb, var(--panel) 92%, transparent); overflow: clip; }
    .file-review summary { cursor: pointer; list-style: none; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 11px 12px; }
    .file-review summary::-webkit-details-marker { display: none; }
    .file-review summary::after { content: "+"; flex: 0 0 auto; color: var(--muted); font-size: 18px; line-height: 1; }
    .file-review[open] summary::after { content: "−"; }
    .file-summary-copy { min-width: 0; flex: 1; }
    .file-review summary p { margin: 5px 0 0; }
    .expand-label { color: var(--muted); font-size: 11px; white-space: nowrap; margin-left: auto; }
    .file-review[open] .expand-label { display: none; }
    .file-view-toolbar { display: none; align-items: center; gap: 6px; padding: 9px 12px; border-top: 1px solid var(--line); background: color-mix(in srgb, var(--surface-2) 82%, transparent); }
    .file-review[open] .file-view-toolbar { display: flex; }
    .file-view-button { border: 1px solid var(--line); border-radius: 7px; padding: 4px 9px; background: transparent; color: var(--muted); cursor: pointer; font: 11px/1.4 "IBM Plex Mono", ui-monospace, monospace; }
    .file-view-button:hover { color: var(--text); border-color: var(--accent); }
    .file-view-button.active { color: #fff; border-color: var(--accent); background: var(--accent); }
    .file-diff { margin: 0; padding: 12px 0; max-height: 520px; overflow: auto; border-top: 1px solid var(--line); background: #071019; color: #d8e1ea; font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; tab-size: 2; }
    .file-diff code { display: block; min-width: max-content; }
    .diff-line { display: block; padding: 0 14px; white-space: pre; }
    .diff-add { color: #a7f3d0; background: rgba(16, 185, 129, 0.13); }
    .diff-remove { color: #fecaca; background: rgba(239, 68, 68, 0.13); }
    .diff-hunk { color: #c4b5fd; background: rgba(139, 92, 246, 0.12); }
    .diff-meta { color: #93c5fd; }
    .source-line { color: #d8e1ea; }
    .source-line-number { display: inline-block; width: 54px; margin-right: 14px; color: #64748b; text-align: right; user-select: none; }
    .inventory-file-review { min-width: 330px; }
    .inventory-file-review summary { padding: 8px 10px; align-items: center; }
    .inventory-file-review .expand-label { margin-left: 12px; }
    .inventory-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .inventory-button { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--text); padding: 8px 10px; cursor: pointer; font: inherit; font-size: 12px; }
    .inventory-button:hover { border-color: var(--accent); }
    @media (max-width: 760px) {
      .expand-label { display: none; }
      .inventory-file-review { min-width: 260px; }
      .file-review summary { padding: 10px; }
    }
`;
  return html.replace("</style>", () => `${styles}\n  </style>`);
}

function injectBehavior(html, fileViewMap) {
  const safeJson = JSON.stringify(fileViewMap).replaceAll("<", "\\u003c");
  const data = `  <script type="application/json" id="fileViewData">${safeJson}</script>\n`;
  html = html.replace("  <script>", () => `${data}  <script>`);

  const behavior = `
    const fileViewData = JSON.parse(document.getElementById("fileViewData").textContent);

    function renderFileView(details, view = "diff") {
      const code = details.querySelector(".file-diff code");
      if (!code || code.dataset.view === view) return;
      const paths = [details.dataset.file, ...(details.dataset.extraFiles || "").split("|").filter(Boolean)];
      const value = paths
        .map((path) => {
          const file = fileViewData[path];
          const content = file?.[view] || \`No \${view} view is available for \${path}.\`;
          return paths.length > 1 ? \`===== \${path} =====\\n\${content}\` : content;
        })
        .join("\\n\\n");
      code.replaceChildren();
      const fragment = document.createDocumentFragment();
      value.split("\\n").forEach((line, index) => {
        const span = document.createElement("span");
        span.className = "diff-line";
        if (view === "diff") {
          if (line.startsWith("+") && !line.startsWith("+++")) span.classList.add("diff-add");
          else if (line.startsWith("-") && !line.startsWith("---")) span.classList.add("diff-remove");
          else if (line.startsWith("@@")) span.classList.add("diff-hunk");
          else if (/^(diff --git|index |new file mode|deleted file mode|--- |\\+\\+\\+ )/.test(line)) span.classList.add("diff-meta");
          span.textContent = \`\${line}\\n\`;
        } else {
          span.classList.add("source-line");
          const number = document.createElement("span");
          number.className = "source-line-number";
          number.textContent = String(index + 1);
          span.append(number, document.createTextNode(\`\${line}\\n\`));
        }
        fragment.appendChild(span);
      });
      code.appendChild(fragment);
      code.dataset.view = view;
      details.dataset.view = view;
      details.querySelectorAll(".file-view-button").forEach((button) => {
        const active = button.dataset.fileView === view;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    document.querySelectorAll("details.file-review").forEach((details) => {
      details.addEventListener("toggle", () => {
        if (details.open) renderFileView(details, details.dataset.view || "diff");
      });
      details.querySelectorAll(".file-view-button").forEach((button) => {
        button.addEventListener("click", () => {
          renderFileView(details, button.dataset.fileView);
        });
      });
    });

    document.getElementById("expandInventoryFiles")?.addEventListener("click", () => {
      document.querySelectorAll("#inventory details.file-review").forEach((details) => {
        details.open = true;
      });
    });

    document.getElementById("collapseInventoryFiles")?.addEventListener("click", () => {
      document.querySelectorAll("#inventory details.file-review").forEach((details) => {
        details.open = false;
      });
    });
`;
  return html.replace(
    '    const fileSearch = document.getElementById("fileSearch");',
    () => `${behavior}\n    const fileSearch = document.getElementById("fileSearch");`,
  );
}

function updateMetrics(html, stats, fileCount, testCount, commit) {
  const generatedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  html = html.replace(/<strong>\d+<\/strong><span>changed files<\/span>/, `<strong>${fileCount}</strong><span>changed files</span>`);
  html = html.replace(/<strong>\+[\d,]+<\/strong><span>insertions<\/span>/, `<strong>+${stats.additions.toLocaleString("en-US")}</strong><span>insertions</span>`);
  html = html.replace(/<strong>−[\d,]+<\/strong><span>deletions<\/span>/, `<strong>−${stats.deletions.toLocaleString("en-US")}</strong><span>deletions</span>`);
  html = html.replace(/<strong>\d+<\/strong><span>unit test files<\/span>/, `<strong>${testCount}</strong><span>unit test files</span>`);
  html = html.replace(/Commit <code>[a-f0-9]+<\/code>/, `Commit <code>${commit}</code>`);
  html = html.replace(/Generated [A-Z][a-z]+ \d{1,2}, \d{4}/, `Generated ${generatedDate}`);
  return html;
}

function main() {
  const { repo, input, output, base: explicitBase } = parseArgs(process.argv.slice(2));
  const source = readFileSync(input, "utf8");
  if (source.includes('id="fileDiffData"') || source.includes('id="fileViewData"')) {
    throw new Error("This review already contains injected file views. Use a clean source artifact.");
  }

  const baseRef = resolveBase(repo, explicitBase);
  const { unified, numstat, commit, base, changedPaths } = buildDiff(repo, baseRef);
  const sections = parseDiffSections(unified);
  const stats = parseStats(numstat);
  const paths = [...sections.keys()];
  const missingSections = changedPaths.filter((path) => !sections.has(path));
  const unexpectedSections = paths.filter((path) => !changedPaths.includes(path));
  if (missingSections.length || unexpectedSections.length) {
    throw new Error(
      `Could not safely map every changed path to a diff section. Missing: ${JSON.stringify(missingSections)}; unexpected: ${JSON.stringify(unexpectedSections)}`,
    );
  }
  const symlinkPaths = paths.filter((path) =>
    /(?:^|\n)(?:new file mode|deleted file mode|old mode|new mode) 120000$|^index [^\n]+ 120000$/m.test(
      sections.get(path),
    ),
  );
  if (symlinkPaths.length) {
    throw new Error(
      `Changed symbolic links require manual review and cannot be embedded safely: ${symlinkPaths.join(", ")}`,
    );
  }
  const fileViews = Object.fromEntries(
    paths.map((path) => {
      const diff = sections.get(path);
      const previousPath = diff.match(/^rename from (.+)$/m)?.[1] || path;
      return [
        path,
        {
          diff,
          before: readBaseFile(repo, base, previousPath),
          after: readWorkingFile(repo, path),
        },
      ];
    }),
  );
  const testCount = paths.filter((path) => /(^|\/)tests?\//.test(path) && /\.test\.[cm]?[jt]sx?$/.test(path)).length;
  const inventoryMarker = '<section class="inventory" id="inventory">';
  const markerIndex = source.indexOf(inventoryMarker);
  if (markerIndex === -1) throw new Error("Could not find the inventory section.");

  let featureHtml = source.slice(0, markerIndex);
  let remainder = source.slice(markerIndex);
  const featurePattern = /<li>\s*<div class="file-line"><code>([^<]+)<\/code><span class="delta">([^<]+)<\/span><\/div>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/g;
  let replacedFeatureCount = 0;
  featureHtml = featureHtml.replace(featurePattern, (_, label, delta, description) => {
    const resolvedPaths = resolveLabel(label, paths);
    replacedFeatureCount += 1;
    return featureDetails(label, delta, description, resolvedPaths);
  });

  if (replacedFeatureCount === 0) {
    throw new Error("No feature file references were found.");
  }

  for (const path of paths) {
    const escapedPath = escapeHtml(path);
    const original = `<td><code>${escapedPath}</code></td>`;
    const replacement = `<td>
      <details class="file-review inventory-file-review" data-file="${escapedPath}">
        <summary><code>${escapedPath}</code><span class="expand-label" aria-hidden="true">Changed lines</span></summary>
        <div class="file-view-toolbar" role="group" aria-label="Code view for ${escapedPath}">
          <button class="file-view-button active" type="button" data-file-view="diff" aria-pressed="true">Diff</button>
          <button class="file-view-button" type="button" data-file-view="before" aria-pressed="false">Before</button>
          <button class="file-view-button" type="button" data-file-view="after" aria-pressed="false">After</button>
        </div>
        <pre class="file-diff" aria-label="Changed lines for ${escapedPath}"><code></code></pre>
      </details>
    </td>`;
    remainder = remainder.replace(original, replacement);
  }

  const missingInventoryPaths = paths.filter((path) => !remainder.includes(`data-file="${escapeHtml(path)}"`));
  if (missingInventoryPaths.length) {
    throw new Error(`Inventory is missing changed files: ${missingInventoryPaths.join(", ")}`);
  }

  remainder = remainder.replace(
    '<input class="search" id="fileSearch" type="search" placeholder="Filter files or layer…" aria-label="Filter changed files">',
    `<div class="inventory-tools">
          <input class="search" id="fileSearch" type="search" placeholder="Filter files or layer…" aria-label="Filter changed files">
          <button class="inventory-button" id="expandInventoryFiles" type="button">Expand all</button>
          <button class="inventory-button" id="collapseInventoryFiles" type="button">Collapse all</button>
        </div>`,
  );

  let result = `${featureHtml}${remainder}`;
  result = injectStyles(result);
  result = injectBehavior(result, fileViews);
  result = updateMetrics(result, stats, paths.length, testCount, commit);
  writeFileSync(output, result);

  console.log(
    JSON.stringify(
      {
        output,
        files: paths.length,
        featureReferences: replacedFeatureCount,
        additions: stats.additions,
        deletions: stats.deletions,
        tests: testCount,
        commit,
      },
      null,
      2,
    ),
  );
}

main();
