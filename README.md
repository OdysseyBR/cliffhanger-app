# Cliffhanger Store — App mobile

Aplicativo oficial da Cliffhanger Store (Documento Mestre §10 / Fase 5),
construído com **Expo SDK 57 + React Native + TypeScript** — experiência
própria, não uma versão WebView do site.

## Funcionalidades (Lote 1)

- Navegação inferior §10.1: **Início · Loja · Buscar · Biblioteca · Conta**,
  com carrinho no topo em todas as telas.
- Home do app §10.2: Continue lendo · Continue ouvindo · Recomendado para
  você · Novidades · Seus universos · Wishlist · Próximos lançamentos —
  dados reais da loja.
- Login/cadastro/recuperação de senha com a **conta única** Firebase
  (o mesmo acesso da loja web).
- Catálogo com filtros por categoria, busca textual, detalhe do produto,
  wishlist e carrinho local.

## Requisitos

- Node.js 20+ e npm.
- Arquivo `.env` (use `.env.example` como modelo — web config pública do
  Firebase + `EXPO_PUBLIC_STORE_URL`).

## Comandos

```bash
npm install          # dependências
npx expo start       # dev server (QR code para o Expo Go / simulador)
npm run web          # preview web
npm run android      # Android
npm run ios          # iOS (macOS)
npx tsc --noEmit     # typecheck
npm run lint         # eslint
npx expo export -p web -p android   # build de produção (bundle)
npx expo-doctor      # diagnóstico
```

## Arquitetura de dados

- **API da Store** (`EXPO_PUBLIC_STORE_URL/api/…`): catálogo público
  (`/api/products`) e biblioteca da sessão (`/api/library` com `Bearer` do
  ID token) — mesma regra de negócio do site.
- **Firebase Auth**: sessão persistida em AsyncStorage no nativo; a wishlist
  sincroniza com `users/{uid}.wishlist` (igual ao `Providers.tsx` da loja).
- **Carrinho local**: `{ productId, qty }` em AsyncStorage (formato do site).

## Estrutura

```
src/
  app/                rotas (expo-router)
    (tabs)/           5 abas + index (Home §10.2)
    product/[id]/     detalhe do produto
    cart.tsx          carrinho
  components/         capa SVG, cards, trilhos, formulários
  lib/                firebase/auth por plataforma, API, hooks, regras
  constants/theme.ts  paleta oficial #0C0014 · #5603AD · #F8FEFF · #FDC500
```

## Roadmap (fases do Documento Mestre)

Lotes seguintes: leitor de e-book/audiobook, Minha Coleção, Scanner (§10.3),
QR Codes (§10.4), notificações e publicação (EAS/Play Store/App Store).
