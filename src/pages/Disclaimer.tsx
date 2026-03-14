import skillLogo from "@/assets/skill-logo.png";
import { ShieldCheck, Scale, FileText, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import MobileMenu from "@/components/MobileMenu";

const Disclaimer = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md sm:px-8 lg:px-16">
        <Link to="/">
          <img src={skillLogo} alt="SKILL" className="h-5 sm:h-6 lg:h-7 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="hidden sm:block text-sm font-medium tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            ← BACK TO HOME
          </Link>
          <MobileMenu />
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-border py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-background to-primary/10" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-8">
          <p className="mb-4 text-xs font-semibold tracking-[0.4em] text-primary uppercase">Legal</p>
          <h1 className="font-display text-4xl font-black text-foreground sm:text-5xl lg:text-6xl">
            Dis<span className="text-destructive">claimer</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Important legal information regarding the content on this website and YouTube channel.
          </p>
        </div>
      </section>

      {/* Icons Section */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-20">
        <div className="mb-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="group rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,165,0,0.05)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-1 font-display text-lg font-bold text-foreground">Fair Use</h3>
            <p className="text-sm text-muted-foreground">Content used under Section 107 of the Copyright Act</p>
          </div>

          <div className="group rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,165,0,0.05)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-1 font-display text-lg font-bold text-foreground">Legal Compliance</h3>
            <p className="text-sm text-muted-foreground">We respect all copyright laws and intellectual property</p>
          </div>

          <div className="group rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,165,0,0.05)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-1 font-display text-lg font-bold text-foreground">Transparency</h3>
            <p className="text-sm text-muted-foreground">Clear terms about our content usage and policies</p>
          </div>
        </div>

        {/* Disclaimer Content */}
        <div className="space-y-8">
          <div className="rounded-xl border border-border bg-card p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">Copyright Disclaimer</h2>
            </div>
            <div className="h-1 w-12 rounded-full bg-primary mb-6" />
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Copyright Disclaimer Under Section 107 of the Copyright Act 1976, allowance is made for <span className="font-bold text-foreground">"Fair Use"</span> for purposes such as Criticism, Comment, News Reporting, Teaching, Scholarship & Research. Fair use is a use permitted by Copyright Statute that might otherwise be infringing.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              All video and audio content on this channel and website are used for <span className="font-bold text-foreground">Promotion, Entertainment, Criticism, or Comment</span> purposes only.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-8">
            <h2 className="mb-4 font-display text-xl font-bold text-foreground sm:text-2xl">Non-Profit & Educational</h2>
            <div className="h-1 w-12 rounded-full bg-primary mb-6" />
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              The content provided on this website and our YouTube channel is intended for <span className="font-bold text-foreground">entertainment and educational purposes</span>. We do not claim ownership of any copyrighted material used in our remixes and mashups.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              All original music, vocals, and compositions belong to their respective owners. Our remixes are transformative works created to showcase DJ skills and music production techniques.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-8">
            <h2 className="mb-4 font-display text-xl font-bold text-foreground sm:text-2xl">Content Removal</h2>
            <div className="h-1 w-12 rounded-full bg-primary mb-6" />
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              If you are the rightful owner of any content used on this website or our YouTube channel and would like it to be removed, please <Link to="/contact" className="font-bold text-primary underline underline-offset-2 hover:text-primary/80">contact us</Link> directly. We will promptly respond to any valid copyright concerns and remove the content if necessary.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-8">
            <h2 className="mb-4 font-display text-xl font-bold text-foreground sm:text-2xl">External Links</h2>
            <div className="h-1 w-12 rounded-full bg-primary mb-6" />
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              This website may contain links to external websites. We are <span className="font-bold text-foreground">not responsible</span> for the content, privacy policies, or practices of any third-party websites. Visiting external links is at your own discretion and risk.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-16 text-center">
        <h2 className="mb-4 font-display text-2xl font-bold text-foreground sm:text-3xl">Questions?</h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">If you have any questions about this disclaimer, feel free to reach out to us.</p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-full bg-destructive px-8 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
        >
          Contact Us
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs tracking-wider text-muted-foreground">© 2026 DJs SkiLLs ODiSHA. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Disclaimer;
