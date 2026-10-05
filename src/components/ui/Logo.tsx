export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/assets/app-icon.jpg"
      alt="PujoGuide Logo"
      width={size}
      height={size}
      className="rounded-xl border border-line/40 shadow-sm object-cover"
      style={{ width: size, height: size }}
    />
  );
}
