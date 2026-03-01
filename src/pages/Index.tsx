import { useState, useEffect } from "react";
import profileCutout from "@/assets/profile-cutout.png";
import skillLogo from "@/assets/skill-logo.png";
import MixSection from "@/components/MixSection";
import { MapPin, User } from "lucide-react";

const allVideoIds = [
  "KsJ2-7cWTyg", "uYTeGgKheFw", "a5EEWUnI8rg", "k_smLZTvPug", "hK651bev0uI",
  "bmgZMZfAy0M", "Ss3boQAYYCI", "Hj5o8msd8x8", "P6xu9rgEd_s", "5ilvPgCEibc",
  "oRd8s5C8jAk", "nzNiNVSEpaE", "tzyU4eo9f3E", "LOl0c3cMN5c",
];

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
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % allVideoIds.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ===== HERO INTRO SECTION ===== */}
      <div className="relative min-h-screen overflow-hidden">
        {/* Background - Auto-sliding video thumbnails */}
        <div className="absolute inset-0">
          {allVideoIds.map((id, i) => (
            <img
              key={id}
              src={`https://img.youtube.com/vi/${id}/maxresdefault.jpg`}
              alt="Channel video thumbnail"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                i === currentBgIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-background/80" />
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
            <a href="https://open.spotify.com/user/314usg7hspmgpzw3zgnpu5zlg7aa?si=B0qHg8ZqS5aTWGhrACWFaQ" target="_blank" rel="noopener noreferrer" className="transition-all hover:scale-110 hover:drop-shadow-[0_0_12px_#1DB954]" style={{ color: '#1DB954' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            </a>
            <a href="https://insta.openinapp.co/fdvlx" target="_blank" rel="noopener noreferrer" className="transition-all hover:scale-110 hover:drop-shadow-[0_0_12px_#E4405F]" style={{ color: '#E4405F' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://yt.openinapp.co/tqqna" target="_blank" rel="noopener noreferrer" className="transition-all hover:scale-110 hover:drop-shadow-[0_0_12px_#FF0000]" style={{ color: '#FF0000' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <a href="https://fb.openinapp.co/t9y4q" target="_blank" rel="noopener noreferrer" className="transition-all hover:scale-110 hover:drop-shadow-[0_0_12px_#1877F2]" style={{ color: '#1877F2' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://buymeacoffee.com/sudhansukhk" target="_blank" rel="noopener noreferrer" className="transition-all hover:scale-110 hover:drop-shadow-[0_0_12px_#FFDD00]" style={{ color: '#FFDD00' }}>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.062 2.014.13l.04.005a6.368 6.368 0 011.082.18c.45.112.813.375.965.827.073.217.115.447.134.68.042.494.07.989.104 1.484.025.353-.236.646-.576.734a20.06 20.06 0 01-.574.128c-1.213.252-2.449.426-3.698.473-1.048.04-2.097.005-3.14-.085a22.136 22.136 0 01-1.609-.216 12.23 12.23 0 01-.538-.114c-.184-.042-.372-.083-.546-.154a.545.545 0 01-.349-.468c-.009-.108-.01-.218-.008-.327.016-.654.06-1.309.116-1.961.025-.278.056-.556.088-.834a.676.676 0 00-.005-.292.682.682 0 00-.444-.419c-.222-.075-.488-.033-.668.144-.064.063-.095.152-.117.239-.159.622-.183 1.275-.218 1.913-.04.717-.02 1.437.056 2.151.062.585.345 1.013.895 1.232.334.133.698.21 1.059.268.93.147 1.87.217 2.814.246 1.214.037 2.425-.01 3.63-.155a21.752 21.752 0 002.085-.385c.263-.062.524-.134.782-.217.402-.129.705-.39.836-.803.073-.229.115-.467.133-.709.093-1.217.163-2.437.163-3.659 0-.496-.041-.99-.1-1.482zM7.546 15.293a1.205 1.205 0 00-.123.498c-.026.37-.025.74.012 1.11.03.307.073.614.145.913.067.28.168.552.324.787.27.408.695.639 1.165.64.474.001.878-.192 1.201-.519a2.17 2.17 0 00.508-.868 3.76 3.76 0 00.203-1.21c.009-.422-.048-.843-.17-1.247a2.082 2.082 0 00-.563-.894c-.31-.296-.719-.453-1.159-.453-.441 0-.849.158-1.16.453a2.025 2.025 0 00-.383.79zm5.632.047a2.05 2.05 0 00-.393.812 3.715 3.715 0 00-.13 1.268c.015.42.089.836.226 1.234.12.342.305.66.562.913.324.316.727.504 1.19.504.467 0 .873-.191 1.198-.519.265-.267.452-.598.575-.956.134-.39.204-.8.216-1.214a3.624 3.624 0 00-.178-1.292 2.083 2.083 0 00-.565-.892c-.311-.296-.72-.453-1.16-.453-.441 0-.849.158-1.16.453a2.118 2.118 0 00-.381.142z"/></svg>
            </a>
            <a href="https://twtr.openinapp.co/lvq66" target="_blank" rel="noopener noreferrer" className="transition-all hover:scale-110 hover:drop-shadow-[0_0_12px_#E1E1E1] text-foreground">
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
