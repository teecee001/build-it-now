import { assert, assertEquals } from "jsr:@std/assert@1";
import { appendSources, collectHeadlines } from "./sources.ts";
import { unsupportedFigures } from "./factcheck.ts";

const h = (title: string, link: string, source = "Reuters", date = "2026-10-07 18:18 UTC") => ({ title, link, source, date });
const results = [
  { query: "fed", headlines: [h("Fed minutes: hike likely, 25 bp", "https://n.example/a"), h("Citi delays cut to 2027 [update]", "https://n.example/b", "AP News", "2026-10-12 09:00 UTC")] },
  { query: "fed 2", headlines: [h("Fed minutes: hike likely, 25 bp", "https://n.example/a2"), h("dup link", "https://n.example/b"), h("x", "javascript:alert(1)")] },
  { error: "news unavailable" },
];

Deno.test("collects and dedupes headlines, drops non-http links", () => {
  const list = collectHeadlines(results);
  assertEquals(list.map((x) => x.link), ["https://n.example/a", "https://n.example/b"]);
});

Deno.test("appends Sources block with links, outlet and date", () => {
  const out = appendSources("The Fed may hike.", collectHeadlines(results));
  assertEquals(
    out,
    "The Fed may hike.\n\n**Sources**\n- [Fed minutes: hike likely, 25 bp](<https://n.example/a>) — Reuters, Oct 7\n- [Citi delays cut to 2027 update](<https://n.example/b>) — AP News, Oct 12",
  );
});

Deno.test("caps at 5 and does not double-add", () => {
  const many = Array.from({ length: 9 }, (_, i) => h(`T${i}`, `https://n.example/${i}`));
  assertEquals(appendSources("A", many).split("\n- ").length - 1, 5);
  assertEquals(appendSources("A\n\n**Sources:** Reuters", many), "A\n\n**Sources:** Reuters");
  assertEquals(appendSources("See https://n.example/3", many), "See https://n.example/3");
  assertEquals(appendSources("A", []), "A");
});

Deno.test("sources are appended after the fact-check, so their numbers are not checked", () => {
  // The fact-check runs on the model's answer only; this documents that the base answer passes.
  assertEquals(unsupportedFigures("The Fed may hike.", []).length, 0);
  assert(appendSources("x", collectHeadlines(results)).includes("25 bp"));
});
