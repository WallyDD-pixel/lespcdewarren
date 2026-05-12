import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Nos PC d’occasion | lespcdewarren",
  description: "Sélection de PC d’occasion testés et préparés par notre équipe.",
};

export default function NosPcDOccasionPage() {
  // PC d’occasion : boutique sur l’accueil (plus de marketplace)
  redirect("/");
}
