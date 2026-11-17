import { ComprasTabs } from "./tabs";

export default function ComprasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">Compras</h1>
      <ComprasTabs />
      {children}
    </>
  );
}
