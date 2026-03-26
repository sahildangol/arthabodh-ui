import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SYMBOL,
  type Company,
  type WatchlistEntry,
  MarketPreferenceService,
  mergeCompanyWithWatchlist,
  resolveDefaultCompany,
} from "../../services/marketPreferenceService";

type HookState = {
  companies: Company[];
  watchlist: WatchlistEntry[];
  loading: boolean;
};

const defaultState: HookState = {
  companies: [],
  watchlist: [],
  loading: true,
};

export const useCompanyWatchlist = () => {
  const [state, setState] = useState<HookState>(defaultState);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true }));

    const userId = MarketPreferenceService.getCurrentUserId();
    const [companies, watchlist] = await Promise.all([
      MarketPreferenceService.getCompanies(),
      MarketPreferenceService.getWatchlist(userId),
    ]);

    setState({
      companies,
      watchlist,
      loading: false,
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refresh]);

  const companyOptions = useMemo(
    () => mergeCompanyWithWatchlist(state.companies, state.watchlist),
    [state.companies, state.watchlist],
  );

  const activeCompanyIds = useMemo(
    () =>
      new Set(
        state.watchlist
          .filter((entry) => entry.is_active)
          .map((entry) => entry.company_id),
      ),
    [state.watchlist],
  );

  const defaultCompany = useMemo(
    () => resolveDefaultCompany(companyOptions, DEFAULT_SYMBOL),
    [companyOptions],
  );

  const ensureInWatchlist = useCallback(
    async (company: Company, note: string) => {
      if (activeCompanyIds.has(company.company_id)) return;

      const created = await MarketPreferenceService.addToWatchlist(
        company.company_id,
        note,
      );

      setState((previous) => {
        if (
          previous.watchlist.some(
            (entry) =>
              entry.company_id === company.company_id
              && entry.is_active,
          )
        ) {
          return previous;
        }

        const fallbackUserId = MarketPreferenceService.getCurrentUserId();
        const fallbackEntry: WatchlistEntry = {
          user_id: fallbackUserId,
          company_id: company.company_id,
          symbol: company.symbol,
          company_name: company.company_name,
          note,
          is_active: true,
        };

        return {
          ...previous,
          watchlist: [created ?? fallbackEntry, ...previous.watchlist],
        };
      });
    },
    [activeCompanyIds],
  );

  return {
    loading: state.loading,
    companies: state.companies,
    watchlist: state.watchlist,
    companyOptions,
    defaultCompany,
    refresh,
    ensureInWatchlist,
  };
};
