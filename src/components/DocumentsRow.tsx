import { CheckCircleIcon } from "@/components/icons";

export function DocumentsRow({
  bikeId,
  hasIdDoc,
  hasContractDoc,
}: {
  bikeId: string;
  hasIdDoc: boolean;
  hasContractDoc: boolean;
}) {
  if (!hasIdDoc && !hasContractDoc) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-6">
      <span className="text-[12.5px] font-bold text-muted">Documents on file:</span>
      {hasIdDoc && (
        <a
          href={`/api/documents/${bikeId}/id-doc`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-white border border-border rounded-full pl-3 pr-1.5 py-1.5 text-[12.5px] font-bold text-[#3a3630] hover:border-[#d8d3c4]"
        >
          <CheckCircleIcon className="text-[#1f6b45]" />
          Government ID
          <span className="text-[#1f6b45] bg-status-ok-bg rounded-full px-2 py-0.5 ml-0.5">View</span>
        </a>
      )}
      {hasContractDoc && (
        <a
          href={`/api/documents/${bikeId}/contract`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-white border border-border rounded-full pl-3 pr-1.5 py-1.5 text-[12.5px] font-bold text-[#3a3630] hover:border-[#d8d3c4]"
        >
          <CheckCircleIcon className="text-[#1f6b45]" />
          Signed contract
          <span className="text-[#1f6b45] bg-status-ok-bg rounded-full px-2 py-0.5 ml-0.5">View</span>
        </a>
      )}
    </div>
  );
}
