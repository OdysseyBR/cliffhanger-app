/**
 * Palco do PDF (nativo) — WebView executando o motor pdf.js do readerHtml.
 * A variante web (PdfCanvas.web.tsx) usa um iframe com o MESMO HTML, então
 * as duas plataformas renderizam exatamente o mesmo documento.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import {
  buildReaderHtml,
  dispatchReaderMessage,
  type ReaderCanvasProps,
} from "@/lib/readerHtml";

export default function PdfCanvas(props: ReaderCanvasProps) {
  const { url, startPage, page } = props;
  const ref = useRef<WebView>(null);
  const html = useMemo(() => buildReaderHtml(url, startPage), [url, startPage]);
  const sent = useRef(startPage);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => dispatchReaderMessage(event.nativeEvent.data, props),
    [props],
  );

  // navegação da tela → motor (o eco volta por onMessage e não realimenta
  // em loop: a tela só reenvia quando a página muda de fato)
  useEffect(() => {
    if (page === sent.current) return;
    sent.current = page;
    ref.current?.injectJavaScript(
      `window.__readerGo && window.__readerGo(${Math.round(page)}); true;`,
    );
  }, [page]);

  return (
    <WebView
      ref={ref}
      originWhitelist={["*"]}
      source={{ html }}
      onMessage={onMessage}
      scrollEnabled={false}
      setSupportMultipleWindows={false}
      style={{ flex: 1, backgroundColor: "#0C0014" }}
    />
  );
}
