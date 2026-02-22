"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Copy, ArrowUp } from "lucide-react";
import { motion } from "motion/react";
import { authClient } from "@/lib/auth-client";

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

const BRAIN_FRAME_COUNT = 12;
const BRAIN_FRAME_INTERVAL_MS = 95;
const BRAIN_NOISE_CHARS = [".", ":", "-", "=", "+", "*", "#", "%", "@"];

function buildBrainFrames(ascii: string, frameCount: number) {
  const nonWhitespaceIndexes = Array.from(ascii).reduce<number[]>((acc, char, index) => {
    if (char !== " " && char !== "\n") {
      acc.push(index);
    }
    return acc;
  }, []);

  if (!nonWhitespaceIndexes.length) {
    return [ascii];
  }

  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const progress = frameCount === 1 ? 1 : frameIndex / (frameCount - 1);
    const stableThreshold = Math.max(0, progress - 0.08);
    const chars = Array.from(ascii);

    for (let i = 0; i < nonWhitespaceIndexes.length; i += 1) {
      const charIndex = nonWhitespaceIndexes[i]!;
      const revealPoint = i / nonWhitespaceIndexes.length;

      if (revealPoint <= stableThreshold) {
        continue;
      }

      if (revealPoint <= progress) {
        chars[charIndex] = BRAIN_NOISE_CHARS[(frameIndex + i) % BRAIN_NOISE_CHARS.length] ?? ".";
        continue;
      }

      chars[charIndex] = " ";
    }

    return chars.join("");
  });
}

const brainFrames = buildBrainFrames(brainAscii, BRAIN_FRAME_COUNT);

export default function HeroSection() {
  const [brainFrameIndex, setBrainFrameIndex] = useState(0);
  const { data: session } = authClient.useSession();

  const ctaHref = session ? "/dashboard" : "/login";

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      setBrainFrameIndex(brainFrames.length - 1);
      return;
    }

    const interval = setInterval(() => {
      setBrainFrameIndex((prev) => {
        if (prev < brainFrames.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, BRAIN_FRAME_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[calc(100dvh-52px)] flex flex-col overflow-hidden">
      {/* Brain ASCII Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
        <pre className="text-[13px] leading-[1.15] text-primary/[0.4] whitespace-pre">
          {brainFrames[brainFrameIndex]}
        </pre>
      </div>

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
            Build, share, and manage a graph of reusable skills for your AI agents. Connect your CLI
            and web app to a powerful skill marketplace.
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
  );
}
