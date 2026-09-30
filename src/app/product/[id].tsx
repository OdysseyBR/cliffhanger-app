/**
 * Detalhe do produto — coluna mobile-first inspirada no site: capa central,
 * selos, preço em destaque, buy box com CTAs + garantias, metadados em
 * pílulas e seções editoriais (Doc Mestre §10.1).
 */
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

type IconName = keyof typeof Ionicons.glyphMap;

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

function Chip({ label, tone = "muted" }: { label: string; tone?: "accent" | "muted" | "warn" | "info" }) {
  const colors = {
    accent: { bg: Colors.accent, fg: Colors.onAccent },
    muted: { bg: Colors.surface, fg: Colors.textMuted },
    warn: { bg: Colors.surface, fg: Colors.warning },
    info: { bg: "transparent", fg: Colors.accent },
  }[tone];
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderWidth: tone === "accent" ? 0 : 1,
        borderColor: tone === "info" ? Colors.accent : Colors.border,
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

/** Título de seção com barra de destaque (mesmo padrão do SectionHeader). */
function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: Colors.accent }} />
        <Text
          style={{
            fontFamily: Fonts.display,
            fontSize: 22,
            letterSpacing: 1.2,
            color: Colors.text,
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** Pílula de metadado (obra, universo, estoque) — inspirada no site. */
function MetaPill({
  icon,
  label,
  tone = "muted",
}: {
  icon: IconName;
  label: string;
  tone?: "muted" | "warn";
}) {
  if (!label) return null;
  const warn = tone === "warn";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: warn ? Colors.warning : Colors.border,
        backgroundColor: Colors.surface,
      }}
    >
      <Ionicons name={icon} size={13} color={warn ? Colors.warning : Colors.textMuted} />
      <Text
        style={{
          fontFamily: Fonts.bodySemi,
          fontSize: 11.5,
          letterSpacing: 0.4,
          color: warn ? Colors.warning : Colors.text,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Linha de garantia da compra (buy box). */
function TrustLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <Ionicons name={icon} size={14} color={Colors.accent} style={{ marginTop: 2 }} />
      <Text
        style={{
          flex: 1,
          fontFamily: Fonts.body,
          fontSize: 12,
          lineHeight: 16,
          color: Colors.textMuted,
        }}
      >
        {text}
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
  const universe = catalog!.universes.find((u) => u.id === product.universeId)?.name ?? "";

  const handleAdd = () => {
    add(product.id);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Screen title="Produto">
      <View style={{ paddingTop: 16, paddingHorizontal: ScreenPadding, gap: 20 }}>
        {/* capa central */}
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 176,
              height: 264,
              borderRadius: Radius.sm,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: Colors.line,
              backgroundColor: Colors.surface,
            }}
          >
            <BookCover cover={product.cover} title={product.title} />
          </View>
        </View>

        {/* identificação */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {product.badge &&
            product.badge.toUpperCase() !== (product.digital ? "DIGITAL" : "FÍSICO") ? (
              <Chip label={product.badge} tone="accent" />
            ) : null}
            <Chip label={product.digital ? "DIGITAL" : "FÍSICO"} />
            {product.digital ? <Chip label="ENTREGA IMEDIATA" tone="info" /> : null}
            {esgotado ? <Chip label="ESGOTADO" tone="warn" /> : null}
          </View>

          <Text
            style={{
              fontFamily: Fonts.display,
              fontSize: 27,
              lineHeight: 31,
              letterSpacing: 1,
              color: Colors.text,
            }}
          >
            {product.title.toUpperCase()}
          </Text>

          {author ? (
            <Text style={{ fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted }}>
              {author}
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Stars rating={product.rating} />
            <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textFaint }}>
              {product.rating > 0 ? product.rating.toFixed(1).replace(".", ",") : "—"} (
              {product.reviewCount} {product.reviewCount === 1 ? "avaliação" : "avaliações"})
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 26, color: Colors.accent }}>
              {formatBRL(product.price)}
            </Text>
            {product.compareAt !== undefined && product.compareAt > product.price ? (
              <Text
                style={{
                  fontFamily: Fonts.body,
                  fontSize: 14,
                  color: Colors.textFaint,
                  textDecorationLine: "line-through",
                }}
              >
                {formatBRL(product.compareAt)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* buy box */}
        <View
          style={{
            padding: 16,
            borderRadius: Radius.md,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
            gap: 10,
          }}
        >
          <Button
            label={esgotado ? "Esgotado" : added ? "Adicionado ✓" : "Adicionar ao carrinho"}
            disabled={esgotado}
            glow
            onPress={handleAdd}
          />
          <Button
            label={wished ? "Remover da wishlist" : "Salvar na wishlist"}
            variant="secondary"
            onPress={() => void toggleWishlist(product.id)}
          />
          <View style={{ height: 1, backgroundColor: Colors.line, marginVertical: 2 }} />
          <TrustLine
            icon={product.digital ? "cloud-download-outline" : "cube-outline"}
            text={
              product.digital
                ? "Entrega digital: acesso liberado na Biblioteca após pagamento"
                : "Envio para todo o Brasil — frete calculado no checkout"
            }
          />
          <TrustLine icon="card-outline" text="Pagamento por PIX, cartão de crédito ou débito" />
          <TrustLine
            icon="shield-checkmark-outline"
            text="Compra segura · suporte pela Cliffhanger Store"
          />
        </View>

        {/* metadados */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {work ? <MetaPill icon="book-outline" label={work} /> : null}
          {universe ? <MetaPill icon="globe-outline" label={universe} /> : null}
          {!esgotado && !product.digital && product.stock <= 5 ? (
            <MetaPill
              icon="alert-circle-outline"
              label={`Restam apenas ${product.stock} unidades`}
              tone="warn"
            />
          ) : null}
        </View>

        <SectionBlock title="SOBRE O ITEM">
          <View
            style={{
              padding: 14,
              borderRadius: Radius.md,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
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
        </SectionBlock>

        {product.specs.length > 0 ? (
          <SectionBlock title="FICHA TÉCNICA">
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
          </SectionBlock>
        ) : null}
      </View>
    </Screen>
  );
}
