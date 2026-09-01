import { QuoteStudio } from "@/components/quote-studio";

export default function Home() {
  const today = new Date().toISOString().slice(0, 10);

  return <QuoteStudio today={today} />;
}
