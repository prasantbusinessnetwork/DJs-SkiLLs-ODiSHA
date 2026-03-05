import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SectionHeaderProps {
  icon: string;
  title: string;
}

const SectionHeader = ({ icon, title }: SectionHeaderProps) => {
  const navigate = useNavigate();
  const lowerTitle = title.toLowerCase();

  const showViewAll =
    lowerTitle.includes("all videos") || lowerTitle.includes("latest videos");

  const handleViewAll = () => {
    // Latest + All both redirect to the full library page
    if (showViewAll) navigate("/videos");
  };

  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold text-foreground">
        {icon} {title}
      </h2>
      {showViewAll && (
        <button
          onClick={handleViewAll}
          className="flex items-center gap-1 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground bg-background/60 backdrop-blur-sm shadow-sm transition-all hover:text-foreground hover:bg-background hover:shadow-md"
        >
          View All <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SectionHeader;
