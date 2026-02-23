import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  icon: string;
  title: string;
}

const SectionHeader = ({ icon, title }: SectionHeaderProps) => {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold text-foreground">
        {icon} {title}
      </h2>
      <button className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        View All <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default SectionHeader;
