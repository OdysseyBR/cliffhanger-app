/**
 * §7.4 — polling de pagamento: consulta GET /api/payment/status a cada 5s
 * enquanto o pedido está "aguardando_pagamento". Assim que o status muda,
 * entrega o valor final (a rota também conclui a confirmação automática
 * no servidor quando o PagBank já aprovou — o webhook é o caminho feliz).
 */
import { useEffect, useRef } from "react";

import { paymentStatus } from "./api";
import type { OrderStatus } from "./types";

export function usePaymentPolling(
  orderId: string | null,
  onStatus: (status: OrderStatus) => void,
): void {
  const callback = useRef(onStatus);
  useEffect(() => {
    callback.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!orderId) return;
    let done = false;
    const tick = async () => {
      try {
        const outcome = await paymentStatus(orderId);
        if (done) return;
        if (outcome.status !== "aguardando_pagamento") {
          done = true;
          callback.current(outcome.status);
        }
      } catch {
        /* rede instável — o próximo tick tenta de novo */
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 5000);
    return () => {
      done = true;
      clearInterval(timer);
    };
  }, [orderId]);
}
