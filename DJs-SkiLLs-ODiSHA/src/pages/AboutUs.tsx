import profileCutout from "@/assets/profile-cutout.png";
import skillLogo from "@/assets/skill-logo.png";
import { MapPin, User, Music, Youtube, Headphones, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md sm:px-8 lg:px-16">
        <Link to="/">
          <img src={skillLogo} alt="SKILL" className="h-5 sm:h-6 lg:h-7 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
        </Link>
        <Link
          to="/"
          className="text-sm font-medium tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          ← BACK TO HOME
        </Link>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-border py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-8">
          <p className="mb-4 text-xs font-semibold tracking-[0.4em] text-primary uppercase">About Us</p>
          <h1 className="font-display text-4xl font-black text-foreground sm:text-5xl lg:text-6xl">
            DJs SkiLLs <span className="text-destructive">ODiSHA</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            The Best DJ Artist from Bhubaneswar, Odisha — Creating fire remixes, club mixes & visual mashups that make the crowd go wild.
          </p>
        </div>
      </section>

      {/* Profile & Story */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-start lg:gap-16">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            <div className="relative h-64 w-64 sm:h-72 sm:w-72 overflow-hidden rounded-2xl border-2 border-primary/20 shadow-[0_0_40px_rgba(255,165,0,0.1)]">
              <img
                src={profileCutout}
                alt="DJs SkiLLs ODiSHA"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Story */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="mb-2 font-display text-2xl font-bold text-foreground sm:text-3xl">Our Story</h2>
            <div className="mb-4 h-1 w-12 rounded-full bg-primary mx-auto lg:mx-0" />
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <span className="font-bold text-foreground">DJs SkiLLs ODiSHA</span> started as a passion project in the heart of Bhubaneswar, Odisha. What began as a love for beats and rhythm has evolved into one of the most recognized DJ brands in the region.
            </p>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We specialize in creating high-energy Bollywood remixes, South Indian mashups, trending phonk beats, classic retro mixes, and electrifying club tracks that keep the dance floor alive.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Our YouTube channel has grown to <span className="font-bold text-foreground">1.32K+ subscribers</span> — and counting! Every track is crafted with precision, creativity, and a deep love for music.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-8">
          {[
            { label: "Subscribers", value: "1.32K+", icon: Youtube },
            { label: "Remixes", value: "50+", icon: Music },
            { label: "Club Mixes", value: "20+", icon: Headphones },
            { label: "Visual FX", value: "100+", icon: Sparkles },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="font-display text-2xl font-black text-foreground sm:text-3xl">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What We Do */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-20">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-primary uppercase">What We Do</p>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Our Expertise</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Bollywood Remixes", desc: "High-energy remixes of the latest and classic Bollywood tracks with modern bass-heavy drops.", icon: "🎵" },
            { title: "Club Mixes", desc: "Electrifying club-ready mixes designed to keep the dance floor alive all night long.", icon: "🎧" },
            { title: "Visual Mashups", desc: "Stunning audio-visual mashups combining the best tracks with breathtaking visual effects.", icon: "🎬" },
            { title: "Trending Beats", desc: "Phonk, trap, and trending beats remixed with Indian flavor for the ultimate vibe.", icon: "🔥" },
            { title: "Retro Classics", desc: "Classic 80s and 90s tracks reimagined with modern production for a nostalgic yet fresh feel.", icon: "💿" },
            { title: "Custom Edits", desc: "Special event edits and custom mixes for festivals, parties, and celebrations.", icon: "✨" },
          ].map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,165,0,0.05)]"
            >
              <span className="mb-3 block text-2xl">{item.icon}</span>
              <h3 className="mb-2 font-display text-lg font-bold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="border-t border-border bg-card py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-primary uppercase">The Team</p>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Behind The Beats</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { name: "DJs SkiLLs ODiSHA", role: "DJ & Music Producer", detail: "The creative force behind every beat and remix." },
              { name: "Sudhansu Kumar", role: "Designer & VFX", detail: "Special effects, graphics, and visual production." },
              { name: "DC Films", role: "Visual Production", detail: "Cinematic visual content and video production." },
            ].map((member) => (
              <div key={member.name} className="rounded-xl border border-border bg-background p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">{member.name}</h3>
                <p className="mb-2 text-xs font-semibold text-primary">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="mb-1 text-xs text-muted-foreground">Tagline</p>
            <p className="font-display text-lg font-bold text-foreground">SPREAD THE BASS</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Location</div>
            <p className="text-lg font-bold text-foreground">Bhubaneswar, Odisha</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" /> Designer</div>
            <p className="text-lg font-bold text-foreground">Sudhansu Kumar</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-16 text-center">
        <h2 className="mb-4 font-display text-2xl font-bold text-foreground sm:text-3xl">Ready to Feel the Bass?</h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">Subscribe to our YouTube channel and never miss a new remix, mix, or mashup.</p>
        <a
          href="https://www.youtube.com/c/DJsSkillsQ35?sub_confirmation=1"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-destructive px-8 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
        >
          Subscribe Now
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs tracking-wider text-muted-foreground">© 2026 DJs SkiLLs ODiSHA. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AboutUs;
