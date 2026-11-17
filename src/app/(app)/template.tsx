/** Se vuelve a montar en cada navegación: entrada suave de la pantalla nueva. */
export default function Template({ children }: { children: React.ReactNode }) {
  // Cada bloque de la pantalla entra escalonado, con desenfoque que se aclara.
  return <div className="stagger">{children}</div>;
}
