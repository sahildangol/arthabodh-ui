import { jwtDecode } from "jwt-decode";

const API_BASE_URL = "http://localhost:8001";
const COMPANY_ENDPOINT = `${API_BASE_URL}/company/`;
const WATCHLIST_ENDPOINT = `${API_BASE_URL}/user-preference/watchlist`;
const MOMENTUM_PREDICT_ENDPOINT = `${API_BASE_URL}/inference/predict`;
const ADVANCED_PREDICT_ENDPOINT = `${API_BASE_URL}/inference/predict/advanced`;
const LIVE_OVERVIEW_ENDPOINT = `${API_BASE_URL}/market-data/live-overview`;
const LIVE_FULL_ENDPOINT = `${API_BASE_URL}/market-data/live-full`;
const MARKET_SUMMARY_ENDPOINT = `${API_BASE_URL}/market-data/summary`;
const IS_NEPSE_OPEN_ENDPOINT = `${API_BASE_URL}/market-data/is-nepse-open`;
const COMPANY_PAGE_SIZE = 500;
const COMPANY_MAX_PAGES = 40;

export const DEFAULT_SYMBOL = "NABIL";

export type Company = {
  company_id: number;
  symbol: string;
  company_name?: string;
};

export type WatchlistEntry = {
  id?: number;
  user_id: number;
  company_id: number;
  symbol?: string;
  company_name?: string;
  note?: string;
  is_active: boolean;
};

type TokenPayload = {
  user_id?: number | string;
  sub?: number | string;
};

export class MarketApiError extends Error {
  status: number;
  endpoint: string;
  detail?: string;

  constructor(
    endpoint: string,
    status: number,
    message: string,
    detail?: string,
  ) {
    super(message);
    this.name = "MarketApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.detail = detail;
  }
}

const FALLBACK_COMPANIES: Company[] = [
  { company_id: 1, symbol: "NABIL", company_name: "Nabil Bank Limited" },
  { company_id: 2, symbol: "NICA", company_name: "NIC Asia Bank Limited" },
  { company_id: 3, symbol: "EBL", company_name: "Everest Bank Limited" },
  { company_id: 4, symbol: "KBL", company_name: "Kumari Bank Limited" },
  { company_id: 5, symbol: "SBI", company_name: "Nepal SBI Bank Limited" },
  { company_id: 6, symbol: "SBL", company_name: "Sanima Bank Limited" },
  { company_id: 7, symbol: "NMB", company_name: "NMB Bank Limited" },
  { company_id: 8, symbol: "MBL", company_name: "Machhapuchchhre Bank Limited" },
];

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const safeJson = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const readApiErrorDetail = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const row = payload as Record<string, unknown>;

  const direct =
    toStringValue(row.detail)
    ?? toStringValue(row.message)
    ?? toStringValue(row.error);
  if (direct) return direct;

  const errors = row.errors;
  if (Array.isArray(errors) && errors.length) {
    const first = errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const nested = first as Record<string, unknown>;
      return (
        toStringValue(nested.detail)
        ?? toStringValue(nested.message)
        ?? toStringValue(nested.error)
      );
    }
  }

  return undefined;
};

const toApiError = async (
  response: Response,
  endpoint: string,
  fallbackMessage: string,
) => {
  const payload = await safeJson<unknown>(response);
  const detail = readApiErrorDetail(payload);
  const composed = detail ? `${fallbackMessage}: ${detail}` : fallbackMessage;

  return new MarketApiError(endpoint, response.status, composed, detail);
};

const findCollectionInPayload = (
  raw: unknown,
  candidateKeys: string[],
  depth = 0,
): unknown[] => {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object" || depth > 3) return [];

  const payload = raw as Record<string, unknown>;

  for (const key of candidateKeys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(payload)) {
    const nested = findCollectionInPayload(value, candidateKeys, depth + 1);
    if (nested.length) return nested;
  }

  return [];
};

const parseCompanyRecord = (item: unknown, fallbackId: number): Company | null => {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;

  const rawSymbol =
    toStringValue(row.symbol)
    ?? toStringValue(row.company_symbol)
    ?? toStringValue(row.ticker);

  if (!rawSymbol) return null;

  const symbol = rawSymbol.toUpperCase();
  const companyId =
    toNumber(row.company_id)
    ?? toNumber(row.id)
    ?? fallbackId;

  const companyName =
    toStringValue(row.company_name)
    ?? toStringValue(row.name)
    ?? toStringValue(row.companyName);

  return {
    company_id: companyId,
    symbol,
    ...(companyName ? { company_name: companyName } : {}),
  };
};

