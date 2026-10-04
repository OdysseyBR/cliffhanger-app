/**
 * Palco do PDF (web) — iframe com srcDoc usando o MESMO HTML do WebView
 * nativo (readerHtml), garantindo o mesmo render em capturas/preview web.
 * (react-native-webview não tem implementação web; por isso a divisão por
 * plataforma — o contrato ReaderCanvasProps é idêntico nos dois arquivos.)
 */
import { useEffect, useMemo, useRef } from "react";

import { Colors } from "@/constants/theme";
import {
  buildReaderHtml,
  dispatchReaderMessage,
  type ReaderCanvasProps,
} from "@/lib/readerHtml";

export default function PdfCanvas(props: ReaderCanvasProps) {
  const { url, startPage, page } = props;
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const html = useMemo(() => buildReaderHtml(url, startPage), [url, startPage]);
  const sent = useRef(startPage);
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      if (typeof event.data !== "string") return;
      dispatchReaderMessage(event.data, propsRef.current);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  // navegação da tela → motor (o mesmo contrato do nativo)
  useEffect(() => {
    if (page === sent.current) return;
    sent.current = page;
    frameRef.current?.contentWindow?.postMessage(
      { type: "reader-go", page: Math.round(page) },
      "*",
    );
  }, [page]);

  return (
    <iframe
      ref={frameRef}
      srcDoc={html}
      title="Leitor de PDF"
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        border: "none",
        background: Colors.background,
        display: "block",
      }}
    />
  );
}
