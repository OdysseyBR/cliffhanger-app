/**
 * HTML do leitor de PDF — motor único usado pelo WebView nativo e pelo
 * iframe web (srcDoc), garantindo o mesmo render nas duas plataformas.
 *
 * O pdf.js é injetado como módulo via Blob (strings geradas pelo script
 * embed:pdfjs), o worker também, e a página se comunica com o React por
 * postMessage nativo do WebView (window.ReactNativeWebView) ou do iframe
 * (window.parent) — o JS detecta o ambiente sozinho.
 */
import { PDFJS_MAIN, PDFJS_WORKER } from "./pdfjsSource";

/** JSON seguro dentro de <script>: impede que "</script>" no PDF feche a tag. */
function htmlJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

/** Contrato tela → palco do PDF (nativo e web compartilham). */
export interface ReaderCanvasProps {
  /** URL do arquivo PDF (já absoluta). */
  url: string;
  /** página inicial (última posição salva). */
  startPage: number;
  /** página pedida pela navegação da tela. */
  page: number;
  /** motor pronto: total de páginas. */
  onReady: (pages: number) => void;
  /** página renderizada pelo motor. */
  onPage: (page: number) => void;
  /** falha ao abrir o arquivo. */
  onError: () => void;
}

/** Despacha uma mensagem JSON do HTML do leitor para os callbacks da tela. */
export function dispatchReaderMessage(data: string, props: ReaderCanvasProps): void {
  try {
    const msg = JSON.parse(data) as { type?: string; page?: number; pages?: number };
    if (msg.type === "ready" && typeof msg.pages === "number") {
      props.onReady(msg.pages);
    } else if (msg.type === "page" && typeof msg.page === "number") {
      props.onPage(msg.page);
    } else if (msg.type === "error") {
      props.onError();
    }
  } catch {
    /* mensagem fora do contrato — ignorada */
  }
}

/**
 * Monta o HTML do leitor.
 * - Mensagens de saída: {type:"ready"|"page"|"error", ...}
 * - Comandos de entrada (postMessage no iframe / injectJavaScript no
 *   WebView): {type:"reader-go", page:number} e window.__readerGo(page).
 */
export function buildReaderHtml(url: string, startPage: number): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #0c0014; overflow: hidden; }
  #stage { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
  #stage canvas { max-width: 100%; max-height: 100%; box-shadow: 0 0 24px rgba(0, 0, 0, .6); }
  #status { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
    padding: 24px; text-align: center; color: #fdc500; background: #0c0014;
    font: 600 13px/1.5 system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; }
</style>
</head>
<body>
<div id="status">Abrindo o e-book…</div>
<div id="stage"></div>
<script type="module">
const FILE_URL = ${htmlJson(url)};
const START_PAGE = ${htmlJson(startPage)};
const MAIN_SRC = ${htmlJson(PDFJS_MAIN)};
const WORKER_SRC = ${htmlJson(PDFJS_WORKER)};

const post = (msg) => {
  const data = JSON.stringify(msg);
  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
    window.ReactNativeWebView.postMessage(data);
  } else if (window.parent && window.parent !== window) {
    window.parent.postMessage(data, "*");
  }
};

try {
  const mainUrl = URL.createObjectURL(new Blob([MAIN_SRC], { type: "text/javascript" }));
  const workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
  const pdfjs = await import(mainUrl);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // pdf.js v6: src como objeto ({ url }) — string pura lança
  // "expected either data, range, or url parameter"
  const doc = await pdfjs.getDocument({ url: FILE_URL }).promise;
  let page = Math.min(Math.max(Number(START_PAGE) || 1, 1), doc.numPages);

  const stage = document.getElementById("stage");
  const status = document.getElementById("status");
  status.style.display = "none";
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);

  let rendering = false;
  let pending = null;

  async function render(n) {
    if (rendering) { pending = n; return; }
    rendering = true;
    try {
      const pdfPage = await doc.getPage(n);
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(window.innerWidth / base.width, window.innerHeight / base.height);
      const viewport = pdfPage.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";
      await pdfPage.render({
        canvas: canvas,
        canvasContext: canvas.getContext("2d"),
        viewport: viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      }).promise;
      post({ type: "page", page: n, pages: doc.numPages });
    } finally {
      rendering = false;
      if (pending != null) {
        const target = pending;
        pending = null;
        if (target !== n) render(target);
      }
    }
  }

  function goto(n) {
    page = Math.min(Math.max(Math.round(n), 1), doc.numPages);
    render(page);
  }
  window.__readerGo = goto;

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (data && data.type === "reader-go" && typeof data.page === "number") {
      goto(data.page);
    }
  });

  post({ type: "ready", pages: doc.numPages, page: page });
  render(page);
} catch (error) {
  const detail = String((error && error.message) || error);
  document.getElementById("status").textContent = "Não foi possível abrir este arquivo";
  post({ type: "error", message: detail });
}
</script>
</body>
</html>`;
}
