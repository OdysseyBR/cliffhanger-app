/**
 * Detalhe do produto — coluna mobile-first espelhando a página §7 do site:
 * capa (imagem de upload ou só a arte, sem nome/rótulo), selo + desconto
 * sobre a arte, preço com "de/por", buy box com garantias, metadados,
 * especificações (+ edição/formato e categoria), sobre a obra, avaliações
 * reais (§19) e outros formatos/relacionados.
 */
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { CoverScrim } from "@/components/CoverScrim";
import { EmptyState } from "@/components/EmptyState";
import { ProductArt } from "@/components/ProductArt";
import { ProductCard } from "@/components/ProductCard";
import { ProductReviews } from "@/components/ProductReviews";
import { Rail } from "@/components/Rail";
import { SectionHeader } from "@/components/SectionHeader";
import { Loading, Screen } from "@/components/Screen";
import { Stars } from "@/components/Stars";
import { Colors, Fonts, Radius, ScreenPadding, useThemeColors } from "@/constants/theme";
import {
  authorName,
  CATEGORY_LABELS,
  discountPercent,
  formatBRL,
  formatDate,
  TYPE_LABELS,
} from "@/lib/catalog";
import { badgeTone } from "@/lib/tones";
import type { Product } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";
import { useCatalog } from "@/lib/useCatalog";

type IconName = keyof typeof Ionicons.glyphMap;