const parseWatchlistRecord = (
  item: unknown,
  userIdFallback: number,
): WatchlistEntry | null => {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;

  const nestedCompany =
    row.company && typeof row.company === "object"
      ? (row.company as Record<string, unknown>)
      : null;

  const companyId =
    toNumber(row.company_id)
    ?? toNumber(row.companyId)
    ?? toNumber(nestedCompany?.company_id)
    ?? toNumber(nestedCompany?.id);

  if (companyId === null) return null;

  const symbol =
    toStringValue(row.symbol)
    ?? toStringValue(nestedCompany?.symbol)
    ?? toStringValue(nestedCompany?.ticker);

  const companyName =
    toStringValue(row.company_name)
    ?? toStringValue(nestedCompany?.company_name)
    ?? toStringValue(nestedCompany?.name);

  const parsedUserId =
    toNumber(row.user_id)
    ?? toNumber(row.userId)
    ?? userIdFallback;

  return {
    id: toNumber(row.id) ?? undefined,
    user_id: parsedUserId,
    company_id: companyId,
    symbol: symbol?.toUpperCase(),
    company_name: companyName,
    note: toStringValue(row.note),
    is_active: row.is_active === false ? false : true,
  };
};

export const getCurrentUserId = (): number => {
  const token = localStorage.getItem("token");
  if (!token) return 1;

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const resolved = toNumber(decoded.user_id) ?? toNumber(decoded.sub);
    return resolved ?? 1;
  } catch {
    return 1;
  }
};

export const normalizeCompanies = (raw: unknown): Company[] => {
  const list = findCollectionInPayload(raw, [
    "items",
    "data",
    "results",
    "companies",
    "rows",
  ]);

  const parsed = list
    .map((item, index) => parseCompanyRecord(item, index + 1))
    .filter((company): company is Company => Boolean(company));

  const uniqueBySymbol = new Map<string, Company>();
  for (const company of parsed) {
    if (!uniqueBySymbol.has(company.symbol)) {
      uniqueBySymbol.set(company.symbol, company);
    }
  }

  return [...uniqueBySymbol.values()].sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  );
};

export const normalizeWatchlist = (
  raw: unknown,
  userIdFallback: number,
): WatchlistEntry[] => {
  const list = findCollectionInPayload(raw, [
    "items",
    "data",
    "results",
    "watchlist",
    "rows",
  ]);

  const parsed = list
    .map((item) => parseWatchlistRecord(item, userIdFallback))
    .filter((entry): entry is WatchlistEntry => Boolean(entry));

  const deduped = new Map<string, WatchlistEntry>();
  for (const entry of parsed) {
    const key = `${entry.user_id}:${entry.company_id}`;
    if (!deduped.has(key) || (entry.is_active && !deduped.get(key)?.is_active)) {
      deduped.set(key, entry);
    }
  }

  return [...deduped.values()];
};

export const resolveDefaultCompany = (
  companies: Company[],
  preferredSymbol = DEFAULT_SYMBOL,
): Company | null => {
  if (!companies.length) return null;

  const preferred = companies.find(
    (company) => company.symbol.toUpperCase() === preferredSymbol.toUpperCase(),
  );

  return preferred ?? companies[0];
};

export const getFallbackCompanies = (): Company[] => [...FALLBACK_COMPANIES];

export const mergeCompanyWithWatchlist = (
  companies: Company[],
  watchlist: WatchlistEntry[],
): Company[] => {
  const companyMap = new Map<string, Company>();

  for (const company of companies) {
    companyMap.set(company.symbol, company);
  }

  for (const item of watchlist) {
    if (!item.is_active) continue;
    if (!item.symbol) continue;

    const symbol = item.symbol.toUpperCase();
    if (!companyMap.has(symbol)) {
      companyMap.set(symbol, {
        company_id: item.company_id,
        symbol,
        ...(item.company_name ? { company_name: item.company_name } : {}),
      });
    }
  }

  const activeWatchlistSymbols = new Set(
    watchlist
      .filter((item) => item.is_active)
      .map((item) => item.symbol?.toUpperCase())
      .filter((symbol): symbol is string => Boolean(symbol)),
  );

  const entries = [...companyMap.values()];

  entries.sort((left, right) => {
    const leftWatch = activeWatchlistSymbols.has(left.symbol);
    const rightWatch = activeWatchlistSymbols.has(right.symbol);

    if (leftWatch !== rightWatch) {
      return leftWatch ? -1 : 1;
    }

    return left.symbol.localeCompare(right.symbol);
  });

  return entries;
};

