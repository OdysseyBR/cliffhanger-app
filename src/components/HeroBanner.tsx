/**
 * Hero da Home — mostra a MESMA arte final única do banner ativo do painel
 * (Documento de Correção §5): imagem completa, sem camadas montadas, com o
 * destino configurado no painel ao tocar. Sem banner publicado (ou falha de
 * rede) → não renderiza; arte quebrada → cai para a arte padrão da loja.
 *
 * Observações de escopo: `fullscreen`/`showHeader` são do site (a home do app
 * tem header/tabbar fixos próprios) e não alteram o layout aqui.
 */
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, useWindowDimensions } from "react-native";

import { Colors } from "@/constants/theme";
import {
  DEFAULT_BANNER_IMAGE,
  loadBanners,
  resolveBannerImage,
  type Banner,
} from "@/lib/banners";
import { useCatalog } from "@/lib/useCatalog";
import type { Product } from "@/lib/types";

/** proporção da arte padrão (1650×414) — usada até o onLoad dar as dimensões. */
const DEFAULT_ASPECT = 1650 / 414;

/** slug ("alvorada-eletrica-ebook") → termo de busca ("alvorada eletrica ebook"). */
function slugToQuery(slug: string): string {
  const last = slug.replace(/^\//, "").split("/").pop() ?? "";
  return last.replace(/-/g, " ");
}

/**
 * Navega para páginas internas da loja → rotas do app (tabela enxuta; caminho
 * desconhecido leva ao Início para nunca deixar o usuário num beco sem saída).
 */
function openInternalPath(path: string): void {
  const clean = (path.split(/[?#]/)[0] ?? "/").replace(/\/+$/, "") || "/";

  switch (clean) {
    case "/":
      router.push("/");
      return;
    case "/loja":
    case "/produtos":
      router.push("/shop");
      return;
    case "/livros":
      router.push({ pathname: "/shop", params: { filter: "livros" } });
      return;
    case "/ebooks":
      router.push({ pathname: "/shop", params: { filter: "ebooks" } });
      return;
    case "/audiobooks":
      router.push({ pathname: "/shop", params: { filter: "audiobooks" } });
      return;
    case "/colecionaveis":
      router.push({ pathname: "/shop", params: { filter: "colecionaveis" } });
      return;
    case "/ofertas":
    case "/lancamentos":
      router.push("/shop");
      return;
    case "/universos":
      router.push("/");
      return;
    case "/autores":
    case "/buscar":
      router.push("/search");
      return;
    case "/carrinho":
      router.push("/cart");
      return;
    case "/checkout":
      router.push("/checkout");
      return;
    case "/conta":
    case "/wishlist":
      router.push("/account");
      return;
    case "/biblioteca":
      router.push("/library");
      return;
    case "/pedidos":
      router.push("/orders");
      return;
    case "/notificacoes":
      router.push("/notifications");
      return;
    default:
      router.push("/");
  }
}

/** Resolve o destino configurado no painel para a rota equivalente do app. */
function goToBanner(banner: Banner, products: Product[]): void {
  const value = (banner.destinationValue ?? "").trim();
  const bySlug = (slug: string): Product | undefined =>
    products.find((p) => p.slug === slug);

  switch (banner.destinationType) {
    case "externo": {
      if (/^https?:\/\//i.test(value)) void Linking.openURL(value);
      return;
    }
    case "produto":
    case "lancamento": {
      const product = value ? bySlug(value) : undefined;
      if (product) {
        router.push({ pathname: "/product/[id]", params: { id: product.id } });
      } else if (value) {
        router.push({ pathname: "/search", params: { q: slugToQuery(value) } });
      } else {
        router.push("/shop");
      }
      return;
    }
    case "obra": {
      if (value) router.push({ pathname: "/search", params: { q: slugToQuery(value) } });
      else router.push("/shop");
      return;
    }
    case "colecao": {
      router.push({ pathname: "/shop", params: { filter: "colecionaveis" } });
      return;
    }
    case "campanha":
    case "pagina": {
      if (/^https?:\/\//i.test(value)) {
        void Linking.openURL(value);
        return;
      }
      if (/^\/produtos\//.test(value)) {
        const product = bySlug(value);
        if (product) {
          router.push({ pathname: "/product/[id]", params: { id: product.id } });
        } else {
          router.push("/shop");
        }
        return;
      }
      openInternalPath(value || "/");
      return;
    }
  }
}

export function HeroBanner() {
  const { width } = useWindowDimensions();
  const { catalog } = useCatalog();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [usedFallback, setUsedFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadBanners().then((list) => {
      if (alive) setBanner(list[0] ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!banner) return null;

  const original = resolveBannerImage(banner, width < 640);
  if (!original || failed) return null;
  const uri = usedFallback ? DEFAULT_BANNER_IMAGE : original;
  if (!uri) return null;

  return (
    <Pressable
      onPress={() => catalog && goToBanner(banner, catalog.products)}
      accessibilityRole="button"
      accessibilityLabel={banner.alt ?? banner.name}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, marginBottom: 16 }]}
    >
      <Image
        source={{ uri }}
        contentFit="cover"
        transition={150}
        alt={banner.alt ?? banner.name}
        onLoad={(event) => {
          const { width: w, height: h } = event.source;
          if (w > 0 && h > 0) setAspect(w / h);
        }}
        onError={() => {
          if (!usedFallback && uri !== DEFAULT_BANNER_IMAGE) setUsedFallback(true);
          else setFailed(true);
        }}
        style={{
          width,
          aspectRatio: aspect,
          backgroundColor: Colors.surface,
        }}
      />
    </Pressable>
  );
}
