"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { formatDate, money } from "@/lib/format";
import { ApiError, GrantDetail } from "@/lib/types";

export function GrantDetailClient({ id }: { id: string }) {
  const [grant, setGrant] = useState<GrantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ orgName: "", orgEmail: "", requestedAmountUsd: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadGrant(signal?: AbortSignal) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/grants/${id}`, { signal });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not load grant.");
      setGrant(json.data as GrantDetail);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadGrant(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitApplication(event: FormEvent) {
    event.preventDefault();
    if (!grant) return;

    setSubmitting(true);
    setFormErrors({});
    setFormMessage("");

    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grantId: grant.id,
        orgName: form.orgName,
        orgEmail: form.orgEmail,
        requestedAmountUsd: Number(form.requestedAmountUsd)
      })
    });

    const json = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      const apiError = json as ApiError;
      setFormErrors(apiError.details ?? {});
      setFormMessage(apiError.error);
      return;
    }

    setForm({ orgName: "", orgEmail: "", requestedAmountUsd: "" });
    setFormMessage("Application submitted successfully.");
    await loadGrant();
  }

  if (loading) return <div className="card state">Loading grant...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!grant) return <div className="card state">Grant not found.</div>;

  return (
    <>
      <p><Link href="/grants">← Back to grants</Link></p>
      <div className="detailGrid">
        <section className="card">
          <div className="badges">
            <span className="badge">{grant.sector}</span>
            <span className={`badge ${grant.isExpired ? "expired" : "open"}`}>{grant.isExpired ? "Expired" : "Open"}</span>
          </div>
          <h1 className="detailTitle">{grant.title}</h1>
          <p className="meta">
            <strong>{grant.donor}</strong> · {grant.donorType}<br />
            Funding: {money(grant.minAmountUsd)} – {money(grant.maxAmountUsd)}<br />
            Duration: {grant.durationMonths} months<br />
            Deadline: {formatDate(grant.deadline)}<br />
            Applications: {grant.applicationCount}
          </p>
          <p className="description">{grant.description}</p>
          <h3>Eligible countries</h3>
          <div className="badges">
            {grant.eligibleCountries.map((country) => <span className="badge" key={country}>{country}</span>)}
          </div>
        </section>

        <aside className="card">
          <h2>Apply</h2>
          {grant.isExpired && <div className="error">This grant is expired, so applications are closed.</div>}
          {formMessage && <div className={formMessage.includes("success") ? "success" : "error"}>{formMessage}</div>}
          <form className="form" onSubmit={submitApplication}>
            <div className="field">
              <label htmlFor="orgName">Organization name</label>
              <input id="orgName" className="input" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} disabled={grant.isExpired} />
              {formErrors.orgName && <span className="fieldError">{formErrors.orgName}</span>}
            </div>
            <div className="field">
              <label htmlFor="orgEmail">Organization email</label>
              <input id="orgEmail" className="input" type="email" value={form.orgEmail} onChange={(e) => setForm({ ...form, orgEmail: e.target.value })} disabled={grant.isExpired} />
              {formErrors.orgEmail && <span className="fieldError">{formErrors.orgEmail}</span>}
            </div>
            <div className="field">
              <label htmlFor="requestedAmountUsd">Requested amount USD</label>
              <input id="requestedAmountUsd" className="input" type="number" min={grant.minAmountUsd} max={grant.maxAmountUsd} value={form.requestedAmountUsd} onChange={(e) => setForm({ ...form, requestedAmountUsd: e.target.value })} disabled={grant.isExpired} />
              {formErrors.requestedAmountUsd && <span className="fieldError">{formErrors.requestedAmountUsd}</span>}
            </div>
            {formErrors.grantId && <span className="fieldError">{formErrors.grantId}</span>}
            <button className="button" disabled={submitting || grant.isExpired} type="submit">
              {submitting ? "Submitting..." : "Submit application"}
            </button>
          </form>
        </aside>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Applications</h2>
        {grant.applications.length === 0 ? (
          <p className="meta">No applications yet.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Email</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {grant.applications.map((application) => (
                  <tr key={application.id}>
                    <td>{application.orgName}</td>
                    <td>{application.orgEmail}</td>
                    <td>{money(application.requestedAmountUsd)}</td>
                    <td>{application.status.replace("_", " ")}</td>
                    <td>{formatDate(application.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
