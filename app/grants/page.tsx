"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { GrantCard } from "@/components/GrantCard";
import { GrantListItem } from "@/lib/types";

type GrantResponse = {
  data: GrantListItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    sort: string;
    showExpired: boolean;
    noDeadlinePosition: string;
  };
};

type FiltersResponse = {
  data: { sectors: string[]; countries: string[] };
};

export default function GrantsPage() {
  const [grants, setGrants] = useState<GrantListItem[]>([]);
  const [meta, setMeta] = useState<GrantResponse["meta"] | null>(null);
  const [sectors, setSectors] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("");
  const [sort, setSort] = useState("deadline_asc");
  const [showExpired, setShowExpired] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "12", sort });
    if (search.trim()) params.set("search", search.trim());
    if (sector) params.set("sector", sector);
    if (country) params.set("country", country);
    if (showExpired) params.set("showExpired", "true");
    return params.toString();
  }, [search, sector, country, sort, showExpired, page]);

  useEffect(() => {
    fetch("/api/filters")
      .then((res) => res.json())
      .then((json: FiltersResponse) => {
        setSectors(json.data.sectors);
        setCountries(json.data.countries);
      })
      .catch(() => setError("Could not load filter options."));
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");

    fetch(`/api/grants?${query}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load grants.");
        return json as GrantResponse;
      })
      .then((json) => {
        if (!ignore) {
          setGrants(json.data);
          setMeta(json.meta);
        }
      })
      .catch((err: Error) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));

    return () => { ignore = true; };
  }, [query]);

  function submitFilters(event: FormEvent) {
    event.preventDefault();
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setSector("");
    setCountry("");
    setSort("deadline_asc");
    setShowExpired(false);
    setPage(1);
  }

  return (
    <>
      <section className="hero">
        <div>
          <h1>Browse grants</h1>
          <p>Expired grants are hidden by default. Grants with no deadline appear last.</p>
        </div>
      </section>

      <form className="card filters" onSubmit={submitFilters}>
        <div className="field">
          <label htmlFor="search">Search title or donor</label>
          <input id="search" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Example: education, EU..." />
        </div>
        <div className="field">
          <label htmlFor="sector">Sector</label>
          <select id="sector" className="select" value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">All sectors</option>
            {sectors.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="country">Country</label>
          <select id="country" className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">All countries</option>
            {countries.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sort">Sort</label>
          <select id="sort" className="select" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="deadline_asc">Deadline soonest</option>
            <option value="deadline_desc">Deadline latest</option>
          </select>
        </div>
        <label className="field checkboxField">
          <input type="checkbox" checked={showExpired} onChange={(e) => { setShowExpired(e.target.checked); setPage(1); }} />
          Show expired
        </label>
        <button className="button" type="submit">Search</button>
        <button className="button secondary" type="button" onClick={resetFilters}>Reset</button>
      </form>

      {error && <div className="error">{error}</div>}
      {loading && <div className="card state">Loading grants...</div>}
      {!loading && !error && grants.length === 0 && <div className="card state">No grants match your filters.</div>}
      {!loading && !error && grants.length > 0 && (
        <>
          <div className="row meta" style={{ marginBottom: 12 }}>
            <span>{meta?.total ?? 0} grants found</span>
            <span>Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}</span>
          </div>
          <div className="grid">
            {grants.map((grant) => <GrantCard grant={grant} key={grant.id} />)}
          </div>
          <div className="pagination">
            <button className="button secondary" disabled={!meta || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <span className="meta">Page {page}</span>
            <button className="button secondary" disabled={!meta || page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}
    </>
  );
}
