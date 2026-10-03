/**
 * §23 — upload de fotos de avaliação direto para o Cloudinary com preset
 * unsigned (mesmo preset público da loja: cloud name + preset são públicos
 * por definição, nenhuma chave secreta no app).
 *
 * Aceita o asset do expo-image-picker nas três plataformas:
 * - web: `asset.file` (File) ou `uri` blob:;
 * - nativo: `uri` file:// (o fetch do RN entende o objeto { uri, name, type }).
 */
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — mesmo limite do site

export interface PickedImage {
  uri: string;
  file?: File;
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string;
}

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

export async function uploadImage(asset: PickedImage): Promise<UploadResult> {
  const cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloud || !preset) {
    return {
      ok: false,
      message: "Cloudinary não configurado no app (EXPO_PUBLIC_CLOUDINARY_*).",
    };
  }

  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    return { ok: false, message: "Imagem muito grande (máx. 8 MB)." };
  }

  const name = asset.fileName ?? "foto.jpg";
  const type = asset.mimeType ?? "image/jpeg";
  const form = new FormData();

  if (asset.file) {
    // web (expo-image-picker entrega o File)
    form.append("file", asset.file, name);
  } else if (asset.uri.startsWith("blob:") || asset.uri.startsWith("http")) {
    // blob: (web) precisa virar Blob antes de ir ao FormData
    try {
      const blob = await (await fetch(asset.uri)).blob();
      form.append("file", blob, name);
    } catch {
      return { ok: false, message: "Falha ao ler a imagem selecionada." };
    }
  } else {
    // nativo (file://) — o fetch do RN serializa { uri, name, type }
    form.append("file", { uri: asset.uri, name, type } as unknown as Blob);
  }

  form.append("upload_preset", preset);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: form,
    });
  } catch {
    return { ok: false, message: "Falha de rede no upload." };
  }

  if (!res.ok) {
    return { ok: false, message: `Cloudinary recusou o upload (HTTP ${res.status}).` };
  }

  try {
    const data = (await res.json()) as { secure_url?: string };
    if (!data.secure_url) {
      return { ok: false, message: "Resposta sem URL da imagem." };
    }
    return { ok: true, url: data.secure_url };
  } catch {
    return { ok: false, message: "Resposta inválida do Cloudinary." };
  }
}
