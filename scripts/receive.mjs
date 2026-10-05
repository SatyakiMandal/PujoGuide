// Tiny one-shot receiver for moving data out of a browser tab that can't talk to localhost.
// Open http://127.0.0.1:<port>/#<encodeURIComponent(json)> in the tab: the page below POSTs the fragment to itself.
// Usage: node scripts/receive.mjs <port> <outfile>
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";

const [port, out] = [Number(process.argv[2] ?? 3199), process.argv[3] ?? "data/snapshot.raw.json"];
const PAGE = `<!doctype html><meta charset=utf-8><title>receiver</title><body>sending…<script>
const raw = decodeURIComponent(location.hash.slice(1));
fetch("/save", { method: "POST", body: raw }).then((r) => r.text()).then((t) => (document.body.textContent = t + " " + raw.length));
</script>`;

createServer((req, res) => {
  if (req.method === "GET") return res.writeHead(200, { "Content-Type": "text/html" }).end(PAGE);
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    writeFileSync(out, body);
    res.writeHead(200).end("saved");
    console.log(`wrote ${out} (${body.length} bytes)`);
    setTimeout(() => process.exit(0), 300);
  });
}).listen(port, "127.0.0.1", () => console.log(`listening on ${port}`));
