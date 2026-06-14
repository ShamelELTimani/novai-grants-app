import { GrantDetailClient } from "@/components/GrantDetailClient";

export default async function GrantDetailPage({ params }: { params: any }) {
  const { id } = await params;
  return <GrantDetailClient id={id} />;
}
