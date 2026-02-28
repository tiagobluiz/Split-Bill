import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 5173);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Split-Bill Frontend</title>
  </head>
  <body>
    <main>
      <h1>Split-Bill Frontend Workspace</h1>
      <p>SB-001 bootstrap placeholder server is running.</p>
    </main>
  </body>
</html>`;

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "frontend" }));
    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(port, () => {
  console.log(`[frontend] listening on http://localhost:${port}`);
});
