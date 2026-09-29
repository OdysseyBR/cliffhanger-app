/**
 * Gera src/lib/pdfjsSource.ts embarcando o pdf.js como strings.
 *
 * Uso: npm run embed:pdfjs
 *
 * O app nunca importa pdfjs-dist no bundle (evita problemas do Metro com
 * ESM/worker); o WebView nativo e o iframe web recebem o mesmo motor por
 * string, igual ao pdf.js servido pela loja em /pdf.worker.min.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = join(root, "node_modules", "pdfjs-dist", "build");
const pkg = JSON.parse(
  readFileSync(join(root, "node_modules", "pdfjs-dist", "package.json"), "utf8"),
);

const read = (name) => readFileSync(join(buildDir, name), "utf8");

/** Escapa para uso dentro de um template literal de TypeScript. */
const escape = (source) =>
  source.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const main = escape(read("pdf.min.mjs"));
const worker = escape(read("pdf.worker.min.mjs"));

const out = `/**
 * GERADO por scripts/embed-pdfjs.mjs — não edite à mão.
 * Reexecute "npm run embed:pdfjs" após atualizar o pdfjs-dist.
 * pdf.js ${pkg.version} (mesma versão da loja) como string para o leitor.
 */
export const PDFJS_MAIN = \`${main}\`;

export const PDFJS_WORKER = \`${worker}\`;
`;

writeFileSync(join(root, "src", "lib", "pdfjsSource.ts"), out, "utf8");
console.log(
  `pdfjsSource.ts gerado (${(out.length / 1024).toFixed(0)} KB, pdf.js ${pkg.version})`,
);
