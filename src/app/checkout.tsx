/**
 * Checkout (Doc Mestre §7.2): Dados → Entrega → Pagamento → Revisão →
 * Pedido concluído, nas mesmas APIs da loja (/api/shipping,
 * /api/coupons/validate e /api/orders). Compra como usuário ou convidado,
 * com dados e endereço pré-preenchidos para quem tem conta (§7.2).
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { Loading, Screen } from "@/components/Screen";
import { Colors, Fonts, Radius, ScreenPadding } from "@/constants/theme";
import {
  ApiError,
  createOrder,
  loadSavedAddresses,
  quoteShipping,
  validateCoupon,
} from "@/lib/api";
import { formatBRL } from "@/lib/catalog";
import type { CheckoutPayload, OrderCreated, PaymentMethod, ShippingQuote } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";
import { useCatalog } from "@/lib/useCatalog";

type Step = "dados" | "entrega" | "pagamento" | "revisao" | "pedido";
type FormStep = Exclude<Step, "pedido">;

const STEPS: FormStep[] = ["dados", "entrega", "pagamento", "revisao"];
const STEP_TITLE: Record<FormStep, string> = {
  dados: "Dados",
  entrega: "Entrega",
  pagamento: "Pagamento",
  revisao: "Revisão",
};

const PAYMENT_OPTIONS: {
  key: PaymentMethod;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "pix", label: "PIX", hint: "Aprovação imediata", icon: "qr-code-outline" },
  { key: "credito", label: "Crédito", hint: "Até 6x sem juros", icon: "card-outline" },
  { key: "debito", label: "Débito", hint: "Na hora", icon: "card" },
];

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
};

const CARD: ViewStyle = {
  padding: 16,
  borderRadius: Radius.md,
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
};

function cepDigitsOf(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

function displayCep(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/** (11) 99999-9999 — máscara progressiva a partir dos dígitos. */
function formatPhoneInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function CheckoutScreen() {
  const { loading: authLoading } = useAuth();
  const { hydrated } = useCart();

  if (authLoading || !hydrated) {
    return <Loading label="Preparando checkout…" />;
  }
  return <CheckoutFlow />;
}

