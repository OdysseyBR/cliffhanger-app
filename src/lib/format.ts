/**
 * Máscaras e validações de CPF/CNPJ (Etapa J — §7.4: a cobrança PagBank
 * exige o documento no pedido). Algoritmo de validação espelhado da loja
 * (Desenvolva aqui/src/lib/format.ts).
 */

/** 000.000.000-00 (CPF) ou 00.000.000/0000-00 (CNPJ) — máscara progressiva. */
export function formatTaxIdInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    let out = d.slice(0, 3);
    if (d.length > 3) out += `.${d.slice(3, 6)}`;
    if (d.length > 6) out += `.${d.slice(6, 9)}`;
    if (d.length > 9) out += `-${d.slice(9, 11)}`;
    return out;
  }
  let out = d.slice(0, 2);
  if (d.length > 2) out += `.${d.slice(2, 5)}`;
  if (d.length > 5) out += `.${d.slice(5, 8)}`;
  if (d.length > 8) out += `/${d.slice(8, 12)}`;
  if (d.length > 12) out += `-${d.slice(12, 14)}`;
  return out;
}

/** Somente dígitos — é o que vai em POST /api/orders (`payment.taxId`). */
export function taxIdDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Valida CPF ou CNPJ pelos dígitos verificadores (igual à loja). */
export function isValidTaxId(raw: string): boolean {
  const d = taxIdDigits(raw);
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
    let digit = sum % 11;
    digit = digit < 2 ? 0 : 11 - digit;
    if (digit !== Number(d[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
    digit = sum % 11;
    digit = digit < 2 ? 0 : 11 - digit;
    return digit === Number(d[10]);
  }
  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return false;
    const calc = (base: string, weights: number[]): number => {
      const total = base
        .split("")
        .reduce((acc, char, index) => acc + Number(char) * weights[index], 0);
      const rest = total % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    const first = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (first !== Number(d[12])) return false;
    const second = calc(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return second === Number(d[13]);
  }
  return false;
}
