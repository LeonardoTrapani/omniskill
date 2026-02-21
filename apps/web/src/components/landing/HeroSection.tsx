"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Copy, X, ChevronDown, Menu, ArrowUp } from "lucide-react";
import { motion } from "motion/react";
import { authClient } from "@/lib/auth-client";

const mainNav = [
  { label: "Skills", href: "/skills", hasDropdown: false },
  { label: "Docs", href: "#docs", hasDropdown: false },
  { label: "Pricing", href: "#pricing", hasDropdown: false },
  { label: "Github", href: "#github", hasDropdown: false },
];

// Each line is exactly 79 characters wide (padded with trailing spaces)
const asciiLogo = `    ██████╗ ███╗   ███╗███╗   ██╗██╗███████╗ ██████╗███████╗███╗   ██╗████████╗
   ██╔═══██╗████╗ ████║████╗  ██║██║██╔════╝██╔════╝██╔════╝████╗  ██║╚══██╔══╝
██║   ██║██╔████╔██║██╔██╗ ██║██║███████╗██║     █████╗  ██╔██╗ ██║   ██║
██║   ██║██║╚██╔╝██║██║╚██╗██║██║╚════██║██║     ██╔══╝  ██║╚██╗██║   ██║
╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║███████║╚██████╗███████╗██║ ╚████║   ██║
 ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝`;

