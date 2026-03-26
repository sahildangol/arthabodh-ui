import { useMemo, useState } from "react";
import { BiLoaderAlt } from "react-icons/bi";
import { useCompanyWatchlist } from "../common/hooks/useCompanyWatchlist";
import type { Company } from "../services/marketPreferenceService";
import "./Settings.css";

type WatchlistCompany = {
  symbol: string;
  companyName: string;
};

const Settings = () => {
  const {
    loading,
    companyOptions,
    watchlist,
    defaultCompany,
    ensureInWatchlist,
  } = useCompanyWatchlist();
  const [searchTerm, setSearchTerm] = useState("");
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  const activeWatchSymbols = useMemo(
    () =>
      new Set(
        watchlist
          .filter((entry) => entry.is_active)
          .map((entry) => entry.symbol?.toUpperCase())
          .filter((symbol): symbol is string => Boolean(symbol)),
      ),
    [watchlist],
  );

  const activeWatchCompanies = useMemo(() => {
    const bySymbol = new Map<string, WatchlistCompany>();

    for (const entry of watchlist) {
      if (!entry.is_active) continue;
      const symbol = entry.symbol?.toUpperCase();
      if (!symbol) continue;

      bySymbol.set(symbol, {
        symbol,
        companyName: entry.company_name || "Listed Company",
      });
    }

    for (const company of companyOptions) {
      if (!activeWatchSymbols.has(company.symbol)) continue;
      const existing = bySymbol.get(company.symbol);

      bySymbol.set(company.symbol, {
        symbol: company.symbol,
        companyName:
          company.company_name
          || existing?.companyName
          || "Listed Company",
      });
    }

    return [...bySymbol.values()].sort((left, right) =>
      left.symbol.localeCompare(right.symbol),
    );
  }, [watchlist, companyOptions, activeWatchSymbols]);

  const availableCompanies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return companyOptions
      .filter((company) => !activeWatchSymbols.has(company.symbol))
      .filter((company) => {
        if (!query) return true;

        const companyName = company.company_name?.toLowerCase() || "";
        return (
          company.symbol.toLowerCase().includes(query)
          || companyName.includes(query)
        );
      });
  }, [companyOptions, activeWatchSymbols, searchTerm]);

  const handleAddCompany = async (company: Company) => {
    setAddingSymbol(company.symbol);

    try {
      await ensureInWatchlist(company, "Settings watchlist add");
      setSearchTerm("");
    } catch (error) {
      console.warn("Unable to add company to watchlist:", error);
    } finally {
      setAddingSymbol(null);
    }
  };

  return (
    <div className="settings-shell">
      <header className="settings-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Watchlist Management</h1>
          <p className="lead">
            Add companies to your active watchlist and keep defaults aligned across modules.
          </p>
        </div>
      </header>

      <section className="settings-grid">
        <article className="settings-card">
          <div className="card-head">
            <h3>Add Company</h3>
            <p>Search all listed companies and add to your watchlist.</p>
          </div>

          <div className="field">
            <label htmlFor="company-search">Search by symbol or name</label>
            <input
              id="company-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="e.g. NABIL, NICA, EBL"
            />
          </div>

          <div className="settings-list">
            {loading ? (
              <div className="settings-empty">
                <BiLoaderAlt className="spin-icon" />
                <span>Loading companies...</span>
              </div>
            ) : availableCompanies.length ? (
              availableCompanies.map((company) => (
                <div key={company.company_id} className="settings-row">
                  <div>
                    <strong>{company.symbol}</strong>
                    <span>{company.company_name || "Listed Company"}</span>
                  </div>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      void handleAddCompany(company);
                    }}
                    disabled={addingSymbol === company.symbol}
                  >
                    {addingSymbol === company.symbol ? "Adding..." : "Add"}
                  </button>
                </div>
              ))
            ) : (
              <div className="settings-empty">
                <span>No additional companies match your search.</span>
              </div>
            )}
          </div>
        </article>

        <article className="settings-card">
          <div className="card-head">
            <h3>Active Watchlist</h3>
            <p>Used by dashboard, momentum, and forecasting modules.</p>
          </div>

          <div className="settings-list">
            {activeWatchCompanies.length ? (
              activeWatchCompanies.map((company) => (
                <div key={company.symbol} className="settings-row active">
                  <div>
                    <strong>{company.symbol}</strong>
                    <span>{company.companyName}</span>
                  </div>
                  <span className="status-pill">Active</span>
                </div>
              ))
            ) : (
              <div className="settings-empty">
                <span>No active watchlist entries yet.</span>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="settings-card settings-summary">
        <div className="card-head">
          <h3>Default Asset</h3>
          <p>The app will prioritize this symbol when available.</p>
        </div>

        <div className="summary-grid">
          <div>
            <span className="summary-label">Default Symbol</span>
            <strong>{defaultCompany?.symbol || "NABIL"}</strong>
          </div>
          <div>
            <span className="summary-label">Company Name</span>
            <strong>{defaultCompany?.company_name || "Nabil Bank Limited"}</strong>
          </div>
          <div>
            <span className="summary-label">Active Watchlist Size</span>
            <strong>{activeWatchCompanies.length}</strong>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
