import type { Metadata } from "next";
import UndergroundClient from "@/components/underground/underground-client";

export const metadata: Metadata = {
  title: "Underground — Through the Glass",
  description: "A glowing underground world on the other side of the glass.",
};

export default function UndergroundPage() {
  return <UndergroundClient />;
}
