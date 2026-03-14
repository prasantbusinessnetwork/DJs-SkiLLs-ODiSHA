import skillLogo from "@/assets/skill-logo.png";
import { Mail, Phone, MapPin, Youtube, Send, Instagram, Facebook } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import MobileMenu from "@/components/MobileMenu";

const ContactUs = () => {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoLink = `mailto:sudhansukhatua777@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`)}`;
    window.open(mailtoLink, "_blank");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

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
          <p className="mb-4 text-xs font-semibold tracking-[0.4em] text-primary uppercase">Get In Touch</p>
          <h1 className="font-display text-4xl font-black text-foreground sm:text-5xl lg:text-6xl">
            Contact <span className="text-destructive">Us</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Have a question, collaboration idea, or want to book us for your event? We'd love to hear from you!
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-20">
        <div className="mb-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <a
            href="mailto:sudhansukhatua777@gmail.com"
            className="group rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,165,0,0.05)]"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-1 font-display text-lg font-bold text-foreground">Email Us</h3>
            <p className="text-sm text-muted-foreground">sudhansukhatua777@gmail.com</p>
          </a>

          <a
            href="tel:+919876543210"
            className="group rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,165,0,0.05)]"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-1 font-display text-lg font-bold text-foreground">Call Us</h3>
            <p className="text-sm text-muted-foreground">Available on request</p>
          </a>

          <div className="group rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,165,0,0.05)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-1 font-display text-lg font-bold text-foreground">Location</h3>
            <p className="text-sm text-muted-foreground">Bhubaneswar, Odisha, India</p>
          </div>
        </div>

        {/* Contact Form + Social */}
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          {/* Form */}
          <div className="flex-1">
            <h2 className="mb-2 font-display text-2xl font-bold text-foreground sm:text-3xl">Send a Message</h2>
            <div className="mb-6 h-1 w-12 rounded-full bg-primary" />
            
            {submitted ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
                <Send className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-display text-xl font-bold text-foreground">Message Sent!</h3>
                <p className="text-sm text-muted-foreground">Thank you for reaching out. We'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Your Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="What's this about?"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Write your message..."
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-destructive px-8 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                  Send Message
                </button>
              </form>
            )}
          </div>

          {/* Social Sidebar */}
          <div className="w-full lg:w-72">
            <h2 className="mb-2 font-display text-2xl font-bold text-foreground sm:text-3xl">Follow Us</h2>
            <div className="mb-6 h-1 w-12 rounded-full bg-primary" />
            <p className="mb-6 text-sm text-muted-foreground">Stay connected and never miss a new remix or mashup.</p>

            <div className="space-y-3">
              <a
                href="https://yt.openinapp.co/tqqna"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-destructive/30 hover:bg-destructive/5"
              >
                <Youtube className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-bold text-foreground">YouTube</p>
                  <p className="text-xs text-muted-foreground">1.32K+ Subscribers</p>
                </div>
              </a>
              <a
                href="https://insta.openinapp.co/fdvlx"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-pink-500/30 hover:bg-pink-500/5"
              >
                <Instagram className="h-5 w-5 text-pink-500" />
                <div>
                  <p className="text-sm font-bold text-foreground">Instagram</p>
                  <p className="text-xs text-muted-foreground">@djsskillsodisha</p>
                </div>
              </a>
              <a
                href="https://fb.openinapp.co/t9y4q"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-blue-500/30 hover:bg-blue-500/5"
              >
                <Facebook className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-bold text-foreground">Facebook</p>
                  <p className="text-xs text-muted-foreground">DJs SkiLLs ODiSHA</p>
                </div>
              </a>
              <a
                href="https://open.spotify.com/user/314usg7hspmgpzw3zgnpu5zlg7aa"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-green-500/30 hover:bg-green-500/5"
              >
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                <div>
                  <p className="text-sm font-bold text-foreground">Spotify</p>
                  <p className="text-xs text-muted-foreground">Listen on Spotify</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-16 text-center">
        <h2 className="mb-4 font-display text-2xl font-bold text-foreground sm:text-3xl">Let's Create Something Epic</h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">Whether it's a remix, event booking, or collaboration — we're ready to make it happen.</p>
        <a
          href="https://yt.openinapp.co/tqqna"
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

export default ContactUs;
