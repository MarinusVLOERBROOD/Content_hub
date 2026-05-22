interface BadgeProps {
  label: string;
  color?: string;
  className?: string;
}

const colorMap: Record<string, string> = {
  teal: "bg-teal-100 text-teal-700",
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  slate: "bg-slate-100 text-slate-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
};

export function Badge({ label, color = "slate", className = "" }: BadgeProps) {
  const cls = colorMap[color] ?? colorMap.slate;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls} ${className}`}>
      {label}
    </span>
  );
}
