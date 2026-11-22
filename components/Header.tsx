import Link from "next/link";
import type { ReactNode } from "react";
import { MARKE } from "@/lib/config";
import { HauptMenue } from "./HauptMenue";

export { MARKE };

export function Header({ variant, step, rechts }: { variant: "overlay" | "bar"; step?: string; rechts?: ReactNode }) {
  return (
    <header className={`header header--${variant}`}>
      <Link href="/" className="logo">
        {MARKE}
      </Link>
      {rechts ? (
        rechts
      ) : step ? (
        <div className="step">{step}</div>
      ) : (
        <HauptMenue />
      )}
    </header>
  );
}
