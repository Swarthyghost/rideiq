"use client";

import { useState } from "react";
import { ZoomableAvatar } from "@/components/ZoomableAvatar";
import { StatusPill } from "@/components/StatusPill";
import { EditTermsModal } from "@/components/EditTermsModal";
import { GraceIndicator } from "@/components/GraceIndicator";
import type { StatusDisplay } from "@/lib/status";
import type { GraceStatus } from "@/lib/payments";
import type { Bike } from "@/lib/types";

export function BikeDetailHeader({
  bike,
  status,
  grace,
}: {
  bike: Bike;
  status: StatusDisplay;
  grace: GraceStatus;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5.5">
        <div className="flex items-center gap-4">
          <ZoomableAvatar name={bike.riderName} photoUrl={bike.riderPhotoUrl} size={56} />
          <div>
            <div className="text-[21px] sm:text-[23px] font-extrabold">{bike.riderName}</div>
            <div className="text-sm text-muted font-semibold mt-1">
              {bike.bikeModel}
              {bike.plateNumber ? ` · ${bike.plateNumber}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={status} />
          <button
            onClick={() => setEditing(true)}
            className="bg-white border border-border-input rounded-lg px-4 py-2 font-bold text-[13.5px] text-[#3a3630] cursor-pointer hover:bg-panel"
          >
            Edit terms
          </button>
        </div>
      </div>

      <GraceIndicator grace={grace} />

      {editing && <EditTermsModal bike={bike} onClose={() => setEditing(false)} />}
    </>
  );
}
