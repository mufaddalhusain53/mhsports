import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

function compile(path, resolve) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)(resolve, exports);
  return exports.default;
}

function renderChrome(pathname) {
  const Chrome = compile("./SiteChrome.tsx", (name) => {
    if (name === "next/navigation") return { usePathname: () => pathname };
    if (name === "./Navbar") return { __esModule: true, default: ({ brand }) => React.createElement("header", null, brand) };
    if (name === "./Footer") return { __esModule: true, default: ({ showAdminLink }) => React.createElement("footer", null, showAdminLink ? "credit and admin link" : "credit") };
    return require(name);
  });
  return renderToStaticMarkup(React.createElement(Chrome, null, React.createElement("main", null, "content")));
}

test("non-auction admin pages use admin branding without the developer credit", () => {
  for (const path of ["/admin", "/admin/quadclash100/jersey", "/admin/auctions-other"]) {
    assert.equal(renderChrome(path), "<header>admin</header><main>content</main>");
  }
  for (const path of ["/admin/auctions", "/admin/auctions/example/run"]) {
    assert.equal(renderChrome(path), "<header>auction</header><footer>credit</footer><main>content</main>");
  }
  for (const path of ["/", "/tournaments", "/tournaments/quadclash100/registration"]) {
    assert.equal(renderChrome(path), "<header>site</header><main>content</main><footer>credit and admin link</footer>");
  }
  assert.equal(renderChrome("/auction/example"), "<main>content</main>");
});

test("public navigation moves the admin link to the footer", () => {
  const Navbar = compile("./Navbar.tsx", (name) => {
    if (name === "next/link") return { __esModule: true, default: "a" };
    if (name === "@/lib/tournament-features") return { INTER_MOHALLA_ENABLED: false };
    return require(name);
  });
  const Footer = compile("./Footer.tsx", (name) => {
    if (name === "next/link") return { __esModule: true, default: "a" };
    if (name === "../auction/DeveloperWatermark") return { __esModule: true, default: () => React.createElement("span", null, "credit") };
    return require(name);
  });
  const navbar = renderToStaticMarkup(React.createElement(Navbar, { brand: "site" }));
  const footer = renderToStaticMarkup(React.createElement(Footer, { showAdminLink: true }));
  assert.doesNotMatch(navbar, /href="\/admin"/);
  assert.match(footer, /href="\/admin"[^>]*>Admin Login<\/a>/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Footer)), /Admin Login/);
});

test("navigation selects the corresponding logo and home link for each brand", () => {
  const Navbar = compile("./Navbar.tsx", (name) => {
    if (name === "next/link") return { __esModule: true, default: "a" };
    if (name === "@/lib/tournament-features") return { INTER_MOHALLA_ENABLED: false };
    return require(name);
  });
  for (const [brand, href, logo, label] of [
    ["admin", "/admin", "/beyond-boundaries-logo.png", "Beyond Boundaries"],
    ["auction", "/admin/auctions", "/beyond-auctions-logo.png", "Beyond Auctions"],
    ["site", "/", "/mhsports-logo.png", "Mufaddal Husain Sports"],
  ]) {
    const html = renderToStaticMarkup(React.createElement(Navbar, { brand }));
    assert.ok(html.includes(`href="${href}"`));
    assert.ok(html.includes(`src="${logo}" alt="${label}"`));
  }
});
