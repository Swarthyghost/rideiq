import { CheckCircleIcon } from "@/components/icons";

export function DocumentsRow({
  idDocUrl,
  contractDocUrl,
}: {
  idDocUrl: string | null;
  contractDocUrl: string | null;
}) {
  if (!idDocUrl && !contractDocUrl) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-6">
      <span className="text-[12.5px] font-bold text-muted">Documents on file:</span>
      {idDocUrl && (
        <a
          href={idDocUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-white border border-border rounded-full px-3 py-1.5 text-[12.5px] font-bold text-[#1f6b45] hover:border-[#d8d3c4]"
        >
          <CheckCircleIcon />
          Government ID
        </a>
      )}
      {contractDocUrl && (
        <a
          href={contractDocUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-white border border-border rounded-full px-3 py-1.5 text-[12.5px] font-bold text-[#1f6b45] hover:border-[#d8d3c4]"
        >
          <CheckCircleIcon />
          Signed contract
        </a>
      )}
    </div>
  );
}
