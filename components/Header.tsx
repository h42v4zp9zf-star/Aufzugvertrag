import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MARKE } from "@/lib/config";
import { HauptMenue } from "./HauptMenue";

export { MARKE };

export function Header({ variant, step, rechts }: { variant: "overlay" | "bar"; step?: string; rechts?: ReactNode }) {
  return (
    <header className={`header header--${variant}`}>
      <Link href="/" className="logo">
        {/* Logo von Dario (23.11.2026), für die helle Kopfzeile dunkel freigestellt. */}
        <Image src="/logo/elevaris-logo-v2.png" alt={MARKE} width={218} height={22} priority />
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