const brainAscii = `
                                                                 ..     .             ..
                                                            ...:=+-.          ..   .---.    ....
                                         .         ........:-.  -##=.             .-==.     .-.  :.
                                       .:.      ....   .  .:    =-.      ...  ...::.     .:---..    ..
                                      .*=:.  ...             ...     .:=-:         ...:--:.          -: .:..
                                     .-+:.               .....     .-**-            ...   ...::...::.:+: .. ...
                                   .  ::--.   .     .......     .:.::-..              .:-=++=-::.:::-*+-:..   .   ..
                          .-:.. ..=-   .-:.  ....  .::.       .:.               .::---+*#*=.           ..     :-   .:.
                         ::-*-.   ::      ......            ...      .:::--==+++***+::::+-.     ...          .-+-.  .:.
                 :     .---:. :....      :+*-..    ..      =-      :=+**+++++=-:.    .=++-....::---:...:::::...=+.  .=:.
                -+:    .-:  .=*+=--::.   :**=-:    ...     *=.    .--:.        .::::=*++:            .:=**+:    .... .::.
                ++=-.    .....  :==-.    .=***=:    .     .**-....--=:       .-**-. .=--:.              .:..    ..:-:-=+:...
          .:   .+*#+-:..-+.    :-+:       .:*%*+:.        :##*=--::.        .+#*.   ...:::::---:.          ..::=**%#*%%+:..:-.
         :--. . .-*%#+=++*+.  .+*-           :##+=:. ...  :=@#=.           :+%+.    .=.   .-==++=:....:::::-+**##*-. .=:...:++.
        .+=:  .   ..:-=+-**   +#=             :%%#+=-  .    =%.      ..::-+#@=      =*:    .-++***++==+++++**#*-.     -*:   :--.
        -++:.-.  ...-:=:-**.  ++.   .=+-::-   =###**=-=     .*+--:::-+*###%@%:    ::=**=.    .+#*#*+-:-=+**+=.  .::....-+-::::::-.
      ..:=*=-:.   -*#+=--+#-  --   .-+#*+*=   ::.  -=*+   .-=..:+*##*=-::--*#:    :==*#*=.    .=#-       ..:    :**==-:..::----+%*.
     .===*#*+-:.  .+#*+++*#*.  :    ..-*##:   -    -=*+.  -**-  :++:     .-*#=.   :=+###*=:     :.   .:-:...-.   .-+**=:..  .:+#*=-.
    -#****##**++:. .+#+-::=#*.        .:+*.  .=    --**:  :#%*:          .+*%*-.   .:::-=**-:..       .-+*=::-.. .:::-===----==::. . ..
   :#%####=-#%##*-. -=. .:==##=.       .:+.  :+.   .:=#+. .*%#+-.        .=###+:.       .-***+-.   ..   -**-...   .-:.       =*+-:...--
  .*#%%%%=..-*#%#*+++.::.:+*=*#+-.      -*.  .*-     .==. .=#%#+=-::.....:=*#%#+-:..::::-+*###*=.  :+:  .*#+.     :+-.       .=*+-:..:=.
  :=:   .:::====+###+....-+##*+*#*+:    =%=   +*:   .     .+*%@####********#########%#++=-=*%%#*-   ::  .+#*-.    =*:    .   :++-:.:::==.
 .#+-:    :=:    .=#*-.  .=#*=---+#*-:. .*%=. .*=..:-=====+##+-::::::-=+*#+-.....:::.       .=++=.     .-*##*-..:+#-  ...   .-**+. .-+#*:.
 -#%%+.  .-*=::.  .-#+:..:=*=..-+--*#+-..=#%=. ...:=*######*-.         ...                  .=-=**+=---=*####**##*+.  ..    :##+-..:=*#=:-+.
 :*+*#=. .=##+==.  -**-.:=**:  :++-.=#*=-=+#%#=--===-...:-++:     .:...     ..:=+++++--::::-+***#######**+=+####+=+-.      .++:.:-=*#**+=+%+
 .+::+#=: .+##++=.:=**-..=*#*:  :=-..=#%%####%@@@#-...    -#=.     :+*-.:-++*******#%%%####%%%#+=:....     :*====+**+-::-::+*-..:=#@##*=+**+
.*+-:-*#+:.:=*#*+=+*##-:.:+##%+--=--:+*##%%%##%@@=  .=-. .-:.      .-##*++-::.      .:=+++++=:.           :+-     .=##****##+-----=*#****#+-
*##+==+##*+==*#*-...=-.. :+*##@%#*+++*####=:...:=*:   =+:     .--:::+*+-.     ....             .        .-*-     .:-*##%@@%#*===+*#==*###**=
+%%%%%#++==-==*#+=......:+*%%@@@@@%%@%#*#+--.    -+.   =-..:-++-:.            ..-+.     .:::-==-.       -#+.    .+***=--=*%#%%%%%#+--=#+=+*-
 -#@@@#*+=-...-+###*++=+*%@@%%###%%@%=. .++==-:.  -:  .-***#*:                  :=      -*##*+.        :*+.    .=##+-...:-++=+++++=---+==+*.
   :%%#%%##*+++*##@@@@@@@@%####%%@@#.    :. .  .:....:=+#*+=...::....   ..     :==      .=***=.    .. .+=.     -##=:...:-=**+--=+++==+#+-+-
   =@@%@@@@@@@@@@@@%%@@@@@@@@@@@@@*:.   =:  ..  :++=+++-.    .-=+++**+++++=--:-+#*:     .=+**=.    .. :+:    .-*#+-:..::-+#*=--=+*####%#++
   .*@@@@%%@@@@@@@@@@@@@@@@@@@@#=*+=.  -*:   ::.-++-.     :--=+**+++++**##########*+=-:-+***#*=::..:::-:   .-+*%#=-::-:=*#*+=-=+#%@@@%###-
     :###*+**###%%%%%%%@@@@@@@=.:*#+.  -#=. .-+**+.       :**+=:.     .:::-==++++*########%%%%%#*+++++-...:+###@*------=+-:::=#%###%@@@%=
      .=##**###%%%%###%%@@@@%*=::+#%-. :=#+:.. ... .    .:+%#+-....         .:--=+++****++#@%%@@@%%###***####%@%#+=+*+=:.  .=#%###*##%##:
         :=+++===-----:-=+*###**+*##%=..:=#*-....:-===+++*+++#**+++==-:.....:-+*###*+++===*#%#####%%@@@%%%%%@@@@@#*###*+=-=+%@%#**#%%***.
                           .*####+-=#%*-:=*###**##%%%#*+-.  .=###%###**+++++*#%%%%%%%%#***#%@@@@%%%%%@@@@@@%%###%%####%%%%%%%##**#%###=.
                             :*@#:..:+##=:.:-=+++++=-:.   ..:=##*##%%########****###@@@%%%@@@%%@@@@@@@@@@@@@@%%%%%%%%%%@@@@@@%#%%@#*+:
                              =%#**=-=*##*=:....... .....-+=+%#+-:--==++++**+**###%@%################%%%%%@@@@@@@@@@@@@@@@@@@@@#+=-.
                              :#%%%%%****########*+====+**##%##*+=----===++**##%%%####*#*****+++===+**#####%%@@@@@@@@@%%%%#%%%@:
                               :%%@@@@@%#*****###%@@%%%%%%%######**+++**#%%%%##**++=--=-=+=++=---===---=+++***##%%%%@%#########*.
                               :%%%@@@##*####*#####%%%%%######%@@@@@%%%%@@%%###*+++=++#**++==+**+=:-++--:-=++++***###########%%#
                                .-+*#####*###%%%###%%%%%%%@@%%%%%%##****#%@@@@@@%@%%%##+***#*=:-+===--=+====++++*******#######%=
                                      :#@@@%%%%@@@@%##%%#*-:.:=%%%%########%%@@@@%++=+*****++*#+=+*++*+==++++****############%=
                                        .-=+**+=-.             =@@%%#%%%%%%@@%##%#%###****###**##*****+***+**++***#**+*####%%:
                                                                :%@@@@@@@@@@@%##%%%%@@@@@%#####%%%####****###***##***####%%-
                                                                 .*@@@@@@@@@@@@%%@@@@@@@@@@@@@@@@%%%%############%%##%#=.
                                                                    +@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%@@@@@@@@#:
                                                                    -@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#:
                                                                    .%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*:
                                                                     :#@@@@@@@@@@@@@@@@=.:=+#%@@@@@@@@@@@@@%##*+=.
                                                                       .-+*#%@@@@@@@@@-       .:----==-:.
                                                                               ......
`;

