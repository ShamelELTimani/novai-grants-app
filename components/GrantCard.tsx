import Link from "next/link";
import { GrantListItem } from "@/lib/types";
import { formatDate, money } from "@/lib/format";

export function GrantCard({ grant }: { grant: GrantListItem }) {
  return (
    <Link href={`/grants/${grant.id}`} className={`card grantCard ${grant.isExpired ? "expired" : ""}`}>
      <div className="badges">
        <span className="badge">{grant.sector}</span>
        <span className={`badge ${grant.isExpired ? "expired" : "open"}`}>
          {grant.isExpired ? "Expired" : "Open"}
        </span>
      </div>
      <h2>{grant.title}</h2>
      <div className="meta">
        <strong>{grant.donor}</strong> · {grant.donorType}
        <br />
        {money(grant.minAmountUsd)} – {money(grant.maxAmountUsd)}
        <br />
        Deadline: {formatDate(grant.deadline)}
        <br />
        Applications: {grant.applicationCount}
      </div>
      <div className="badges">
        {grant.eligibleCountries.slice(0, 4).map((country) => (
          <span className="badge" key={country}>{country}</span>
        ))}
        {grant.eligibleCountries.length > 4 && <span className="badge">+{grant.eligibleCountries.length - 4}</span>}
      </div>
    </Link>
  );
}
