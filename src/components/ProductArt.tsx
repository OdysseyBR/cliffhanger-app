/**
 * Arte do produto — espelha ProductArt.tsx da loja web (§7/§23):
 * 1. imagem enviada no criador de itens (Cloudinary) quando existir;
 * 2. sem imagem, capa geométrica da obra (livros/ebooks/audiobooks);
 * 3. no fallback, só o bloco gráfico da marca — geometria pura, sem nome
 *    de livro, sem rótulo de categoria e sem monograma.
 */
import { Image } from "expo-image";
import { useState } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { BookCover } from "@/components/BookCover";
import type { Product } from "@/lib/types";

const BRAND_COLORS = [
  { bg: "#A30707", fg: "#F8FEFF", accent: "#E7CB9B" },
  { bg: "#0E0000", fg: "#E7CB9B", accent: "#A30707" },
  { bg: "#E7CB9B", fg: "#0E0000", accent: "#A30707" },
  { bg: "#F8FEFF", fg: "#A30707", accent: "#0E0000" },
];

/** Semente estável por produto (mesma fórmula do site). */
function brandSeed(id: string): number {
  return id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % BRAND_COLORS.length;
}

export function ProductArt({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(product.image) && !imageFailed;
  const isBookish =
    product.category === "livros" ||
    product.category === "ebooks" ||
    product.category === "audiobooks";

  if (hasImage) {
    return (
      <Image
        source={{ uri: product.image }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        accessibilityLabel={product.title}
        onError={() => setImageFailed(true)}
      />
    );
  }

  if (isBookish && product.cover) {
    // §7 — a capa do produto não projeta nome nem rótulo: só a arte.
    return <BookCover cover={product.cover} />;
  }

  const { bg, fg, accent } = BRAND_COLORS[brandSeed(product.id)];

  return (
    <Svg
      viewBox="0 0 300 450"
      preserveAspectRatio="xMidYMid slice"
      accessibilityLabel={product.title}
      width="100%"
      height="100%"
    >
      <Rect width="300" height="450" fill={bg} />
      <Circle cx="150" cy="200" r="104" fill={accent} opacity="0.18" />
      <Path d="M40 320 L150 96 L260 320 Z" fill={accent} opacity="0.35" />
      <Path d="M40 320 L150 448 L260 320 Z" fill={fg} opacity="0.1" />
      <Rect x="40" y="352" width="220" height="8" fill={fg} opacity="0.6" />
      <Rect x="40" y="376" width="112" height="8" fill={fg} opacity="0.32" />
    </Svg>
  );
}
