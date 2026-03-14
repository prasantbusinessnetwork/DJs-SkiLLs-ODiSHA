import { MoreVertical, Home, Info, ShieldAlert, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

const MobileMenu = () => {
  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-background/20 backdrop-blur-md border border-white/10 text-foreground transition-all hover:bg-background/40">
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-zinc-900/95 border-zinc-800 text-foreground backdrop-blur-xl p-2 rounded-2xl">
          <DropdownMenuItem asChild className="rounded-xl focus:bg-white/10 focus:text-white cursor-pointer py-3 px-4">
            <Link to="/" className="flex items-center gap-3">
              <Home className="h-4 w-4" />
              <span>HOME</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-xl focus:bg-white/10 focus:text-white cursor-pointer py-3 px-4">
            <Link to="/about" className="flex items-center gap-3">
              <Info className="h-4 w-4" />
              <span>ABOUT US</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-xl focus:bg-white/10 focus:text-white cursor-pointer py-3 px-4">
            <Link to="/contact" className="flex items-center gap-3">
              <Mail className="h-4 w-4" />
              <span>CONTACT US</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-xl focus:bg-white/10 focus:text-white cursor-pointer py-3 px-4">
            <Link to="/disclaimer" className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4" />
              <span>DISCLAIMER</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MobileMenu;
