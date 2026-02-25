import heroBg from "@/assets/hero-bg.jpg";
import profileCutout from "@/assets/profile-cutout.png";
import MixCard from "@/components/MixCard";
import SectionHeader from "@/components/SectionHeader";
import { ExternalLink, MapPin, User, MessageSquare } from "lucide-react";

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

        {/* Hero Content */}
        <main className="relative z-10 flex min-h-[calc(100vh-88px)] items-center px-8 lg:px-16 xl:px-24">
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
      <div className="px-8 py-12 lg:px-16 xl:px-24">
        {/* 🔥 Top Mixes */}
        <section className="mb-16">
          <SectionHeader icon="🔥" title="Top Mixes" />
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {topMixes.map((mix) => (
              <MixCard
                key={mix.videoId}
                title={mix.title}
                artist={mix.artist}
                tag={mix.tag}
                thumbnail={`https://img.youtube.com/vi/${mix.videoId}/maxresdefault.jpg`}
                youtubeUrl={mix.youtubeUrl}
                isNew={mix.isNew}
              />
            ))}
          </div>
        </section>

        {/* 🎵 Popular Remixes */}
        <section className="mb-16">
          <SectionHeader icon="🎵" title="Popular Remixes" />
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {popularRemixes.map((mix) => (
              <MixCard
                key={mix.videoId}
                title={mix.title}
                artist={mix.artist}
                tag={mix.tag}
                thumbnail={`https://img.youtube.com/vi/${mix.videoId}/maxresdefault.jpg`}
                youtubeUrl={mix.youtubeUrl}
              />
            ))}
          </div>
        </section>

        {/* 🎧 Club Mixes */}
        <section className="mb-16">
          <SectionHeader icon="🎧" title="Club Mixes" />
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {clubMixes.map((mix) => (
              <MixCard
                key={mix.videoId}
                title={mix.title}
                artist={mix.artist}
                tag={mix.tag}
                thumbnail={`https://img.youtube.com/vi/${mix.videoId}/maxresdefault.jpg`}
                youtubeUrl={mix.youtubeUrl}
              />
            ))}
          </div>
        </section>

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

        {/* Contact Footer */}
        <footer className="rounded-xl border border-border bg-card p-8 text-center">
          <h3 className="mb-2 font-display text-xl font-bold text-foreground">
            <MessageSquare className="mr-2 inline h-5 w-5" />
            Contact & Stay Connected
          </h3>
          <p className="text-sm text-muted-foreground">
            Follow us on YouTube and social media for the latest remixes and visual content.
          </p>
          <a
            href="https://www.youtube.com/c/DJsSkillsQ35"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" /> Visit YouTube Channel
          </a>
        </footer>
      </div>
    </div>
  );
};

export default Index;
