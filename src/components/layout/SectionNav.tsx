import { productSections, type SectionId } from "../../app/navigation";

export function SectionNav({
  activeSection,
  onSectionChange
}: {
  activeSection: SectionId;
  onSectionChange: (sectionId: SectionId) => void;
}) {
  return (
    <nav className="section-nav" aria-label="Product sections">
      {productSections.map((section) => (
        <button
          aria-current={activeSection === section.id ? "page" : undefined}
          className={`section-nav-item ${activeSection === section.id ? "active" : ""}`}
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          type="button"
        >
          <span>{section.label}</span>
          <small>{section.description}</small>
        </button>
      ))}
    </nav>
  );
}
