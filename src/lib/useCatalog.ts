/**
 * Hook do catálogo — compartilha o cache de src/lib/api.ts entre as telas,
 * com estados de carregamento/erro e recarga forçada.
 */
import { useCallback, useEffect, useState } from "react";

import { loadCatalog, peekCatalog } from "./api";
import type { Catalog } from "./types";

interface CatalogState {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
}

const initial: CatalogState = { catalog: null, loading: true, error: null };

export function useCatalog() {
  const [state, setState] = useState<CatalogState>(() => {
    const cached = peekCatalog();
    return cached ? { catalog: cached, loading: false, error: null } : initial;
  });

  const fetchNow = useCallback((force: boolean) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    loadCatalog(force)
      .then((catalog) => setState({ catalog, loading: false, error: null }))
      .catch((e: unknown) =>
        setState({
          catalog: null,
          loading: false,
          error: e instanceof Error ? e.message : "Erro ao carregar o catálogo.",
        }),
      );
  }, []);

  useEffect(() => {
    // loadCatalog resolve na hora se houver cache — o .then é assíncrono
    let cancelled = false;
    loadCatalog(false)
      .then((catalog) => {
        if (!cancelled) setState({ catalog, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({
            catalog: null,
            loading: false,
            error: e instanceof Error ? e.message : "Erro ao carregar o catálogo.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(() => fetchNow(true), [fetchNow]);

  return { ...state, reload };
}
