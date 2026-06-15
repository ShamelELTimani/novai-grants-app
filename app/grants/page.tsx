// 1. Loads grants from the API
// 2. Loads sectors and countries for filters
// 3. Lets the user search/filter/sort grants
// 4. Displays grant cards and pagination
"use client";           // This tells Next.js: This file runs in the browser.

import { FormEvent, useEffect, useMemo, useState } from "react";        // import react tools
import { GrantCard } from "@/components/GrantCard";
import { GrantListItem } from "@/lib/types";

// expected shape of the response from /api/grants
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

// defines the response from /api/filters
type FiltersResponse = {
  data: { sectors: string[]; countries: string[] };
};

// creates the page component
export default function GrantsPage() {
  const [grants, setGrants] = useState<GrantListItem[]>([]);        // stores the grants that will be displayed
  const [meta, setMeta] = useState<GrantResponse["meta"] | null>(null);       // stores pagination information
  const [sectors, setSectors] = useState<string[]>([]);             // stores the sector dropdown options
  const [countries, setCountries] = useState<string[]>([]);         // stores the country dropdown options
  const [search, setSearch] = useState("");                         // stores the text typed in search
  const [sector, setSector] = useState("");                         // stores the selected sector filter
  const [country, setCountry] = useState("");                       // stores the selected country filter
  const [sort, setSort] = useState("deadline_asc");                 // stores the selectes sorting option
  const [showExpired, setShowExpired] = useState(false);            // stores whether expired grants should be shown
  const [page, setPage] = useState(1);                              // stores the current pagination page
  const [loading, setLoading] = useState(true);                     // stores whether data is currently loading
  const [error, setError] = useState("");                           // stores error message

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "12", sort });
    if (search.trim()) params.set("search", search.trim());           // If the search box is not empty, add it to the URL.
    if (sector) params.set("sector", sector);
    if (country) params.set("country", country);
    if (showExpired) params.set("showExpired", "true");             // if checkbox is checked 
    return params.toString();
  }, [search, sector, country, sort, showExpired, page]);

  useEffect(() => {         // This runs code when the page first loads.
    fetch("/api/filters")
      .then((res) => res.json())
      .then((json: FiltersResponse) => {
        setSectors(json.data.sectors);
        setCountries(json.data.countries);
      })
      .catch(() => setError("Could not load filter options."));
  }, []);

  useEffect(() => {         // This effect loads grants from the API.
    let ignore = false;     // prevents old requests from updating the page after a new request starts.
    setLoading(true);
    setError("");

    fetch(`/api/grants?${query}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load grants.");
        return json as GrantResponse;       // If the response is good, treat it as a GrantResponse.
      })
      .then((json) => {
        if (!ignore) {        // If the response is good, treat it as a GrantResponse.
          setGrants(json.data);
          setMeta(json.meta);
        }
      })
      .catch((err: Error) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));

    return () => { ignore = true; };        // If a new request starts or the component closes, set ignore to true.
  }, [query]);

  function submitFilters(event: FormEvent) {        // This function runs when the user clicks Search.
    event.preventDefault();         // Stops the browser from refreshing the page.
    setPage(1);         // When searching, go back to page 1.
  }

  function resetFilters() {         // This function runs when the user clicks reset
    setSearch("");
    setSector("");
    setCountry("");
    setSort("deadline_asc");
    setShowExpired(false);
    setPage(1);
  }

  return (        // returns the UI
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
