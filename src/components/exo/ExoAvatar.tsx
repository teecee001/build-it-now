// Exo's avatar is the site's tab icon (public/favicon.svg), rendered exactly as-is.
export default function ExoAvatar({ size = 40, online = false }: { size?: number; online?: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <img src="/favicon.svg" alt="" width={size} height={size} draggable={false} className="block w-full h-full select-none" />
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent ring-2 ring-background" />
      )}
    </div>
  );
}
