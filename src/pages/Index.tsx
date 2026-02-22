import heroBg from "@/assets/hero-bg.jpg";

const navLinks = ["HOME", "ABOUT US", "CONTACT US", "DISCLAIMER"];

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background - B&W aesthetic */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Music production mixing console"
          className="h-full w-full object-cover grayscale"
        />
        <div className="absolute inset-0 bg-background/75" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 lg:px-16">
        <div className="font-display text-xl font-bold tracking-widest text-foreground">
          LOGO
        </div>
        <nav className="hidden gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm font-medium tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {link}
            </a>
          ))}
        </nav>
      </header>

      {/* Hero Content - circle left, text right, spread across */}
      <main className="relative z-10 flex min-h-[calc(100vh-88px)] items-center px-8 lg:px-16 xl:px-24">
        <div className="flex w-full flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between">
          {/* Yellow Circular Frame - left corner */}
          <div className="relative flex-shrink-0">
            <div className="h-64 w-64 rounded-full border-[6px] border-highlight bg-highlight/40 lg:h-80 lg:w-80 xl:h-96 xl:w-96" />
          </div>

          {/* Text Content - right corner */}
          <div className="text-center lg:text-right">
            <p className="mb-3 text-sm font-medium tracking-[0.3em] text-muted-foreground">
              Producer/Composer
            </p>
            <h1 className="mb-4 text-5xl font-black leading-tight text-foreground lg:text-7xl xl:text-8xl">
              YOUR NAME
            </h1>
            <p className="mb-10 text-lg text-muted-foreground">
              Your tagline here
            </p>
            <button className="rounded-full bg-gradient-to-r from-accent to-primary px-10 py-4 text-sm font-semibold tracking-widest text-primary-foreground transition-all hover:scale-105 hover:shadow-[0_0_30px_hsl(36_100%_50%/0.3)]">
              SUBSCRIBE
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