/** Chip de status da página (§7 — status verde/alerta). */
function Chip({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "ok" | "alert" | "muted" | "digital";
}) {
  const tones = {
    ok: { bg: "#30a46c1a", border: "#30a46c66", fg: "#30a46c" },
    alert: { bg: "#e5484d1a", border: "#e5484d66", fg: "#e5484d" },
    muted: { bg: Colors.surface, border: Colors.border, fg: Colors.textMuted },
    digital: { bg: Colors.primary + "26", border: Colors.primary + "99", fg: Colors.accent },
  }[tone];
  return (
    <View
      style={{
        backgroundColor: tones.bg,
        borderWidth: 1,
        borderColor: tones.border,
        borderRadius: Radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.bodyBold,
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: tones.fg,
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
  useThemeColors();
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

  const esgotado = product.stock === 0 && !product.digital;
  const wished = wishlist.includes(product.id);
  const author = authorName(product, catalog!.authors);
  const work = catalog!.works.find((w) => w.id === product.workId) ?? null;
  const workLabel = work ? work.title : null;
  const universe = catalog!.universes.find((u) => u.id === product.universeId) ?? null;
  const off = discountPercent(product.price, product.compareAt);

  const status = esgotado
    ? { label: "Esgotado", tone: "alert" as const }
    : product.digital
      ? { label: "Entrega imediata", tone: "ok" as const }
      : product.stock <= 5
        ? { label: `Restam ${product.stock} un.`, tone: "alert" as const }
        : { label: "Pronta entrega", tone: "ok" as const };

  const sameWork = catalog!.products.filter(
    (p) => p.workId === product.workId && p.id !== product.id,
  );
  const sameFormats = sameWork.filter(
    (p) => p.category === "livros" || p.category === "ebooks" || p.category === "audiobooks",
  );
  const sameUniverse = catalog!.products.filter(
    (p) =>
      p.universeId === product.universeId &&
      p.id !== product.id &&
      !sameWork.some((s) => s.id === p.id),
  );
  const related = [...sameWork, ...sameUniverse];

  const openProduct = (target: Product) =>
    router.push({ pathname: "/product/[id]", params: { id: target.id } });

  const handleAdd = () => {
    add(product.id);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1600);
  };

  const card = {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  } as const;

  return (
    <Screen title="Produto">
      <View style={{ paddingTop: 16, paddingBottom: 8, gap: 20 }}>
        <View style={{ paddingHorizontal: ScreenPadding, gap: 20 }}>
          {/* capa central — com imagem, só a imagem; sem imagem, só a arte */}
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 176,
                height: 264,
                borderRadius: Radius.sm,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: Colors.line,
                backgroundColor: Colors.surfaceAlt,
              }}
            >
              <ProductArt product={product} />
              <CoverScrim height={72} />
              {product.badge ? (
                <View
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    backgroundColor: badgeTone(product.badge).bg,
                    borderRadius: Radius.pill,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.bodyBold,
                      fontSize: 9.5,
                      letterSpacing: 0.8,
                      color: badgeTone(product.badge).fg,
                    }}
                  >
                    {product.badge}
                  </Text>
                </View>
              ) : null}
              {off && !esgotado ? (
                <View
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: Colors.accent,
                    borderRadius: Radius.pill,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.bodyBold,
                      fontSize: 9.5,
                      letterSpacing: 0.8,
                      color: Colors.onAccent,
                    }}
                  >
                    {off}% OFF
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* identificação */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Text
                style={{
                  fontFamily: Fonts.bodyBold,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: Colors.accent,
                }}
              >
                {TYPE_LABELS[product.type] ?? product.type}
              </Text>
              <Chip label={status.label} tone={status.tone} />
              {product.digital ? <Chip label="Digital" tone="digital" /> : null}
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

            <Stars rating={product.rating} count={product.reviewCount} size={15} />

            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
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
              {off ? (
                <View
                  style={{
                    backgroundColor: Colors.accent,
                    borderRadius: Radius.pill,
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.bodyBold,
                      fontSize: 10,
                      letterSpacing: 0.8,
                      color: Colors.onAccent,
                    }}
                  >
                    {off}% OFF
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={{
                fontFamily: Fonts.body,
                fontSize: 14,
                lineHeight: 21,
                color: Colors.textMuted,
              }}
            >
              {product.description}
            </Text>

            {formatDate(product.releaseDate ?? undefined) ? (
              <View
                style={{
                  borderRadius: Radius.sm,
                  borderWidth: 1,
                  borderColor: Colors.accent + "66",
                  backgroundColor: Colors.accent + "1A",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.text }}>
                  <Text style={{ fontFamily: Fonts.bodyBold, color: Colors.accent }}>
                    Lançamento:{" "}
                  </Text>
                  {formatDate(product.releaseDate ?? undefined)}
                </Text>
              </View>
            ) : null}

            {/* outros formatos/edições da mesma obra */}
            {sameFormats.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontFamily: Fonts.bodyBold,
                    fontSize: 11,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: Colors.accent,
                  }}
                >
                  Outros formatos da obra
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: Colors.primary,
                      borderRadius: Radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 11.5, color: Colors.onPrimary }}>
                      {TYPE_LABELS[product.type] ?? product.type} · {formatBRL(product.price)}
                    </Text>
                  </View>
                  {sameFormats.map((format) => (
                    <Text
                      key={format.id}
                      onPress={() => openProduct(format)}
                      style={{
                        borderWidth: 1,
                        borderColor: Colors.border,
                        borderRadius: Radius.pill,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        fontFamily: Fonts.bodySemi,
                        fontSize: 11.5,
                        color: Colors.text,
                        overflow: "hidden",
                      }}
                    >
                      {TYPE_LABELS[format.type] ?? format.type} · {formatBRL(format.price)}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {/* buy box */}
          <View style={[card, { padding: 16, gap: 10 }]}>
            <Button
              label={esgotado ? "Esgotado" : added ? "Adicionado" : "Adicionar ao carrinho"}
              icon={
                added && !esgotado ? (
                  <Ionicons name="checkmark" size={15} color={Colors.onPrimary} />
                ) : undefined
              }
              disabled={esgotado}
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
            {workLabel ? <MetaPill icon="book-outline" label={workLabel} /> : null}
            {universe ? <MetaPill icon="globe-outline" label={universe.name} /> : null}
            {!esgotado && !product.digital && product.stock <= 5 ? (
              <MetaPill
                icon="alert-circle-outline"
                label={`Restam apenas ${product.stock} unidades`}
                tone="warn"
              />
            ) : null}
          </View>

          <SectionBlock title="SOBRE O ITEM">
            <View style={[card, { padding: 14 }]}>
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
            <SectionBlock title="ESPECIFICAÇÕES">
              <View style={[card, { overflow: "hidden" }]}>
                {[...product.specs, { label: "Edição / formato", value: TYPE_LABELS[product.type] }, {
                  label: "Categoria",
                  value: CATEGORY_LABELS[product.category],
                }].map((spec, index) => (
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
                        flex: 1,
                        fontFamily: Fonts.bodyMedium,
                        fontSize: 11,
                        letterSpacing: 1,
                        color: Colors.textFaint,
                        textTransform: "uppercase",
                      }}
                    >
                      {spec.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Fonts.bodySemi,
                        fontSize: 13,
                        color: Colors.text,
                        textAlign: "right",
                        maxWidth: "55%",
                      }}
                    >
                      {spec.value}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionBlock>
          ) : null}

          {/* Sobre a obra + autor (§7) */}
          {work ? (
            <SectionBlock title="SOBRE A OBRA">
              <View style={[card, { padding: 16, gap: 12 }]}>
                <View style={{ gap: 4 }}>
                  <Text
                    style={{ fontFamily: Fonts.display, fontSize: 24, color: Colors.text, letterSpacing: 1 }}
                  >
                    {work.title.toUpperCase()}
                  </Text>
                  {work.subtitle ? (
                    <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.accent }}>
                      {work.subtitle}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={{
                    fontFamily: Fonts.body,
                    fontSize: 14,
                    lineHeight: 21,
                    color: Colors.textMuted,
                  }}
                >
                  {work.synopsis}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {author ? <MetaPill icon="person-outline" label={author} /> : null}
                  {universe ? <MetaPill icon="globe-outline" label={universe.name} /> : null}
                  <MetaPill icon="calendar-outline" label={`Ano ${work.year}`} />
                </View>
                {author && catalog!.authors.find((a) => a.id === product.authorId)?.bio ? (
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: Colors.border,
                      paddingTop: 12,
                      gap: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Fonts.bodyBold,
                        fontSize: 10.5,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: Colors.accent,
                      }}
                    >
                      Autor
                    </Text>
                    <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text }}>
                      {author}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Fonts.body,
                        fontSize: 12.5,
                        lineHeight: 18,
                        color: Colors.textMuted,
                      }}
                    >
                      {catalog!.authors.find((a) => a.id === product.authorId)?.bio}
                    </Text>
                  </View>
                ) : null}
              </View>
            </SectionBlock>
          ) : null}
        </View>

        {/* avaliações reais (§19/§24) */}
        <View style={{ gap: 8 }}>
          <SectionHeader title="Avaliações" />
          <Text
            style={{
              paddingHorizontal: ScreenPadding,
              fontFamily: Fonts.body,
              fontSize: 12.5,
              lineHeight: 18,
              color: Colors.textMuted,
            }}
          >
            Quem comprou conta como foi — fotos e compra verificada aparecem na publicação.
          </Text>
          <ProductReviews productId={product.id} />
        </View>

        {/* Outros formatos e relacionados */}
        {related.length > 0 ? (
          <Rail title="Outros formatos e relacionados">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} width={150} />
            ))}
          </Rail>
        ) : null}
      </View>
    </Screen>
  );
}
