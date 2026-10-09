import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

const SAVE_FILE = resolve(process.env.SPIELSTAND_FILE ?? "save/spielstand.json");
const MAX_SAVE_BYTES = 256 * 1024;

async function handleSave(req, res) {
  if (req.method === "GET") {
    try {
      const data = await readFile(SAVE_FILE, "utf8");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
    return;
  }
  if (req.method !== "POST" && req.method !== "PUT") {
    res.statusCode = 405;
    res.end();
    return;
  }
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_SAVE_BYTES) {
      res.statusCode = 413;
      res.end();
      return;
    }
  }
  try {
    JSON.parse(body);
  } catch {
    res.statusCode = 400;
    res.end();
    return;
  }
  await mkdir(dirname(SAVE_FILE), { recursive: true });
  const temp = `${SAVE_FILE}.tmp`;
  await writeFile(temp, body);
  await rename(temp, SAVE_FILE);
  res.statusCode = 204;
  res.end();
}

function saveFilePlugin() {
  const mount = (server) => {
    server.middlewares.use("/api/save", (req, res) => {
      handleSave(req, res).catch(() => {
        res.statusCode = 500;
        res.end();
      });
    });
  };
  return { name: "spielstand-datei", configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig({
  base: "/deine-strecke/",
  plugins: [saveFilePlugin()],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/save/**"],
    },
  },
});
