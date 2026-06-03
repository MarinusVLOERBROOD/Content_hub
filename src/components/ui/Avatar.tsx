interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

const sizeMap = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
};

import { userColorClass } from "@/lib/colors";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, src, size = "md", color, className = "" }: AvatarProps) {
  const sz = sizeMap[size];

  // If color is a hex value use inline style, otherwise use Tailwind class
  const isHex = color?.startsWith("#");
  const bgClass = !isHex ? (color ? (userColorClass[color] ?? "bg-teal-500") : "bg-teal-500") : "";
  const bgStyle = isHex ? { backgroundColor: color } : undefined;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sz} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sz} ${bgClass} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
      style={bgStyle}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
