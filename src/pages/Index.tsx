import heroBg from "@/assets/hero-bg.jpg";
import profilePhoto from "@/assets/profile-photo.png";

const navLinks = ["HOME", "ABOUT US", "CONTACT US", "DISCLAIMER"];

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background - B&W aesthetic */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Music production mixing console"
          className="h-full w-full object-cover grayscale" />

        <div className="absolute inset-0 bg-background/75" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 lg:px-16">
        <div className="font-display text-xl font-bold tracking-widest text-foreground">
          LOGO
        </div>
        <nav className="hidden gap-8 md:flex">
          {navLinks.map((link) =>
          <a
            key={link}
            href="#"
            className="text-sm font-medium tracking-wider text-muted-foreground transition-colors hover:text-foreground">

              {link}
            </a>
          )}
        </nav>
      </header>

      {/* Hero Content - circle left, text right, spread across */}
      <main className="relative z-10 flex min-h-[calc(100vh-88px)] items-center px-8 lg:px-16 xl:px-24">
        <div className="flex w-full flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between">
          {/* Yellow Circular Frame - left corner */}
          <div className="relative flex-shrink-0 h-64 w-64 lg:h-80 lg:w-80 xl:h-96 xl:w-96">
            {/* Yellow circle behind */}
            <div className="absolute inset-0 rounded-full bg-highlight shadow-[0_20px_60px_rgba(0,0,0,0.5)]" />
            {/* Profile photo popping out of circle - 3D effect */}
            <img
              src={profilePhoto}
              alt="Profile"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[115%] w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
            />
          </div>

          {/* Text Content - right corner */}
          













        </div>
      </main>
    </div>);

};

export default Index;