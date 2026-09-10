import { requireSessionUser } from "@/lib/session";
import { BackNav } from "@/components/Navbar";
import { AddBikeForm } from "@/components/AddBikeForm";

export default async function AddBikePage() {
  await requireSessionUser();

  return (
    <div className="flex-1 flex flex-col">
      <BackNav />
      <AddBikeForm />
    </div>
  );
}