export default function HeroSection() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const { data: session, isPending } = authClient.useSession();

  const brainLines = brainAscii.split("\n");

  const ctaLabel = isPending ? "" : session ? "Dashboard" : "Sign In";
  const ctaHref = session ? "/dashboard" : "/login";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 120);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Animate brain ASCII line by line
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev < brainLines.length) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 30); // 30ms per line

    return () => clearInterval(interval);
  }, [brainLines.length]);

  const navContent = (
    <>
      <Link href="/" className="text-sm font-medium text-foreground tracking-tight">
        omniscient
      </Link>

      <div className="hidden lg:flex items-center gap-7">
        {mainNav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-primary transition-colors duration-150"
          >
            {item.label}
            {item.hasDropdown && <ChevronDown className="w-3 h-3" />}
          </Link>
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-4">
        {!isPending && (
          <Link
            href={ctaHref}
            className="px-3.5 py-1.5 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150"
          >
            {ctaLabel}
          </Link>
        )}
      </div>

      <button
        className="lg:hidden text-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </>
  );

  return (
    <>
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Brain ASCII Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
          <pre className="text-[13px] leading-[1.15] text-primary/[0.4] whitespace-pre">
            {brainLines.slice(0, visibleLines).join("\n")}
          </pre>
        </div>

        {/* Header Block */}
        <div className="relative z-20">
          <div className="bg-background border-b border-border">
            <div className="max-w-5xl mx-auto px-6 md:px-10 flex items-center justify-between h-[52px]">
              {navContent}
            </div>
          </div>
        </div>

        {/* Fixed Scroll Nav */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
            scrolled
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-full pointer-events-none"
          }`}
        >
          <div className="px-4 md:px-8">
            <div className="max-w-5xl mx-auto bg-background/95 backdrop-blur-md border-b border-border flex items-center justify-between h-[48px] px-6 md:px-10">
              {navContent}
            </div>
          </div>
        </nav>

        {/* Mobile Menu - Bottom Sheet */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden">
              <div className="bg-background border-t border-border mx-2 mb-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-medium text-foreground">omniscient</span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="w-8 h-8 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="border border-border mb-4">
                  {mainNav.map((item, i) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center justify-between px-4 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors ${
                        i < mainNav.length - 1 ? "border-b border-border" : ""
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span>{item.label}</span>
                      {item.hasDropdown && (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  {!isPending && (
                    <Link
                      href={ctaHref}
                      className="w-full text-center py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {ctaLabel}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="max-w-5xl mx-auto w-full">
            {/* ASCII Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="relative mb-6 select-none overflow-x-auto"
            >
              {/* Main white layer */}
              <pre className="text-[8px] sm:text-[10px] md:text-sm leading-[1.15] font-bold text-foreground relative whitespace-pre">
                {asciiLogo}
              </pre>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-xs sm:text-sm uppercase tracking-[0.3em] text-muted-foreground font-normal mb-10"
            >
              your agent's <span className="text-primary">second brain</span>
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-md text-muted-foreground leading-[1.7] max-w-lg mx-auto mb-8"
            >
              Build, share, and manage a graph of reusable skills for your AI agents. Connect your
              CLI and web app to a powerful skill marketplace.
            </motion.p>

            {/* Chat box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="w-full max-w-2xl mx-auto bg-background border border-border p-4 mb-8"
            >
              <div className="text-left text-muted-foreground text-sm mb-6">
                I want my agent to know how to use...
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Copy className="w-3 h-3" />
                  <span>50+ skills indexed</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors">
                    Submit
                    <ArrowUp className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-3"
            >
              <Link
                href={ctaHref}
                className="px-7 py-2.5 bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 hover:scale-[1.02] transition-all duration-150"
              >
                {session ? "Go to Dashboard" : "Get started"}
              </Link>
              <button
                className="flex items-center gap-2 px-5 py-2.5 bg-background/95 backdrop-blur-md border border-border text-foreground text-sm hover:border-primary/50 transition-colors duration-150"
                onClick={() =>
                  navigator.clipboard.writeText("curl -fsSL https://omniscient.sh/install | bash")
                }
              >
                <Copy className="w-3.5 h-3.5" />
                curl -fsSL https://omniscient.sh/install | bash
              </button>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
