/**
 * §19/§24 — avaliações reais do produto: lista pública de aprovadas
 * (GET /api/reviews) com estados de carga/erro/vazio e envio autenticado
 * (POST /api/reviews) com estrelas, nome, comentário e fotos — fotos sobem
 * direto no Cloudinary (§23) e a avaliação entra como pendente na moderação.
 */
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

import { Button } from "@/components/Button";
import { Stars } from "@/components/Stars";
import { Colors, Fonts, Radius } from "@/constants/theme";
import { ApiError, loadReviews, submitReview } from "@/lib/api";
import { formatDate } from "@/lib/catalog";
import type { PublicReview } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { uploadImage } from "@/lib/upload";

const CARD: ViewStyle = {
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.md,
  padding: 16,
};

const LABEL: TextStyle = {
  fontFamily: Fonts.bodyMedium,
  fontSize: 11,
  letterSpacing: 1.4,
  color: Colors.textMuted,
  textTransform: "uppercase",
};

/** Rótulo de campo (mesmo padrão do Field). */
function FormLabel({ children }: { children: string }) {
  return <Text style={LABEL}>{children}</Text>;
}

/** Caixa de texto multiline com contador (comentário §19). */
function TextArea({
  value,
  onChangeText,
  placeholder,
  maxLength,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          backgroundColor: Colors.surfaceAlt,
          borderWidth: 1,
          borderColor: focused ? Colors.accent : Colors.border,
          borderRadius: Radius.sm,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textFaint}
          multiline
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            minHeight: 96,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontFamily: Fonts.body,
            fontSize: 15,
            lineHeight: 21,
            color: Colors.text,
            textAlignVertical: "top",
          }}
        />
      </View>
      <Text style={{ alignSelf: "flex-end", fontFamily: Fonts.body, fontSize: 11, color: Colors.textFaint }}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
}

