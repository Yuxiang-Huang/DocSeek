/**
 * Serves Vite `dist/` on Railway (`PORT`) with SPA fallback for React Router.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "dist");
const port = Number(process.env.PORT || 4173);

const mime = new Map([
	[".html", "text/html; charset=utf-8"],
	[".js", "application/javascript; charset=utf-8"],
	[".css", "text/css; charset=utf-8"],
	[".json", "application/json"],
	[".ico", "image/x-icon"],
	[".svg", "image/svg+xml"],
	[".png", "image/png"],
	[".webp", "image/webp"],
	[".woff2", "font/woff2"],
]);

function filePathForUrl(reqUrl) {
	const pathname = decodeURIComponent(
		new URL(reqUrl || "/", "http://localhost").pathname,
	);
	const relative = pathname === "/" ? "index.html" : pathname.slice(1);
	const fp = path.normalize(path.join(root, relative));
	if (!fp.startsWith(root)) {
		return null;
	}
	return fp;
}

function isProbablyAsset(filePath) {
	const ext = path.extname(filePath);
	return ext !== "" && ext !== ".html";
}

function sendFile(res, filePath, method) {
	const ext = path.extname(filePath);
	res.setHeader(
		"Content-Type",
		mime.get(ext) ?? "application/octet-stream",
	);
	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(500);
			res.end();
			return;
		}
		res.writeHead(200);
		if (method === "HEAD") {
			res.end();
			return;
		}
		res.end(data);
	});
}

function sendIndex(res, method) {
	const indexPath = path.join(root, "index.html");
	fs.readFile(indexPath, (err, data) => {
		if (err) {
			res.writeHead(500);
			res.end("dist/index.html missing — run npm run build");
			return;
		}
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.writeHead(200);
		if (method === "HEAD") {
			res.end();
			return;
		}
		res.end(data);
	});
}

const server = http.createServer((req, res) => {
	const method = req.method ?? "GET";
	if (method !== "GET" && method !== "HEAD") {
		res.writeHead(405);
		res.end();
		return;
	}

	const filePath = filePathForUrl(req.url ?? "/");
	if (!filePath) {
		res.writeHead(403);
		res.end();
		return;
	}

	fs.stat(filePath, (err, st) => {
		if (!err && st.isFile()) {
			sendFile(res, filePath, method);
			return;
		}
		if (isProbablyAsset(filePath)) {
			res.writeHead(404);
			res.end();
			return;
		}
		sendIndex(res, method);
	});
});

server.listen(port, "0.0.0.0", () => {
	console.log(`DocSeek landing: dist → http://0.0.0.0:${port}`);
});
