/**
 * Detalhe do produto — capa, preço, avaliação, ficha, wishlist e
 * adicionar ao carrinho (carrinho no topo §10.1).
 */
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { authorName, formatBRL, workTitle } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";
import { useCatalog } from "@/lib/useCatalog";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Ionicons
          key={i}
          name={i < full ? "star" : i === full && half ? "star-half" : "star-outline"}
          size={14}
          color={Colors.accent}
        />
      ))}
    </View>
  );
}

function Chip({ label, tone = "muted" }: { label: string; tone?: "accent" | "muted" | "warn" }) {
  const colors = {
    accent: { bg: Colors.accent, fg: Colors.onAccent },
    muted: { bg: Colors.surface, fg: Colors.textMuted },
    warn: { bg: Colors.surface, fg: Colors.warning },
  }[tone];
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderWidth: tone === "muted" || tone === "warn" ? 1 : 0,
        borderColor: Colors.border,
        borderRadius: Radius.sm,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.bodyBold,
          fontSize: 10,
          letterSpacing: 0.8,
          color: colors.fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { catalog, loading, error, reload } = useCatalog();
  const { wishlist, toggleWishlist } = useAuth();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (loading && !catalog) {
    return (
      <Screen title="Produto" scroll={false}>
        <Loading label="Carregando produto…" />
      </Screen>
    );
  }

  if (error && !catalog) {
    return (
      <Screen title="Produto" scroll={false}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Não foi possível carregar."
          message={error}
          actionLabel="Tentar novamente"
          onAction={reload}
        />
      </Screen>
    );
  }

  const product: Product | undefined = catalog?.products.find((p) => p.id === id);

  if (!product) {
    return (
      <Screen title="Produto" scroll={false}>
        <EmptyState
          icon="cube-outline"
          title="Produto não encontrado."
          message="Ele pode ter saído do catálogo."
          actionLabel="Ir para a loja"
          onAction={() => router.replace("/shop")}
        />
      </Screen>
    );
  }

  const esgotado = product.stock <= 0;
  const wished = wishlist.includes(product.id);
  const author = authorName(product, catalog!.authors);
  const work = workTitle(product, catalog!.works);

  const handleAdd = () => {
    add(product.id);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Screen title="Produto">
      <View style={{ paddingTop: 16, paddingHorizontal: ScreenPadding, gap: 20 }}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View
            style={{
              width: 132,
              height: 198,
              borderRadius: Radius.sm,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: Colors.line,
              backgroundColor: Colors.surface,
            }}
          >
            <BookCover cover={product.cover} title={product.title} />
          </View>

          <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {product.badge ? <Chip label={product.badge} tone="accent" /> : null}
              <Chip label={product.digital ? "DIGITAL" : "FÍSICO"} />
              {esgotado ? <Chip label="ESGOTADO" tone="warn" /> : null}
            </View>

            <Text
              style={{
                fontFamily: Fonts.display,
                fontSize: 24,
                lineHeight: 27,
                letterSpacing: 1,
                color: Colors.text,
              }}
            >
              {product.title.toUpperCase()}
            </Text>

            {author ? (
              <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted }}>
                {author}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Stars rating={product.rating} />
              <Text style={{ fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textFaint }}>
                {product.rating > 0 ? product.rating.toFixed(1) : "—"} (
                {product.reviewCount} {product.reviewCount === 1 ? "avaliação" : "avaliações"})
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 2 }}>
              <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 22, color: Colors.accent }}>
                {formatBRL(product.price)}
              </Text>
              {product.compareAt !== undefined && product.compareAt > product.price ? (
                <Text
                  style={{
                    fontFamily: Fonts.body,
                    fontSize: 13,
                    color: Colors.textFaint,
                    textDecorationLine: "line-through",
                  }}
                >
                  {formatBRL(product.compareAt)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Button
            label={esgotado ? "Esgotado" : added ? "Adicionado ✓" : "Adicionar ao carrinho"}
            disabled={esgotado}
            onPress={handleAdd}
          />
          <Button
            label={wished ? "Remover da wishlist" : "Salvar na wishlist"}
            variant="secondary"
            onPress={() => void toggleWishlist(product.id)}
          />
        </View>

        {work ? <InfoLine label="Obra" value={work} /> : null}
        {product.universeId ? (
          <InfoLine
            label="Universo"
            value={catalog!.universes.find((u) => u.id === product.universeId)?.name ?? ""}
          />
        ) : null}
        {!esgotado && !product.digital && product.stock <= 5 ? (
          <InfoLine label="Estoque" value={`Restam apenas ${product.stock} unidades`} />
        ) : null}

        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontFamily: Fonts.display,
              fontSize: 20,
              letterSpacing: 1.2,
              color: Colors.text,
            }}
          >
            SOBRE O ITEM
          </Text>
          <Text
            style={{
              fontFamily: Fonts.body,
              fontSize: 14.5,
              lineHeight: 21,
              color: Colors.textMuted,
            }}
          >
            {product.description}
          </Text>
        </View>

        {product.specs.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: Fonts.display,
                fontSize: 20,
                letterSpacing: 1.2,
                color: Colors.text,
              }}
            >
              FICHA TÉCNICA
            </Text>
            <View
              style={{
                borderRadius: Radius.md,
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.border,
                overflow: "hidden",
              }}
            >
              {product.specs.map((spec, index) => (
                <View
                  key={`${spec.label}-${index}`}
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: Colors.border,
                  }}
                >
                  <Text
                    style={{
                      width: 110,
                      fontFamily: Fonts.bodyMedium,
                      fontSize: 11,
                      letterSpacing: 1,
                      color: Colors.textFaint,
                      textTransform: "uppercase",
                    }}
                  >
                    {spec.label}
                  </Text>
                  <Text style={{ flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text }}>
                    {spec.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "baseline" }}>
      <Text
        style={{
          fontFamily: Fonts.bodyMedium,
          fontSize: 11,
          letterSpacing: 1.2,
          color: Colors.textFaint,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text style={{ flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text }}>
        {value}
      </Text>
    </View>
  );
}
