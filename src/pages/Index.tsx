import heroBg from "@/assets/hero-bg.jpg";
import profileCutout from "@/assets/profile-cutout.png";
import skillLogo from "@/assets/skill-logo.png";
import MixSection from "@/components/MixSection";
import { MapPin, User } from "lucide-react";

const navLinks = ["HOME", "ABOUT US", "CONTACT US", "DISCLAIMER"];

const topMixes = [
  { title: "Aaj Ki Raat (Remix)", artist: "DJs SkILLs ODISHA X Exzost", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=KsJ2-7cWTyg", videoId: "KsJ2-7cWTyg", isNew: true },
  { title: "Tum Toh Dhokebaaz Ho", artist: "DJs SkiLLs ODiSHA", tag: "Tapori Mix", youtubeUrl: "https://www.youtube.com/watch?v=uYTeGgKheFw", videoId: "uYTeGgKheFw" },
  { title: "JAMAL KUDU REMIX", artist: "DJs SkiLLs ODiSHA", tag: "Trending", youtubeUrl: "https://www.youtube.com/watch?v=a5EEWUnI8rg", videoId: "a5EEWUnI8rg" },
  { title: "SOFTLY (Remix)", artist: "Visual DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=k_smLZTvPug", videoId: "k_smLZTvPug" },
  { title: "Illuminati (Remix)", artist: "Visual DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=hK651bev0uI", videoId: "hK651bev0uI" },
];

const popularRemixes = [
  { title: "Dholida (Remix)", artist: "DJ Scoob X DJs SkiLLs ODiSHA", tag: "Navratri", youtubeUrl: "https://www.youtube.com/watch?v=bmgZMZfAy0M", videoId: "bmgZMZfAy0M" },
  { title: "Jo Tum Mere Ho (Remix)", artist: "Exzost X DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=Ss3boQAYYCI", videoId: "Ss3boQAYYCI" },
  { title: "ACHACHO (REMIX)", artist: "DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=Hj5o8msd8x8", videoId: "Hj5o8msd8x8" },
  { title: "NAGADA SANG DHOL", artist: "DJs Skills ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=P6xu9rgEd_s", videoId: "P6xu9rgEd_s" },
  { title: "Chuttamalle X Mashup", artist: "DJs SkiLLs ODiSHA", tag: "Mashup", youtubeUrl: "https://www.youtube.com/watch?v=5ilvPgCEibc", videoId: "5ilvPgCEibc" },
];

const clubMixes = [
  { title: "TU MiLE DiL KHILE", artist: "DJs SKiLLs ODiSHA", tag: "Club Mix", youtubeUrl: "https://www.youtube.com/watch?v=oRd8s5C8jAk", videoId: "oRd8s5C8jAk" },
  { title: "SULTHAN (CLUB REMiX)", artist: "DJs SkiLLs ODiSHA", tag: "Club Mix", youtubeUrl: "https://www.youtube.com/watch?v=nzNiNVSEpaE", videoId: "nzNiNVSEpaE" },
  { title: "Ek Do TEEN REMIX", artist: "DJs SKiLLs ODiSHA", tag: "80's Mix", youtubeUrl: "https://www.youtube.com/watch?v=tzyU4eo9f3E", videoId: "tzyU4eo9f3E" },
  { title: "Dil Pe Chalai Churiya", artist: "Dj Scoob X DJs SkiLLs", tag: "Club Mix", youtubeUrl: "https://www.youtube.com/watch?v=LOl0c3cMN5c", videoId: "LOl0c3cMN5c" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* ===== HERO INTRO SECTION ===== */}
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
        <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6 lg:px-16">
          <div className="font-display text-xl font-black tracking-[0.3em] text-foreground uppercase" style={{ fontStretch: 'expanded', letterSpacing: '0.25em' }}>
            SKILL
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

        {/* Hero Content */}
        <main className="relative z-10 flex min-h-[calc(100vh-88px)] items-center px-4 sm:px-8 lg:px-16 xl:px-24">
          <div className="flex w-full flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between">
            {/* Profile Cutout - Left Side */}
            <div className="relative flex-shrink-0 h-72 w-72 lg:h-96 lg:w-96 xl:h-[28rem] xl:w-[28rem]">
              <img
                src={profileCutout}
                alt="DJs SkiLLs ODiSHA"
                className="h-full w-full object-contain drop-shadow-[0_15px_40px_rgba(0,0,0,0.6)] filter contrast-110"
              />
            </div>

            {/* Hero Text - Right Side */}
            <div className="text-center lg:text-right">
              <p className="mb-2 text-sm font-medium tracking-widest text-muted-foreground">DJs SkiLLs ODiSHA</p>
              <h1 className="font-display text-5xl font-black leading-tight text-foreground lg:text-7xl">
                SPREAD THE <span className="text-destructive">BASS</span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground lg:ml-auto">
                The Best DJ Artist from Bhubaneswar, Odisha. Creating fire remixes, club mixes & visual mashups.{" "}
                <span className="font-bold text-foreground">1.32K+ subscribers</span> on YouTube. Designer —{" "}
                <span className="font-bold text-foreground">Sudhansu Kumar</span>.
              </p>
              <a
                href="https://www.youtube.com/c/DJsSkillsQ35?sub_confirmation=1"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
              >
                Subscribe Now
              </a>
            </div>
          </div>
        </main>
      </div>

      {/* ===== CONTENT SECTIONS ===== */}
      <div className="px-4 py-8 sm:px-8 sm:py-12 lg:px-16 xl:px-24">
        <MixSection icon="🔥" title="Top Mixes" mixes={topMixes} />
        <MixSection icon="🎵" title="Popular Remixes" mixes={popularRemixes} />
        <MixSection icon="🎧" title="Club Mixes" mixes={clubMixes} />

        {/* About Section */}
        <section className="mb-16 rounded-xl border border-border bg-card p-8">
          <h2 className="mb-4 font-display text-2xl font-bold text-foreground">About DJs SkiLLs ODiSHA</h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            We are a creative DJ and visual arts team based in <span className="font-bold text-foreground">Bhubaneswar, Odisha</span>. We create high-energy remixes, club mixes, and stunning visual mashups for music lovers across India.
          </p>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Our YouTube channel has grown to <span className="font-bold text-foreground">1.32K+ subscribers</span> with tracks spanning Bollywood remixes, South Indian mashups, trending phonk, and classic retro mixes.
          </p>
          <p className="mb-8 text-sm text-muted-foreground">
            Special Effects & Design by <span className="font-bold text-foreground">Sudhansu Kumar</span>. Visual production by DC Films.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-secondary p-4">
              <p className="mb-1 text-xs text-muted-foreground">Tagline</p>
              <p className="font-display font-bold text-foreground">SPREAD THE BASS</p>
            </div>
            <div className="rounded-lg bg-secondary p-4">
              <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Location</div>
              <p className="font-bold text-foreground">Bhubaneswar, Odisha</p>
            </div>
            <div className="rounded-lg bg-secondary p-4">
              <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" /> Designer</div>
              <p className="font-bold text-foreground">Sudhansu Kumar</p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mb-16 rounded-xl border border-border bg-card p-8">
          <h3 className="mb-3 font-display text-xl font-bold text-foreground">Disclaimer</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            All Rights to Music Label Co. & no Copyright infringement intended. The remixes and visual content are created for entertainment purposes. Hit the like button and share it around. Don't forget to press the 🔔 bell icon on our YouTube channel!
          </p>
        </section>

        {/* Social Footer */}
        <footer className="rounded-xl border border-border bg-background py-10 text-center">
          <p className="mb-2 font-display text-lg font-bold tracking-[0.3em] text-foreground uppercase">Follow Us</p>
          <p className="mb-8 text-xs tracking-widest text-muted-foreground">CONNECT WITH US ON SOCIAL MEDIA</p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110" style={{ color: '#1DB954' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            </a>
            <a href="https://music.apple.com" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110" style={{ color: '#FA243C' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            </a>
            <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110 text-foreground">
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.3z"/></svg>
            </a>
            <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110" style={{ color: '#E4405F' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://www.youtube.com/c/DJsSkillsQ35" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110" style={{ color: '#FF0000' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110" style={{ color: '#1877F2' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://www.twitch.tv" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110" style={{ color: '#9146FF' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-110 text-foreground">
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
          <div className="mt-8 h-px w-1/2 mx-auto bg-border" />
          <p className="mt-4 text-xs tracking-wider text-muted-foreground">© 2026 DJs SkiLLs ODiSHA. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