/** Seletor de nota (1–5 estrelas clicáveis). */
function RatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Pressable
          key={step}
          onPress={() => onChange(step)}
          accessibilityRole="button"
          accessibilityLabel={`Nota ${step} de 5`}
          hitSlop={4}
        >
          {({ pressed }) => (
            <Ionicons
              name={step <= value ? "star" : "star-outline"}
              size={26}
              color={Colors.accent}
              style={{ opacity: step <= value ? 1 : pressed ? 0.7 : 0.4 }}
            />
          )}
        </Pressable>
      ))}
    </View>
  );
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [items, setItems] = useState<PublicReview[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const { user, getIdToken } = useAuth();

  useEffect(() => {
    let alive = true;
    loadReviews(productId)
      .then((data) => {
        if (!alive) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setPhase("ready");
      })
      .catch(() => {
        if (alive) setPhase("error");
      });
    return () => {
      alive = false;
    };
  }, [productId, retryTick]);

  const onPickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 3 - photos.length),
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    setFormError(null);
    const room = 3 - photos.length;
    const added: string[] = [];
    for (const asset of result.assets.slice(0, room)) {
      const up = await uploadImage({
        uri: asset.uri,
        file: asset.file,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
      });
      if (up.ok) added.push(up.url);
      else setFormError(up.message);
    }
    setUploading(false);
    if (added.length) setPhotos((prev) => [...prev, ...added].slice(0, 3));
  };

  const onSubmit = async () => {
    setFormError(null);
    const trimmed = comment.trim();
    if (rating < 1 || rating > 5) {
      setFormError("A nota vai de 1 a 5 estrelas.");
      return;
    }
    if (!name.trim()) {
      setFormError("Informe seu nome na avaliação.");
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 2000) {
      setFormError("O comentário precisa de 3 a 2000 caracteres.");
      return;
    }

    setSending(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setFormError("Entre na sua conta para avaliar.");
        return;
      }
      await submitReview(token, {
        productId,
        authorName: name.trim(),
        rating,
        comment: trimmed,
        photos,
      });
      setSent(true);
      setFormOpen(false);
      setComment("");
      setPhotos([]);
    } catch (e) {
      setFormError(
        e instanceof ApiError ? e.message : "Falha de rede ao enviar. Tente novamente.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ gap: 12, paddingHorizontal: 16 }}>
      {/* estados (§24) */}
      {phase === "loading" ? (
        <View style={[CARD, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
          <ActivityIndicator color={Colors.accent} />
          <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted }}>
            Carregando avaliações…
          </Text>
        </View>
      ) : null}

      {phase === "error" ? (
        <View style={CARD}>
          <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: "#e5484d" }}>
            Não foi possível carregar as avaliações.
          </Text>
          <View style={{ marginTop: 12 }}>
            <Button
              label="Tentar de novo"
              variant="secondary"
              style={{ minHeight: 40, alignSelf: "flex-start", paddingHorizontal: 16 }}
              onPress={() => {
                setPhase("loading");
                setRetryTick((tick) => tick + 1);
              }}
            />
          </View>
        </View>
      ) : null}

      {phase === "ready" && items.length === 0 ? (
        <View style={CARD}>
          <Text style={{ fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, color: Colors.textMuted }}>
            Ainda não há avaliações publicadas para este produto. Seja o primeiro a contar como
            foi.
          </Text>
        </View>
      ) : null}

      {/* lista */}
      {phase === "ready" && items.length > 0 ? (
        <View style={{ gap: 12 }}>
          {items.map((review) => (
            <View key={review.id} style={CARD}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Stars rating={review.rating} size={14} />
                <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textFaint }}>
                  {formatDate(review.createdAt)}
                </Text>
              </View>

              <Text
                style={{
                  marginTop: 10,
                  fontFamily: Fonts.body,
                  fontSize: 13.5,
                  lineHeight: 20,
                  color: Colors.textMuted,
                }}
              >
                “{review.comment}”
              </Text>

              {review.photos.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {review.photos.map((photo) => (
                    <Image
                      key={photo}
                      source={{ uri: photo }}
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: Radius.sm,
                        borderWidth: 1,
                        borderColor: Colors.border,
                      }}
                      accessibilityLabel="Foto da avaliação"
                    />
                  ))}
                </View>
              ) : null}

              <View
                style={{
                  marginTop: 12,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.bodyBold,
                    fontSize: 11,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: Colors.accent,
                  }}
                >
                  {review.authorName}
                </Text>
                {review.verified ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      borderWidth: 1,
                      borderColor: "#30a46c66",
                      backgroundColor: "#30a46c1a",
                      borderRadius: Radius.pill,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={11} color="#30a46c" />
                    <Text
                      style={{
                        fontFamily: Fonts.bodyBold,
                        fontSize: 9.5,
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                        color: "#30a46c",
                      }}
                    >
                      Compra verificada
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* envio (§19) */}
      <View style={CARD}>
        {sent ? (
          <Text style={{ fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, color: Colors.textMuted }}>
            Sua avaliação foi enviada e está aguardando moderação. Obrigado por participar da
            Cliffhanger Store.
          </Text>
        ) : !user ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, color: Colors.textMuted }}>
              Comprou este produto? Avalie com estrelas, comentário e fotos.
            </Text>
            <Button
              label="Entre para avaliar"
              style={{ minHeight: 40, alignSelf: "flex-start", paddingHorizontal: 16 }}
              onPress={() => router.push("/account")}
            />
          </View>
        ) : !formOpen ? (
          <Button
            label="Avaliar este produto"
            style={{ minHeight: 42, alignSelf: "flex-start", paddingHorizontal: 18 }}
            onPress={() => {
              setFormOpen(true);
              if (!name) {
                setName(user.displayName || user.email?.split("@")[0] || "");
              }
            }}
          />
        ) : (
          <View style={{ gap: 14 }}>
            <FormLabel>Sua avaliação</FormLabel>

            <View style={{ gap: 8 }}>
              <FormLabel>Nota</FormLabel>
              <RatingInput value={rating} onChange={setRating} />
            </View>

            <View style={{ gap: 6 }}>
              <FormLabel>Seu nome</FormLabel>
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={80}
                placeholder="Como você quer ser chamado"
                placeholderTextColor={Colors.textFaint}
                autoCapitalize="words"
                style={{
                  backgroundColor: Colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: Radius.sm,
                  minHeight: 48,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontFamily: Fonts.body,
                  fontSize: 15,
                  color: Colors.text,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <FormLabel>Comentário</FormLabel>
              <TextArea
                value={comment}
                onChangeText={setComment}
                placeholder="Conte como foi a leitura, a qualidade do produto, a entrega…"
                maxLength={2000}
              />
            </View>

            <View style={{ gap: 8 }}>
              <FormLabel>Fotos (até 3)</FormLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {photos.map((photo) => (
                  <View
                    key={photo}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: Radius.sm,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={{ width: "100%", height: "100%" }}
                      accessibilityLabel="Foto escolhida"
                    />
                    <Pressable
                      onPress={() => setPhotos((prev) => prev.filter((p) => p !== photo))}
                      accessibilityRole="button"
                      accessibilityLabel="Remover foto"
                      hitSlop={6}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#0E0000E6",
                      }}
                    >
                      <Ionicons name="close" size={12} color="#F8FEFF" />
                    </Pressable>
                  </View>
                ))}
                {photos.length < 3 ? (
                  <Pressable
                    onPress={() => void onPickPhotos()}
                    disabled={uploading}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      {
                        minHeight: 36,
                        paddingHorizontal: 14,
                        borderRadius: Radius.sm,
                        borderWidth: 1,
                        borderColor: Colors.primary,
                        backgroundColor: Colors.surfaceAlt,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: uploading ? 0.6 : pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: Fonts.bodySemi,
                        fontSize: 11.5,
                        color: Colors.text,
                      }}
                    >
                      {uploading ? "Enviando…" : "Adicionar foto"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {formError ? (
              <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 12, color: "#e5484d" }}>
                {formError}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Button
                label={sending ? "Enviando…" : "Enviar avaliação"}
                loading={sending}
                disabled={uploading}
                style={{ minHeight: 40, paddingHorizontal: 16 }}
                onPress={() => void onSubmit()}
              />
              <Button
                label="Cancelar"
                variant="secondary"
                style={{ minHeight: 40, paddingHorizontal: 16 }}
                onPress={() => {
                  setFormOpen(false);
                  setFormError(null);
                }}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
