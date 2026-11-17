import { ImageResponse } from "next/og";

/** Icono de la app generado en el servidor (PNG). */
export function renderIcon(size: number, opts: { maskable?: boolean; rounded?: boolean } = {}) {
  const pad = opts.maskable ? size * 0.12 : 0;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", background: "#3f6b5a", padding: pad }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: opts.rounded ? size * 0.22 : 0,
            color: "#f6f5f2",
            fontSize: (size - pad * 2) * 0.36,
            fontWeight: 700,
            letterSpacing: -size * 0.01,
          }}
        >
          NH
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
