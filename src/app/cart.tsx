/**
 * Carrinho (§10.1 — botão no topo de todas as telas): itens locais com
 * quantidade, remoção e subtotal.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { BookCover } from "@/components/BookCover";
import { ProductArt } from "@/components/ProductArt";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import { formatBRL } from "@/lib/catalog";
import { useCart } from "@/lib/useCart";
import { useCatalog } from "@/lib/useCatalog";
import { Pressable, Text, View } from "react-native";

export default function CartScreen() {
  const { items, hydrated, setQty, remove, subtotal } = useCart();
  const { catalog, loading, error, reload } = useCatalog();

  if (!hydrated || (loading && !catalog)) {
    return (
      <Screen title="Carrinho" scroll={false}>
        <Loading label="Carregando carrinho…" />
      </Screen>
    );
  }

  if (error && !catalog) {
    return (
      <Screen title="Carrinho" scroll={false}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Não foi possível carregar os preços."
          message={error}
          actionLabel="Tentar novamente"
          onAction={reload}
        />
      </Screen>
    );
  }

  const products = catalog?.products ?? [];
  const lines = items
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((line) => line.product !== undefined);

  if (lines.length === 0) {
    return (
      <Screen title="Carrinho" scroll={false}>
        <EmptyState
          icon="cart-outline"
          title="Seu carrinho está vazio."
          message="Explore os universos, escolha seu formato e comece uma nova história."
          actionLabel="Ver a loja"
          onAction={() => router.replace("/shop")}
        />
      </Screen>
    );
  }

  const total = subtotal(products);
  const missing = items.length - lines.length;
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <Screen title="Carrinho">
      <View style={{ paddingTop: 16, paddingHorizontal: ScreenPadding, gap: 14 }}>
        <View style={{ gap: 10 }}>
          <Text
            style={{
              fontFamily: Fonts.body,
              fontSize: 13.5,
              lineHeight: 19,
              color: Colors.textMuted,
            }}
          >
            Itens digitais e físicos convivem no mesmo pedido — o frete só é cobrado no que precisa
            de envio.
          </Text>
          <Pressable
            onPress={() => router.replace("/shop")}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                alignSelf: "flex-start",
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: Fonts.bodyBold,
                fontSize: 12.5,
                letterSpacing: 1,
                color: Colors.accent,
              }}
            >
              CONTINUAR COMPRANDO
            </Text>
            <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.accent }}>
              →
            </Text>
          </Pressable>
        </View>
        {lines.map(({ item, product }) => (
          <View
            key={item.productId}
            style={{
              flexDirection: "row",
              gap: 12,
              padding: 12,
              borderRadius: Radius.md,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <View
              style={{
                width: 52,
                height: 78,
                borderRadius: Radius.sm,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: Colors.line,
                backgroundColor: Colors.surfaceAlt,
              }}
            >
              {product ? <ProductArt product={product} /> : <BookCover />}
            </View>

            <View style={{ flex: 1, gap: 8 }}>
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: Fonts.bodySemi,
                  fontSize: 13.5,
                  lineHeight: 18,
                  color: Colors.text,
                }}
              >
                {product!.title}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.accent }}>
                  {formatBRL(product!.price)}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: Radius.pill,
                    borderWidth: 1,
                    borderColor: product!.digital ? Colors.accent : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.bodyBold,
                      fontSize: 9,
                      letterSpacing: 0.8,
                      color: product!.digital ? Colors.accent : Colors.textMuted,
                    }}
                  >
                    {product!.digital ? "DIGITAL" : "FÍSICO"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: Radius.pill,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    backgroundColor: Colors.surfaceAlt,
                    overflow: "hidden",
                  }}
                >
                  <Pressable
                    onPress={() => setQty(item.productId, item.qty - 1)}
                    hitSlop={6}
                    accessibilityLabel="Diminuir"
                    style={{ width: 34, height: 32, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="remove" size={16} color={Colors.text} />
                  </Pressable>
                  <Text
                    style={{
                      minWidth: 24,
                      textAlign: "center",
                      fontFamily: Fonts.bodySemi,
                      fontSize: 13,
                      color: Colors.text,
                    }}
                  >
                    {item.qty}
                  </Text>
                  <Pressable
                    onPress={() => setQty(item.productId, item.qty + 1)}
                    hitSlop={6}
                    accessibilityLabel="Aumentar"
                    style={{ width: 34, height: 32, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="add" size={16} color={Colors.text} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => remove(item.productId)}
                  hitSlop={8}
                  accessibilityLabel="Remover item"
                  style={{ padding: 6 }}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        {missing > 0 ? (
          <Text
            style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textFaint }}
          >
            {missing} {missing === 1 ? "item indisponível foi removido" : "itens indisponíveis foram removidos"} do cálculo.
          </Text>
        ) : null}

        <View
          style={{
            marginTop: 4,
            padding: 16,
            borderRadius: Radius.md,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
            gap: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.bodyMedium,
                fontSize: 12,
                letterSpacing: 1.2,
                color: Colors.textFaint,
                textTransform: "uppercase",
              }}
            >
              Subtotal
            </Text>
            <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.accent }}>
              {formatBRL(total)}
            </Text>
          </View>
          <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textFaint }}>
            {count} {count === 1 ? "item" : "itens"} no carrinho · frete e prazo calculados no
            checkout
          </Text>
        </View>

        <Button label="Finalizar compra" glow onPress={() => router.push("/checkout")} />
      </View>
    </Screen>
  );
}