function CheckoutFlow() {
  const { user, getIdToken } = useAuth();
  const { catalog, loading, error, reload } = useCatalog();
  const { items, clear } = useCart();

  // etapa
  const [step, setStep] = useState<Step>("dados");
  // dados
  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [dadosError, setDadosError] = useState<string | null>(null);
  // entrega
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [shippingOption, setShippingOption] = useState<"standard" | "express">("standard");
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteCep, setQuoteCep] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [entregaError, setEntregaError] = useState<string | null>(null);
  // pagamento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    null,
  );
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  // revisão/pedido
  const [giftOn, setGiftOn] = useState(false);
  const [giftTo, setGiftTo] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [giftWrap, setGiftWrap] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderCreated | null>(null);
  /** se o pedido confirmado tinha itens físicos (snapshot antes do clear) */
  const [placedPhysical, setPlacedPhysical] = useState(false);

  const addressPrefilled = useRef(false);

  // derivados do carrinho atual
  const products = catalog?.products ?? [];
  const lines = items
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((line) => line.product !== undefined);
  const subtotal = lines.reduce((sum, l) => sum + l.product!.price * l.item.qty, 0);
  const physicalCount = lines
    .filter((l) => !l.product!.digital)
    .reduce((sum, l) => sum + l.item.qty, 0);
  const hasPhysical = physicalCount > 0;
  const digits = cepDigitsOf(cep);
  const quoteReady = quote !== null && quoteCep === digits;
  const selectedOption = quoteReady ? (quote.options.find((o) => o.id === shippingOption) ?? null) : null;
  const shippingPrice = hasPhysical && quoteReady ? (selectedOption?.price ?? 0) : 0;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shippingPrice;

  // Cotação de frete com debounce (mesmo comportamento do checkout web)
  useEffect(() => {
    if (!hasPhysical || digits.length !== 8) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void getIdToken()
        .then((token) => quoteShipping(token, { cep: digits, itemCount: physicalCount, subtotal }))
        .then((data) => {
          if (cancelled) return;
          setQuote(data);
          setQuoteCep(digits);
          setQuoteError(null);
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          setQuote(null);
          setQuoteCep(digits);
          setQuoteError(
            cause instanceof ApiError ? cause.message : "Não foi possível calcular o frete.",
          );
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [digits, hasPhysical, physicalCount, subtotal, getIdToken]);

  const goNext = () => {
    if (step === "dados") {
      if (!name.trim()) {
        setDadosError("Informe seu nome completo.");
        return;
      }
      if (!email.includes("@")) {
        setDadosError("Informe um e-mail válido.");
        return;
      }
      setDadosError(null);
      setStep("entrega");
      // §7.2 — endereço principal pré-preenchido para usuários autenticados
      if (user && !addressPrefilled.current) {
        addressPrefilled.current = true;
        void getIdToken()
          .then((token) => (token ? loadSavedAddresses(token) : null))
          .then((res) => {
            const list = res?.addresses ?? [];
            const chosen = list.find((a) => a.isDefault) ?? list[0];
            if (!chosen) return;
            setCep((prev) => prev || cepDigitsOf(chosen.cep));
            setStreet((prev) => prev || chosen.street);
            setNumber((prev) => prev || chosen.number);
            setComplement((prev) => prev || (chosen.complement ?? ""));
            setNeighborhood((prev) => prev || chosen.district);
            setCity((prev) => prev || chosen.city);
            setState((prev) => prev || chosen.state.toUpperCase());
          })
          .catch(() => {
            /* pré-preenchimento é opcional — sem endereços salvo, segue vazio */
          });
      }
      return;
    }
    if (step === "entrega") {
      if (hasPhysical) {
        if (digits.length !== 8) {
          setEntregaError("Informe um CEP com 8 dígitos.");
          return;
        }
        if (!street.trim() || !number.trim()) {
          setEntregaError("Informe rua e número.");
          return;
        }
        if (!neighborhood.trim() || !city.trim()) {
          setEntregaError("Informe bairro e cidade.");
          return;
        }
        if (state.trim().length !== 2) {
          setEntregaError("Informe a UF com 2 letras.");
          return;
        }
        if (!quoteReady) {
          setEntregaError("Aguarde a cálculo do frete.");
          return;
        }
        if (!selectedOption) {
          setEntregaError("Escolha uma modalidade de envio.");
          return;
        }
      }
      setEntregaError(null);
      setStep("pagamento");
      return;
    }
    if (step === "pagamento") setStep("revisao");
  };

  const goBack = () => {
    const idx = step === "pedido" ? -1 : STEPS.indexOf(step as FormStep);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code || couponBusy) return;
    setCouponBusy(true);
    setCouponError(null);
    validateCoupon(code, subtotal)
      .then((res) => setAppliedCoupon({ code: res.coupon.code, discount: res.discount }))
      .catch((cause: unknown) =>
        setCouponError(
          cause instanceof ApiError ? cause.message : "Não foi possível validar o cupom.",
        ),
      )
      .finally(() => setCouponBusy(false));
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const placeOrder = async () => {
    if (giftOn && !giftTo.trim()) {
      setOrderError("Informe quem vai receber o presente (ou desmarque a opção).");
      return;
    }
    setPlacing(true);
    setOrderError(null);
    try {
      const token = await getIdToken();
      const payload: CheckoutPayload = {
        items: lines.map((l) => ({ productId: l.product!.id, qty: l.item.qty })),
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        paymentMethod,
        ...(hasPhysical
          ? {
              address: {
                cep: digits,
                street: street.trim(),
                number: number.trim(),
                complement: complement.trim() || undefined,
                neighborhood: neighborhood.trim(),
                city: city.trim(),
                state: state.trim().toUpperCase(),
              },
              shippingOption,
            }
          : {}),
        ...(appliedCoupon ? { coupon: appliedCoupon.code } : {}),
        ...(giftOn && giftTo.trim()
          ? { gift: { to: giftTo.trim(), message: giftMessage.trim(), wrap: giftWrap } }
          : {}),
      };
      const order = await createOrder(payload, token ?? undefined);
      setPlacedPhysical(hasPhysical);
      clear();
      setResult(order);
      setStep("pedido");
    } catch (cause: unknown) {
      setOrderError(
        cause instanceof ApiError ? cause.message : "Não foi possível concluir o pedido.",
      );
    } finally {
      setPlacing(false);
    }
  };

  // Guardas de conteúdo — depois de todos os hooks acima.
  if (loading && !catalog) {
    return (
      <Screen title="Checkout" scroll={false}>
        <Loading label="Carregando catálogo…" />
      </Screen>
    );
  }
  if (error && !catalog) {
    return (
      <Screen title="Checkout" scroll={false}>
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
  if (step !== "pedido" && lines.length === 0) {
    return (
      <Screen title="Checkout" scroll={false}>
        <EmptyState
          icon="cart-outline"
          title="Nada para pagar ainda."
          message="Seu carrinho está vazio."
          actionLabel="Ver a loja"
          onAction={() => router.replace("/shop")}
        />
      </Screen>
    );
  }

  const stepIndex = step === "pedido" ? -1 : STEPS.indexOf(step as FormStep);

  return (
    <Screen title="Checkout">
      <View style={{ paddingTop: 16, paddingHorizontal: ScreenPadding, gap: 16 }}>
        <Stepper current={step} />

        {step !== "dados" && step !== "pedido" ? (
          <Pressable
            onPress={goBack}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [
              { flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={15} color={Colors.textMuted} />
            <Text
              style={{
                fontFamily: Fonts.bodyMedium,
                fontSize: 12.5,
                letterSpacing: 0.4,
                color: Colors.textMuted,
              }}
            >
              Voltar para {STEP_TITLE[STEPS[Math.max(0, stepIndex - 1)] as FormStep]}
            </Text>
          </Pressable>
        ) : null}

        {/* ------------------------------------------------------------ dados */}
        {step === "dados" ? (
          <View style={{ gap: 14 }}>
            <StepHeading
              title="Dados"
              hint={
                user
                  ? "Você está comprando como usuário logado — dados pré-preenchidos."
                  : "Você pode comprar como convidado ou entrar na sua conta."
              }
            />
            {dadosError ? <ErrorText>{dadosError}</ErrorText> : null}
            <Field
              label="Nome completo"
              value={name}
              onChangeText={setName}
              placeholder="Nome completo"
              autoComplete="name"
            />
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label="Telefone (opcional)"
              value={phone}
              onChangeText={(text) => setPhone(formatPhoneInput(text))}
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
            />
            <Button label="Continuar para entrega" onPress={goNext} />
          </View>
        ) : null}

        {/* ---------------------------------------------------------- entrega */}
        {step === "entrega" ? (
          <View style={{ gap: 14 }}>
            <StepHeading
              title="Entrega"
              hint={
                hasPhysical
                  ? "Informe o endereço para calcular o frete."
                  : "Seu pedido é 100% digital — nada será enviado."
              }
            />
            {hasPhysical ? (
              <>
                <Field
                  label="CEP"
                  value={displayCep(digits)}
                  onChangeText={(text) => setCep(cepDigitsOf(text))}
                  placeholder="00000-000"
                  keyboardType="numeric"
                  maxLength={9}
                />
                <Field
                  label="Rua"
                  value={street}
                  onChangeText={setStreet}
                  placeholder="Rua, avenida…"
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Número"
                      value={number}
                      onChangeText={setNumber}
                      placeholder="123"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1.6 }}>
                    <Field
                      label="Complemento"
                      value={complement}
                      onChangeText={setComplement}
                      placeholder="Opcional"
                    />
                  </View>
                </View>
                <Field
                  label="Bairro"
                  value={neighborhood}
                  onChangeText={setNeighborhood}
                  placeholder="Bairro"
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 2 }}>
                    <Field
                      label="Cidade"
                      value={city}
                      onChangeText={setCity}
                      placeholder="Cidade"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="UF"
                      value={state}
                      onChangeText={(text) => setState(text.toUpperCase())}
                      placeholder="SP"
                      autoCapitalize="characters"
                      maxLength={2}
                    />
                  </View>
                </View>

                {digits.length === 8 ? (
                  quoteReady && quote ? (
                    <View style={{ gap: 10 }}>
                      <Text style={LABEL}>Modalidade de envio</Text>
                      {quote.options.map((option) => (
                        <OptionRow
                          key={option.id}
                          title={option.label}
                          subtitle={option.free ? "Grátis" : formatBRL(option.price)}
                          selected={shippingOption === option.id}
                          onPress={() => setShippingOption(option.id)}
                        />
                      ))}
                      {quote.plusFree ? (
                        <Text style={HINT}>
                          Cliffhanger+ ativo — frete grátis aplicado neste pedido.
                        </Text>
                      ) : subtotal < quote.freeShippingFrom ? (
                        <Text style={HINT}>
                          Frete grátis acima de {formatBRL(quote.freeShippingFrom)}.
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={HINT}>
                      {quoteError && quoteCep === digits ? quoteError : "Calculando frete…"}
                    </Text>
                  )
                ) : null}
              </>
            ) : (
              <Notice
                icon="cloud-done-outline"
                text="Pedido 100% digital — os itens liberam na Biblioteca após a confirmação do pagamento."
              />
            )}
            {entregaError ? <ErrorText>{entregaError}</ErrorText> : null}
            <Button label="Continuar para pagamento" onPress={goNext} />
          </View>
        ) : null}

        {/* -------------------------------------------------------- pagamento */}
        {step === "pagamento" ? (
          <View style={{ gap: 14 }}>
            <StepHeading
              title="Pagamento"
              hint="Escolha como pagar e aplique um cupom, se tiver."
            />
            <View style={{ gap: 10 }}>
              {PAYMENT_OPTIONS.map((option) => (
                <OptionRow
                  key={option.key}
                  icon={option.icon}
                  title={option.label}
                  subtitle={option.hint}
                  selected={paymentMethod === option.key}
                  onPress={() => setPaymentMethod(option.key)}
                />
              ))}
            </View>
            <Text style={HINT}>
              Ambiente de demonstração (PagBank sandbox) — nenhum pagamento real é processado.
            </Text>

            <View style={[CARD, { gap: 10 }]}>
              <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text }}>
                Cupom de desconto
              </Text>
              {appliedCoupon ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted }}>
                    <Text style={{ fontFamily: Fonts.bodyBold, color: Colors.accent }}>
                      {appliedCoupon.code}
                    </Text>{" "}
                    · −{formatBRL(appliedCoupon.discount)}
                  </Text>
                  <Pressable onPress={removeCoupon} hitSlop={8} accessibilityRole="button">
                    <Text
                      style={{
                        fontFamily: Fonts.bodyMedium,
                        fontSize: 12.5,
                        letterSpacing: 0.4,
                        color: Colors.accent,
                      }}
                    >
                      Remover
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Field
                    label="Código do cupom"
                    value={couponInput}
                    onChangeText={(text) => setCouponInput(text.toUpperCase())}
                    placeholder="Ex.: BEMVINDO10"
                    autoCapitalize="characters"
                  />
                  <Button
                    label={couponBusy ? "Validando…" : "Aplicar"}
                    variant="secondary"
                    loading={couponBusy}
                    disabled={couponBusy || !couponInput.trim()}
                    onPress={applyCoupon}
                    style={{ minHeight: 44 }}
                  />
                </>
              )}
              {couponError ? <ErrorText>{couponError}</ErrorText> : null}
            </View>

            <Button label="Revisar pedido" onPress={goNext} />
          </View>
        ) : null}

        {/* ---------------------------------------------------------- revisao */}
        {step === "revisao" ? (
          <View style={{ gap: 14 }}>
            <StepHeading title="Revisão" hint="Confira os itens e confirme o pedido." />

            <View style={[CARD, { gap: 12 }]}>
              {lines.map(({ item, product }) => (
                <View key={item.productId} style={{ flexDirection: "row", gap: 10 }}>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: Fonts.bodySemi,
                      fontSize: 13,
                      lineHeight: 17,
                      color: Colors.text,
                    }}
                    numberOfLines={2}
                  >
                    {product!.title}
                  </Text>
                  <Text style={{ fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted }}>
                    {item.qty} × {formatBRL(product!.price)}
                  </Text>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: Colors.line }} />
              <SummaryLine label="Subtotal" value={formatBRL(subtotal)} />
              {appliedCoupon && discount > 0 ? (
                <SummaryLine
                  label={`Cupom ${appliedCoupon.code}`}
                  value={`−${formatBRL(discount)}`}
                />
              ) : null}
              <SummaryLine
                label="Frete"
                value={
                  !hasPhysical
                    ? "Isento (digital)"
                    : quoteReady && selectedOption
                      ? selectedOption.free
                        ? "Grátis"
                        : formatBRL(selectedOption.price)
                      : "A calcular"
                }
              />
              <SummaryLine label="Pagamento" value={PAYMENT_LABEL[paymentMethod]} />
              <SummaryLine label="Total" value={formatBRL(total)} strong />
            </View>

            <Pressable
              onPress={() => setGiftOn((v) => !v)}
              accessibilityRole="switch"
              accessibilityState={{ checked: giftOn }}
              style={({ pressed }) => [
                CARD,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="gift-outline" size={20} color={Colors.accent} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{ fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.text }}
                >
                  É um presente
                </Text>
                <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted }}>
                  Destinatário, recado e embrulho no acompanhamento.
                </Text>
              </View>
              <Ionicons
                name={giftOn ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={giftOn ? Colors.accent : Colors.textFaint}
              />
            </Pressable>

            {giftOn ? (
              <View style={{ gap: 14 }}>
                <Field
                  label="Destinatário"
                  value={giftTo}
                  onChangeText={setGiftTo}
                  placeholder="Quem vai receber (destinatário)"
                />
                <Field
                  label="Recado (opcional)"
                  value={giftMessage}
                  onChangeText={setGiftMessage}
                  placeholder="Mensagem para quem recebe"
                />
                <Pressable
                  onPress={() => setGiftWrap((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: giftWrap }}
                  style={({ pressed }) => [
                    { flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Ionicons
                    name={giftWrap ? "checkbox" : "square-outline"}
                    size={20}
                    color={giftWrap ? Colors.accent : Colors.textFaint}
                  />
                  <Text style={{ fontFamily: Fonts.body, fontSize: 13.5, color: Colors.text }}>
                    Embrulhar para presente
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {orderError ? <ErrorText>{orderError}</ErrorText> : null}
            <Button
              label="Confirmar pedido"
              onPress={() => void placeOrder()}
              loading={placing}
              disabled={placing}
            />
            <Button
              label="Voltar para pagamento"
              variant="secondary"
              onPress={() => setStep("pagamento")}
            />
          </View>
        ) : null}

        {/* ------------------------------------------------------------ pedido */}
        {step === "pedido" && result ? (
          <View style={{ gap: 14, alignItems: "center" }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={34} color={Colors.onAccent} />
            </View>
            <Text
              style={{
                fontFamily: Fonts.display,
                fontSize: 28,
                letterSpacing: 1.4,
                color: Colors.text,
                textAlign: "center",
              }}
            >
              PEDIDO REALIZADO
            </Text>
            <Text
              style={{
                fontFamily: Fonts.body,
                fontSize: 13.5,
                color: Colors.textMuted,
                textAlign: "center",
              }}
            >
              Pedido {result.code} · {formatBRL(result.total)}
            </Text>
            <StatusBadge label="Aguardando pagamento" />

            <View style={[CARD, { alignSelf: "stretch", gap: 10 }]}>
              <SummaryLine label="Pagamento" value={PAYMENT_LABEL[paymentMethod]} />
              {result.discount > 0 ? (
                <SummaryLine label="Desconto" value={`−${formatBRL(result.discount)}`} />
              ) : null}
              <SummaryLine
                label="Frete"
                value={
                  !placedPhysical
                    ? "Isento (digital)"
                    : result.shipping > 0
                      ? formatBRL(result.shipping)
                      : "Grátis"
                }
              />
              <SummaryLine label="Total" value={formatBRL(result.total)} strong />
            </View>

            {result.digitalItems.length > 0 ? (
              <Notice
                icon={user ? "library-outline" : "person-circle-outline"}
                text={
                  user
                    ? "Os itens digitais já estão na sua Biblioteca — leia ou ouça pelo app."
                    : "Entre na conta com este e-mail para liberar os itens digitais na Biblioteca."
                }
              />
            ) : null}
            <Notice
              icon="time-outline"
              text={
                paymentMethod === "pix"
                  ? "Assim que o PIX for confirmado, o pedido sai de Aguardando pagamento — acompanhe em Meus pedidos."
                  : "Após a confirmação do pagamento, acompanhe o status em Meus pedidos."
              }
            />

            <View style={{ alignSelf: "stretch", gap: 10 }}>
              {user && result.digitalItems.length > 0 ? (
                <Button
                  label="Ir para a biblioteca"
                  onPress={() => router.replace("/library")}
                />
              ) : null}
              {user ? (
                <Button
                  label="Ver meus pedidos"
                  variant={result.digitalItems.length > 0 ? "secondary" : "primary"}
                  onPress={() => router.replace("/orders")}
                />
              ) : (
                <Button label="Ver a loja" onPress={() => router.replace("/shop")} />
              )}
              {user ? (
                <Button
                  label="Continuar comprando"
                  variant="secondary"
                  onPress={() => router.replace("/shop")}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Blocos locais
// ---------------------------------------------------------------------------

const LABEL = {
  fontFamily: Fonts.bodyMedium,
  fontSize: 11,
  letterSpacing: 1.4,
  color: Colors.textMuted,
  textTransform: "uppercase" as const,
};

const HINT = {
  fontFamily: Fonts.body,
  fontSize: 12,
  lineHeight: 17,
  color: Colors.textFaint,
};

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontFamily: Fonts.display,
          fontSize: 24,
          letterSpacing: 1.2,
          color: Colors.text,
        }}
      >
        {title.toUpperCase()}
      </Text>
      <Text style={{ fontFamily: Fonts.body, fontSize: 12.5, lineHeight: 17, color: Colors.textMuted }}>
        {hint}
      </Text>
    </View>
  );
}

function Stepper({ current }: { current: Step }) {
  const idx = current === "pedido" ? STEPS.length : STEPS.indexOf(current);
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {STEPS.map((s, i) => {
        const active = s === current;
        const done = current === "pedido" || i < idx;
        return (
          <View key={s} style={{ flex: 1, gap: 5 }}>
            <View
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: active ? Colors.accent : done ? Colors.primary : Colors.line,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                fontFamily: active ? Fonts.bodyBold : Fonts.body,
                fontSize: 9.5,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: active ? Colors.accent : done ? Colors.textMuted : Colors.textFaint,
              }}
            >
              {i + 1}. {STEP_TITLE[s]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function OptionRow({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        CARD,
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderColor: selected ? Colors.accent : Colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={selected ? Colors.accent : Colors.textMuted}
        />
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={20}
        color={selected ? Colors.accent : Colors.textFaint}
      />
    </Pressable>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text
        style={{
          fontFamily: strong ? Fonts.bodyBold : Fonts.bodyMedium,
          fontSize: strong ? 14 : 11.5,
          letterSpacing: strong ? 0.4 : 1.1,
          textTransform: strong ? undefined : "uppercase",
          color: strong ? Colors.text : Colors.textMuted,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.bodyBold,
          fontSize: strong ? 20 : 14,
          color: strong ? Colors.accent : Colors.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 12.5, color: Colors.warning }}>
      {children}
    </Text>
  );
}

function Notice({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        padding: 14,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceAlt,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      <Ionicons name={icon} size={18} color={Colors.accent} style={{ marginTop: 1 }} />
      <Text
        style={{
          flex: 1,
          fontFamily: Fonts.body,
          fontSize: 12.5,
          lineHeight: 17,
          color: Colors.textMuted,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function StatusBadge({ label }: { label: string }) {
  const color = Colors.accent;
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.bodyBold,
          fontSize: 10.5,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
