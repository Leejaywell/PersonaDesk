import type { ReactNode } from "react";

export function Panel({
  title,
  description,
  icon,
  className = "",
  children
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const titleId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`;

  return (
    <section className={`panel ${className}`.trim()} aria-labelledby={titleId}>
      <div className="panel-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          <span>{description}</span>
        </div>
        {icon}
      </div>
      {children}
    </section>
  );
}
