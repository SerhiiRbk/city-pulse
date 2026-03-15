import { Badge } from '@/components/ui/badge';

interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalDocumentProps {
  title: string;
  description: string;
  lastUpdatedLabel: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export function LegalDocument({
  title,
  description,
  lastUpdatedLabel,
  effectiveDate,
  sections,
}: LegalDocumentProps) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm sm:p-8">
        <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">
          {lastUpdatedLabel}: {effectiveDate}
        </Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-[1.75rem] border border-border/50 bg-card p-6 shadow-sm sm:p-7"
          >
            <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
