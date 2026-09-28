import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-text-muted">&gt;</span>}
          {item.href ? (
            <Link href={item.href} className="text-text-muted hover:text-text">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-text">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