export const MarketPreferenceService = {
  getCurrentUserId,

  isApiError(error: unknown): error is MarketApiError {
    return error instanceof MarketApiError;
  },

  isPredictionUnavailableError(error: unknown) {
    if (!(error instanceof MarketApiError)) return false;
    return [400, 404, 422].includes(error.status);
  },

  async getCompanies(): Promise<Company[]> {
    const fetchCompanyPayload = async (
      url: string,
    ): Promise<{ ok: boolean; payload: unknown | null }> => {
      try {
        const response = await fetch(url, {
          headers: {
            accept: "application/json",
          },
        });

        if (!response.ok) {
          return { ok: false, payload: null };
        }

        const payload = await safeJson<unknown>(response);
        return { ok: true, payload };
      } catch {
        return { ok: false, payload: null };
      }
    };

    const shouldFetchNextPage = (
      payload: unknown,
      page: number,
      pageSize: number,
      batchSize: number,
    ) => {
      if (!payload || typeof payload !== "object") {
        return batchSize >= pageSize;
      }

      const row = payload as Record<string, unknown>;
      const nextValue = row.next;
      if (typeof nextValue === "string") {
        return nextValue.trim().length > 0;
      }
      if (nextValue !== undefined) {
        return Boolean(nextValue);
      }

      const hasNext = row.has_next ?? row.hasNext;
      if (typeof hasNext === "boolean") {
        return hasNext;
      }

      const totalPages = toNumber(row.total_pages) ?? toNumber(row.pages);
      if (typeof totalPages === "number") {
        return page < totalPages;
      }

      const totalCount = toNumber(row.count) ?? toNumber(row.total);
      if (typeof totalCount === "number") {
        return page * pageSize < totalCount;
      }

      return batchSize >= pageSize;
    };

    try {
      const bySymbol = new Map<string, Company>();
      let page = 1;
      let seeded = false;

      while (page <= COMPANY_MAX_PAGES) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(COMPANY_PAGE_SIZE),
        });
        const pageUrl = `${COMPANY_ENDPOINT}?${params.toString()}`;
        const { ok, payload } = await fetchCompanyPayload(pageUrl);

        if (!ok) {
          break;
        }

        seeded = true;
        const parsed = normalizeCompanies(payload);
        let addedThisPage = 0;

        for (const company of parsed) {
          if (!bySymbol.has(company.symbol)) {
            bySymbol.set(company.symbol, company);
            addedThisPage += 1;
          }
        }

        if (!parsed.length || addedThisPage === 0) {
          break;
        }

        if (!shouldFetchNextPage(payload, page, COMPANY_PAGE_SIZE, parsed.length)) {
          break;
        }

        page += 1;
      }

      if (bySymbol.size) {
        return [...bySymbol.values()].sort((a, b) =>
          a.symbol.localeCompare(b.symbol),
        );
      }

      const fallbackRequest = await fetchCompanyPayload(COMPANY_ENDPOINT);
      if (fallbackRequest.ok) {
        const parsed = normalizeCompanies(fallbackRequest.payload);
        if (parsed.length) return parsed;
      }

      if (seeded) {
        return [];
      }

      return getFallbackCompanies();
    } catch {
      return getFallbackCompanies();
    }
  },

  async getWatchlist(userId = getCurrentUserId()): Promise<WatchlistEntry[]> {
    try {
      const params = new URLSearchParams({
        user_id: String(userId),
        is_active: "true",
        limit: "200",
      });

      const response = await fetch(`${WATCHLIST_ENDPOINT}?${params.toString()}`, {
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        return [];
      }

      const payload = await safeJson<unknown>(response);
      return normalizeWatchlist(payload, userId);
    } catch {
      return [];
    }
  },

  async addToWatchlist(
    companyId: number,
    note = "Selected from UI",
    userId = getCurrentUserId(),
  ): Promise<WatchlistEntry | null> {
    try {
      const response = await fetch(WATCHLIST_ENDPOINT, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          company_id: companyId,
          note,
          is_active: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) return null;
        return null;
      }

      const payload = await safeJson<unknown>(response);
      const parsed = normalizeWatchlist(payload ? [payload] : [], userId);
      return parsed[0] ?? null;
    } catch {
      return null;
    }
  },

  async getMomentumPrediction(symbol: string): Promise<unknown> {
    const response = await fetch(MOMENTUM_PREDICT_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      throw await toApiError(
        response,
        MOMENTUM_PREDICT_ENDPOINT,
        `Momentum prediction failed with ${response.status}`,
      );
    }

    return response.json();
  },

  async getAdvancedPrediction(symbol: string): Promise<unknown> {
    const response = await fetch(ADVANCED_PREDICT_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      throw await toApiError(
        response,
        ADVANCED_PREDICT_ENDPOINT,
        `Advanced prediction failed with ${response.status}`,
      );
    }

    return response.json();
  },

  async getLiveOverview(): Promise<unknown> {
    const response = await fetch(LIVE_OVERVIEW_ENDPOINT, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw await toApiError(
        response,
        LIVE_OVERVIEW_ENDPOINT,
        `Live overview failed with ${response.status}`,
      );
    }

    return response.json();
  },
  async getLiveFull(): Promise<unknown> {
    const response = await fetch(LIVE_FULL_ENDPOINT, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw await toApiError(
        response,
        LIVE_FULL_ENDPOINT,
        `Live full market failed with ${response.status}`,
      );
    }

    return response.json();
  },

  async getMarketSummary(): Promise<unknown> {
    const response = await fetch(MARKET_SUMMARY_ENDPOINT, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw await toApiError(
        response,
        MARKET_SUMMARY_ENDPOINT,
        `Market summary failed with ${response.status}`,
      );
    }

    return response.json();
  },

  async getIsNepseOpen(): Promise<unknown> {
    const response = await fetch(IS_NEPSE_OPEN_ENDPOINT, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw await toApiError(
        response,
        IS_NEPSE_OPEN_ENDPOINT,
        `NEPSE open status failed with ${response.status}`,
      );
    }

    return response.json();
  },
};
