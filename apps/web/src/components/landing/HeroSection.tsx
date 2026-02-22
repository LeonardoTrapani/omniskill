"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ArrowUp } from "lucide-react";
import { motion } from "motion/react";
import { authClient } from "@/lib/auth-client";

/* Shadow layer: box-drawing + block chars (rendered behind in muted color) */
const asciiLogoShadow = ` ██████╗ ███╗   ███╗███╗   ██╗██╗███████╗ ██████╗███████╗███╗   ██╗████████╗
██╔═══██╗████╗ ████║████╗  ██║██║██╔════╝██╔════╝██╔════╝████╗  ██║╚══██╔══╝
██║   ██║██╔████╔██║██╔██╗ ██║██║███████╗██║     █████╗  ██╔██╗ ██║   ██║
██║   ██║██║╚██╔╝██║██║╚██╗██║██║╚════██║██║     ██╔══╝  ██║╚██╗██║   ██║
╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║███████║╚██████╗███████╗██║ ╚████║   ██║
 ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝`;

/* Foreground layer: only █ blocks and spaces (rendered on top in foreground color) */
const asciiLogoSolid = ` ██████  ███    ███ ███    ██ ██ ███████  ██████ ███████ ███    ██ ████████
██    ██ ████  ████ ████   ██ ██ ██      ██      ██      ████   ██    ██
██    ██ ██ ████ ██ ██ ██  ██ ██ ███████ ██      █████   ██ ██  ██    ██
██    ██ ██  ██  ██ ██  ██ ██ ██      ██ ██      ██      ██  ██ ██    ██
 ██████  ██      ██ ██   ████ ██ ███████  ██████ ███████ ██   ████    ██
                                                                       `;

const brainAscii = `









                                                                                                           ..:::::..                  ..::::...
                                                                                                  .:-+*#%%%@@@#****###*=.        .=*###****%@@@%%%#*=-:.
                                                                                             .-+#%%%%#%@%%@@@%*-:   .:=#%#:    :#@#-.    :-#@@@@%%@%###%%#+-.
                                                                                         :=*%%##**+++=-.:--:-=. ..  .=*: =@+  =@=.=*=.  .. .--:--..-=+=+**##%%#=:
                                                                                     .=*%#+==**@- .::   :=+-:. .++--.  .::-@--@-:.   :--+=. .:==-.   -:. -@**--+%@#=:
                                                                                  .=#@%+.   -++@-:+-. =*+-.-+- :++*+=**-   ####   =**+**++:.=+::-+*= .==.:%++:   .*%@%+:
                                                                                -*@%#=.  .=- :=#@*+=:   :=+**#%##*+=-=+++-:=%%=--*+*==-=+#%%%**+=:   :=+*@#-..==.  .+##@#-
                                                                              .*@%+=--:.::. -*@*-:+%%%%*-. .: .+#%= :---:+*+##***----. -%#=:.:  .-*%%%#=::*@+. .::.---=+#@*
                                                                             .*@#+--:-:  :#%%#:.=.=+++#@@#-..-.:+*%: .++- %%%*#@.=+=  :%*=.::..=#@##+++-:-.:#%%*:  :-:-=+#@*
                                                                            -#@%####%@==*=::. ::..-==#%@@#=-..  -+*%. +++*#%%#*#*++- .%*+. . .-+#@@%*-=-..-:  .:=+-+@%*###%@#-
                                                                         :+%%%+===-=*##=       .=*:*%#=.      :--=+#+  :#+.@#*%.**.  *#+---.      .=#%+-*-.       -##*=--==*#%%*-
                                                                      .+%@**-     -+##..#   .==++*#@=-=.  -+*#%*=-=%-  .+=.%#+#.==   -%-=+*%#*+-  .=:#@#*++=-.   *..##+:    .=**@%=.
                                                                     :%@*-:-..-.. :*%.-#-   -+=. .-+*#=::  .---=*%%=   .-=:%#=%:=-.   =@@#+---  .::=##+:. :=+:   -#-.%+. ..- :-:-#@%.
                                                                     *@#**#*.:=*###*+=-..-. :*##+= ..=%@*:  ---=++***::==-*++:++-+=::%#+++---: .:*@%=.  =+##+. :-..-++*###+=.:#*+*#@*
                                                                     %@%+-.-**++=-.:-+##@@%*+-.  .:.-+**%#.:---:-++*#=--.:#=:.+#-.-:=@+++.-:--..%@**-=...  .-++@%%##+-:.-=+=**-.-+#@@.
                                                                    +@+.-=*%:.--  =-:   ...... :.-:#++%+:@:  .-=++=+::++: *#:.*+ -++.:==++=-.  :@.+#**+:::. .: ...   :=: .--.:%+=:.=@*
                                                                  :#@=.*%%@%-+:.      -.-: ..::.=+##*=. +- :=%*=:.::   -+.#*:-**:+:   ::.:-+#=: -= .=*##=-.:.:. -:::     ..:=-%@%%+.=@#:
                                                                :*@%:=#+-:.*:--=-    ...=--+**#*+-:      .*%*.  :---. .+*-@= --%-#=  :---.  .*%+       .-++#+*+:-=.:    .-=-::*.:-+*=-#@#:
                                                               +@%=++%:=**#***+*-  ::-:++#+-: .  ..  :.-*#*% ... --+#=..:%#=.-+*#:.:=#+-: ... %*#+::.  .. ...:-+*+--=.: .=#+**#*#*-:#=+*%@+
                                                              +@#%#*%%*=::..:=#@%=:-.+*#-.:-.:..--.  ...:-=-=-:::.. .=#%@#*:--++=#%#=. ..-:::==+-....  :-- ...-:.-##=:::=%@#=:..::-+#%*%%%@+
                                                              @@%%@@=.: ..- :=--@%@%@@*.-+..-==-:.:-.       .=++-:.:+--*#+-:.-*++**-==:::-**=.       .-. :-==-.:+:.*@@%%%@==-:.:.. :.=@@%@@@
                                                             -@@%@%.  :   .   .--:=%@@:.:. -=-:-+*:            .:-    -=%#=++-..=%=:    -:.           .=+=::--- .:..@@%::--.  ..  ..  .%@%@@:
                                                            :%@**@-.--.  .+#=:     :-##.   .:.==+**+::+=:           .--==%=== :=%==--            -++:-***+=-.:    .##-.    .-=#+.  .=- -@**@@:
                                                           .%%===@--=*-    .+%#+=*   :..-++#@%%#*+++###=.:::=::=--:    -+##+:.-+#+:   .---=:--.:::+##*+=++*%%@*+=: .:   *=**%+.   .+*=:-@===%@:
                                                           +@++-:+%: :*:   :+*@%*.  .-=+#%*=:         :*%%#*=---.==--:.-++%+=:-%++:.:-===.---+##%%+:         :=*##+=-   .*@@#+.   =+. :%+:=++@*
                                                           *@+-  .:== :.  ..+#@%- :--=#*-.     .:=---:   -@@##+-=#**+ .::+@.-.-@+.:. =**#-=+##@%-   -----:       -#*=--. =#@*=..  :. =+..  =+@*
                                                           :@@-:.   :     .=#@@= :*#**-     .=+*+-.       .+%@%+++=.  ..::#*=-=%::.   .-++*@@%*.       .=+*+-      :**#+..+@@*=.     :   .:=@@:
                                                         .-*@@#:.   -.-=-  =%@%*+%+-.     .+#*+=:.=       .. .=       +.- %#-:=%.--:       =. .        = -++*#+.     .-+%++%@#: .--:.-   .-#@@*-.
                                                       :*@%*-. .==+=% .-*=.+%@#*@-    .=+*==++-:--*==: -- .--...--..= :  -@+-=:%- .: + ::- :::= .=. :=+*:-:-*+=+*=-.    +@*#@%-.+*:. %=+=-. :-*%@*:
                                                     .*@#=-:=+++===.*+: ..=%@+=%@%: :==*#++===*%%%%+++=:+=-%++=-.  ::.. =%=-..+*%= . -.  :-+++#=-=:-+**@#%#*-+=+*#+==. :@@#=*@#-.  :+*:====++=--+#@*.
                                                    -@@--*%+:.: -:.  :-. .%@%#-+%@* .-***=.:-=#%@@@%##@%@**+++****+*++:+%+-   +++@=.+++*#*#**++*#%@%##%@%%##=-..=***-. *@%=-%%@#  .-:...::.- :+%+--@@-
                                                   :@@:=#@-      :+-------+#*#%%@#. .=#%+===+++#%%%@@@+:          ..  .@*+.  :+++#@.   ..         :+@@@%%%#++++==+%#-  .#@%%#*#=---:-:=+:      -@*-:@@:
                                                   #@= -@@=   -+-. .-:--:-   :*#@#:.:-. .:.: .-=+@@@+. :-..  ::::..    %+--.    -#%   .:..--.  .:-. .+@@@*--  : :  :::.=*@#+.  .-:--:-  :=+:  .+@%. =@#
                                                  .@@. .#@:        ..:.....    -*#@%+:-. =:-= :=-=%-   .:=%:-:.:..: : .:@#+.  -*%@:....:..:.=--%-:    -@=--:.-.:=.:=:+%@#*:    .....:.         -%#  .@@.
                                                  =@#   #%.       .=*#++=:+=:::.--=#@*++:::-+++=+@:    ::-=*+=+==+=:++=#%%#+:.=*#@#-=+:-*:=+++*=-::    :@*=+==--.-*+#@#-:-:.-.-+=-+**#-.       -@%   #@=
                                                  *@#.:.*@-         .-+++****=++==++@@@@#*+%%%%%%#-..:---. .=**+#+==+-:.%%@*-==#%# :=+==*****=. .-=--.:-#%#%#@%*+#@@@@+=+==++**+*+++-.        .=@#.::#@*
                                                  @@*===#@*:-.               :+#*#%@@@@+-. .+%@@@*+-: .===+. :#=. .=-:.:*+@####@=#..-==  .=#: .+=+-  :=*+@@@%=  :==@@@@#**#+:.              .=.#@#-+=#@@
                                                 :@@@%@@%@@@@%*+.:              =@@@@%#-.   -*#@@*::  :=+:.#.    .----.:.=@@@%%@-:.:----     .#.-+=. .:-#@@#*:   ::%%@@@@=.            .:.*#%%@@@%@@%@@@:
                                                 #@#+-::.  .:=#@%# -             .%@@%*=:   ..-*@*+=:  .:- ==.:    -=+=--*@*=+#@+-====-    :.=+.=..  -=*+@*-.    :=+#%@%:             -:*@@#=:.  ::.-+#@#.
                                               :#@=   -.       :#@*=--:--         .#@%#-+. +   =%**---. .:--#:=--  .+@%%@@*=::+*@@%%@+. .-=-:*--:  .--=**%-   + :+-#%@#:        .--:=:=%@#.       ::   +@#:
                                              +@%:   -:          #@...:..::.        :=***-=-.-*+-%+-=+-  .: -+-.::.  .*@@**=.+**#@@*.  ::..-+- :  .-+--+%+++: ---***=:        :-...:...@#          =:   -%@+.
                                            .#@+.   .+.     -.   .@#=======-.           .:  =----=@=+-     .  :=+=.    =@#*:.+++*@=    .=++:  :     -==@==-:--  :.           .-=======#@.   ::     :+.   .+@#.
                                           .#@=  .:.*#.    .=.    +%       :=+=..-:          .:::-+%=+:   :-=-.  -#:.+- #@*..--+@*.==.:%-  .-=-:   -+=#=--:.. .       .-:..++=:       %+    .=     -#= :.  =@#.
                                           =@* .:-:==-.    :=                .:%::==:: -:..=-.:-:-+%#+..    :=-=: -%. =-:@#--:=*@:+-  %- -===.    .:**%+=:-..==.:.: ::+=.-%:.               .=.    .==-.=.. *@=
                                           *@+ -=-====+==--#*:              .+-=%+-::--=+=**#**--=+@+++=.      .-  @: :- @%+++=*% =. :@ .-.      .=*=*@=--:**##*++--::-:+%==+               -#*-======+--=:.*@*
                                           +@@*-:*#+-.   :*##.              --=#@@%+***-.--==%@@%#@%+-+-+.:::  :-: %- .: #%###*## -. -% --.  -.::==+-*%@*%%%%===..-*+++%@@*==:              -*#*:   .-+#*--%@@=
                                           .@@#*++-.=-  :--**- -.      ...    -@%%**%#*+====-...-+%%+==.-:...   :-.%- .=.#%*++-#*:=  -%.-.  ....::.=+*#@+:. .-=====**#**%%@-    :..      .- =*#--:  =-.-+**#@@.
                                            #@#=-  .-=: .--:*#:%+-:-:--*=.  .+%*#*#+:..  .   ..::.*@=.  ...::      @-  : #%***+%*.:  -@      -.. .  :=@+.:: .  .   ...=**#*%+.  .++:---:=**:##--- .:=:. .-+#@%
                                           :@%+=   :*:::   :--+%%#+-::..   .%%#%%*:-.--.-=.  -:-+=+%. :-::.: -.    @= .+.#%##%#%#:=  =@    .: -.-:-. .%=+=-::  -:-.-::-:*%%*##.   ..:-=+#@%+=-:   -:.*:  .=+%@-
                                           *@**-    *=    -. .*--=*%+++    =@#%*#**#=*+-:..  .*####=.              #+ .=.@#*+++*@:-  *#              :=####+.  ..:-+*+#*+##%*@=   .+**%*=-=+. .-    =*    =+#@*
                                          .#@%==.  .=*+:  :-=. ==----%#.   :@%+=#**++**%@= .=**+=--:=..      :---  -%  :-@*+.=++@=.  %- .---:      :.=:-=-**+=..+@%#+++**#=*#@:   .#%=---=: .==.  :*#-   :==%@*.
                                         :@##@@+=....:=%#. .:*.  .=+-.%#  :=*#++++------=%*=-.:: --:::-=-::-:..-**. =: .#%*+.:-+#*  := :**: .:--::==.-:::.::.:=*@+---=:-++++%#=:  *%.=+-   .*.. .#%=....:-=@@##%:
                                         *%+-+*#* =+-.:*%* --=-   ..--=@.      ...  ::.:-+@-:=.-..:..=**=-:::-==::::    @*-: .=+#@:   ::.-==-:::-=*#-.:...:.+::@+-: -.  ....     .@+--..   -=-: *@+..=+- *#*+-*%*
                                         #%=..:..-:--:-=%* :-:*      =.#+           .-.=+=@=-+=.+- +*#+  .::..=-=+:  ::-@=..--.+*@:-.  :*=-= .::.  *#==.:+.++-:@=+-.=.           +%:-      +.+. +%-:---:- ::..+%#
                                         +@+= :..:  :--*@: -. *:     -*-@:..        --.=++@%+**+-*=%*--  .+=:--:-**-.=:+%+- :- -=#*=- -#+-.==-==.  --##+*-+*+*#@*+:.=:       ...:@=+:     :# :: :@*--:  : .:.++@+
                                         .@#+:.=***+:=*%#  == .#+:-. .+++#-+.     -**=-+*%%*-==#++--:-+   -=#-:+ ===.-=*%*-.:::++*%*::++-.*-=#=.   *--:-+*#==-#%%*+-+*+:     :-:%*+=. .-:+#..+:  #%*=.+***=.-+#@.
                                          #%=-.  ..:==#@=  ==   -++*  .=**:+=     :--*###+=.+--.--.=::.   :.:++++ --.=:*%+.   --=%#-=:=: *#=*.:.   .-:=::-.-==.+**%#+--.    .+=:%*-   *++-   +:  -@*+=-..  :-=%%
                                          %#--. :=*+-:.@+  -+.     #=  .-**.=-+. .=+*=:.                    :--=%+...=-.*#=-=.:*@*:--.  =#=--:                    .:=*==.::*:-.#*:   +*     :+:  =@::=*+-. .--#@.
                                         +@==-   .-=-==+%*:..:     -@.  ..=:  .. ..:...  .  ....:.:..        -=--#%*=-:-.:#*=--#:.::-==#*=-=-        :.-.:.. .  .  ...:.....  -*..   %-    .-..:*%*====:.   ==+@*
                                         #@#=+:     :: -=*%%=      .%#.--: ==.     =:-=.--:--+++++**+.=:.::   :-:===*##--.=@%#@:.=:*#**=::=.  .:-.-=:+*#+***+==--- =+.=     .=+.:--.*@:      =%%+=: ::     ===*@#
                                         .*@%+-=-.  =+ .:==#@=  ::  .%+ :==..===----=====++==- :+--:-**=--:     -:.+-=%:--+@%%%*--:%+-=.::     :-=+**=:--+:.===*++=====--====.:==. *#.  -.  =@#=-:  +=  :-=-+#@*.
                                         :%@%@*--+-.=*-=..*=#* :===: :@:    .=+--:-.--:- -:...:--.:=+-:*%*+:.     -.-.+=**%%###****-::.-    .:-+#%*--+=..--:.. ::.-:-:.=:--+=.    :@: -==-. *#++.:=:*=.==--#@%@%.
                                        .%@%#%@@%+-.-% .=-.-##   :#-. -%-     .. . .. .   .***=:.   ---.-##=-:.   .- -.:-:+#**#+:-:.:.-.   ::-=%#::---   .:=+*+:   . :  . .      =@- .=*.   *%:.--  %=.-+%@@%#%@%.
                                        =@%#@#*#%.-: *- .==-*@.   :-:  :*#=.::.         :=#=.          .. =#*=:+ .     .=.-+++=-.-.     ..=:=#%= .            =%=.         .-..=#*: .--.   .%*==-  =# :-.%#*%%#%@=
                                        =@#*+-=-%*.  .*+..=-+@*    .::---=**=#+==.. .::-**. ..        .-#+..*#*=.#..     -+++++=:     ..#.=*%+..+#:.        .  .**:-.. :.==+#=**=---::.    *@+-=..+#.  .*%=-=+*#@=
                                        .%@%=-.: -*=.  =#=. -*@*.            .:==+*+#+**:  .-.-%     :---*%=.:**=-+=  :=**++*#*--+-:  ==-*##:.=%*::=.    .%-:-   :+******==-.             +@+: .=#=  .+#-...-=%@%.
                                         .%@#=.    :=+- .=#+:.=@#.  .-..                 .:- -@#=:. .==+:*#@%+..=+++==++:#****=.*==+==+**=.:+%%*+:+=-  .-=#@:.-:.                 ..=   .#@=.:+#=. -++:    :=#@#.
                                          .%@+.::::.  :=   -*%#%@%: -++==..           .-::. -*@=::. :--=*-*#+*#******=:-+%***+-+%*::=******##+%=-*-:-: .:-=@+: .-:-.           :.+++=. :%@%#%*-   =:  .:::::+@%.
                                           *@=-.   :-==.      .-=@@= ..-=:==-+=--:---:-. .-+-*@=:  .--=======+-=-.----+-+#=+: .+%*-==--=.-=-====--+=--.  -=@*==:. :::-::-=-=+--+:--.  -@@=-:      .==-:.  :-=@#
                                           @@#*      -*%*-       :%@*:            :..:.:-=-:*@@--.:    :: ..:.:    .--=*%**+. -**@*=-:.   .:...  :.   .::--@@*:==-::: :.            .*@%:      .-*%+:     .##@@
                                          .@@*=.      :--+#+=:.   .+@@#*=:.... . :-===+-:.:%@%%*+===+-.           ::-+##@%%:  :*%@##+-:.           :=+-===*%%@%:::=+===-: . ....:-+#@@=.   .:=*%+:=.      :=*@@
                                           +@#=-.       .::=+*+%%##@@%#%@@@@@@#%*#****=*##@@+..#%*+++==-..    .:---=-=**+@*+:.*%@***=-----:.    ..-=++++*##..*@@%#++***##*%#@@@@@@%##@@##%#*#+-.:        .-=*@+
                                            =@@#-    :      -.:..-===:::.==++*%@@%##%%%@#*=.    -*#%%##+*=::  ...-: .=--*%*+=+%#%+---  --...  -:+**##%%#*-    .=*#@%%####@@%#++=-.::-===-..:::      :    =#@@=
                                             .-*@%#+==+=---..:=--:-:::%. .. ===-**##+- +=  :-:      ..-+#%*+-   :   :- .#@++***+@* .=.  ..  .=+*%#+-.       :=.  =+.-+##**=-=- .. .%-:--:---..:=--==--=*%@*-.
                                                @##@@@@@@@%%*#-:...=*+%%+:    :+*+=-+%#+*= ====-:.       :+#**:---:..-..+@%#***+%*.:-.:.---:**#+:       :.====-.+*+%%=:=+*=.    :+%%+*=.:::=*#%%%@@@@@@#%@
                                                %@%#*=:+=++#@@@%@##%*#*==*+=.   -=++-++##-+=-::.=+=++--.  . .=*#*+--*=*##++++===+#@*=+--=***=: . ..-==+===.:--+*-%#++=*==:   .=+*==#*+@%#%%@@%#+++=-+*#%@%
                                                #@+**: ..+::=-+*@@@@#*++=:=*-.   -+=+++*@:  .--=====+*++:--=-.  :=++%@#*##+==+-****%%#=+=:  :-=-::+=++======-.  :@++=+=+:   .=*--=*+*#@@@@*+:+.== ..-**+@#
                                                *@**#= .---. :-+-*%@%**##=:=       :+++#@#. :-++-+---==-==++:--     :*@%***+*+.++*%@*:    .=-:+++-=-=-:-=-+=-. .*@#+*+:      .=:=#*+*%@%+==-. .---..****@*
                                                :#@%#*=.::--  .--==+%@@%@#@.       :==- .-%-  . .:-:..:+**--#=        :*@+**+:=+%@+:        +#-=**+::.:-.  .  -#=. :--.       .%%%%@@%+==--  .-::::=*#%@#:
                                                  .-+#%%*+=-     ...=*#%#%%-.+-:  .: =#:  .%-     :#-==-....-#*%+   .-- .+@*=+*@+..-=.  .*#*#-.:.:---=*.     -%.  =#: :. .:-+-.#%%%#*:...    .-=+*%%#+-.
                                                       :+%@*=-..--:.---+*+@+:=-:     ===   -@.    .:..:--==:.:-*#:    -+- :#%##:.=+:    -#+-:.:===-:..:.    .@-  .+=-    .::=-=@**+:--.:--.:-=*@%+:
                                                          :#@*==.----:-=+=+##.     .+***=.  %+ ::         .-+=. .=:.  :==- .%%..-==.  ::-  .+*-.         -. +%  :+***=.     .##+===-.---::==+@#:
                                                            =@#-.==--=---.--*%*-.  . :===.  :%+--+=-.        :*= .-- .-++:  *+  :++- .-:..=*:        :-+=--+@:  .===:..  .-*%*-:.---=--==.-*@=
                                                             +@*+.  :.:=--:-=.:=**#####+=.   .*%*-=*::.---:. . =#-   :---: :@%. :---:   -#=.. :.---.::*:-*%#:   .=+#####**=:.=-:---::.  .*+@+
                                                             .%%*-. -=+*=++     .:     .:---   :+#%#*+*--::--==:.=*+-:..:-+@%*#*-:..:-+*=.-==-:-::-*+*#%#+:  .---:.     :.    .*++*+=: :=+%%.
                                                              :%##*%%#+=--:      :++=:-::.:-==--.:-=++#@@#+=:..:-. .:-=@@%%%##%%%@@=-:. .-:..:=+#@@*++=-:.--=--..:-:.=++:      :-=+*%%###%%:
                                                               .-%@%- .=*+-:.       .-+*###+--.---. .:==-****+++- :---:*@%##%%%%#@+:---. -+*+***+-=-:. :=::.-=*##**=-.       ::-+*-  -%@%-.
                                                                 :@@@%=.:=-+=-:           :-=*%*+===--: ..  *.    . --==#%#####*%#==-:..    .*  .. ::-===*#%*=-.           --=+==..=%@@@:
                                                                  :%%%%%#**+==-:.             -@#=-   .-=-=--*- .-:   .++@***##%@*=   .--  -*--===-.  .-+*@-             .:-==+*##%%%%%:
                                                                   .+@@*+*-=::-==+*++---+::=.+.%%+:  :-=+-++++##+=-:.  ::%@%+*%@%::  .:-=+%%+*++-+--.  -=%% =--.-=---+*+++=-:---%+*@@+.
                                                                     .-*#@%#%#.=-.  .*= .-*:=-+*@=+. . .--+==-..-:.:=. :=@@@@%@@%-. .=:.--.-===+--    :+=@%-=-=*:. +*:  .-=:%##%@#*-.
                                                                          :-=*#%#+=.. :.   --=-@%=::.+=..   -. .*+:  :.:+@@%%%%%@=:..  -++  ::   ..==.-:+#@-==:   .: ::=*#%#*=-.
                                                                               .=%@+:=:    .:=@#--::..-==: --.:-.-. .-=#@%%@@@%%@@%=-. :-.-.:-: -==- .:::=#%-:     :=+=%%=.
                                                                                  -#%##%.-.=%@@##**=:.-=+*#==*====+=*##*@%@@@@@@%@**#+=+=+=+*==#*+-- -+**#%@@#=:-:##%%#-
                                                                                    .:=*#@@@%%%%#+%#*=-:-----::=--=-+***@@%%#*+*%@#*++-=-==.:---::.:=*%%+%%%%%@@@#*=:.
                                                                                          .-+*#@*@@%##%##%*-: :.  .::--+@#      +@+--::.  ...:-*###%##%@%*@##+-.
                                                                                               .:--==+*%@*+***+-:--==*%#-        -#%*==--:-+***=#%%*===--:.
                                                                                                        -#%%#+=++*%#*-.            .-*#%*++++%%%*-.
                                                                                                           .:---:.                      .:---:.
`;

const BRAIN_FRAME_COUNT = 12;
const BRAIN_FRAME_INTERVAL_MS = 95;
const BRAIN_NOISE_CHARS = [".", ":", "-", "=", "+", "*", "#", "%", "@"];
const ASCII_FONT_STACK =
  "var(--font-fira-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

function normalizeAsciiArt(ascii: string, options?: { trimEachLineStart?: boolean }) {
  const lines = ascii.split("\n");

  while (lines.length > 0 && lines[0]?.trim() === "") {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
    lines.pop();
  }

  if (lines.length === 0) {
    return "";
  }

  const trimmedLineEnds = lines.map((line) => line.replace(/\s+$/u, ""));

  const normalizedLines = options?.trimEachLineStart
    ? trimmedLineEnds.map((line) => line.trimStart())
    : (() => {
        let minStart = Number.POSITIVE_INFINITY;

        for (const line of trimmedLineEnds) {
          const firstVisible = line.search(/\S/);
          if (firstVisible === -1) {
            continue;
          }
          minStart = Math.min(minStart, firstVisible);
        }

        if (!Number.isFinite(minStart)) {
          return trimmedLineEnds;
        }

        return trimmedLineEnds.map((line) => line.slice(minStart));
      })();

  const maxWidth = normalizedLines.reduce((max, line) => Math.max(max, line.length), 0);

  if (maxWidth === 0) {
    return "";
  }

  return normalizedLines.map((line) => line.padEnd(maxWidth, " ")).join("\n");
}

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

const normalizedShadow = normalizeAsciiArt(asciiLogoShadow);
const normalizedSolid = normalizeAsciiArt(asciiLogoSolid);
const normalizedBrainAscii = normalizeAsciiArt(brainAscii);
const brainFrames = buildBrainFrames(normalizedBrainAscii, BRAIN_FRAME_COUNT);

export default function HeroSection({ skillCount }: { skillCount: number }) {
  const router = useRouter();
  const [brainFrameIndex, setBrainFrameIndex] = useState(0);
  const [heroPrompt, setHeroPrompt] = useState("");
  const { data: session, isPending } = authClient.useSession();

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

  const handleHeroSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const q = heroPrompt.trim();
    const dashboardPath = q ? `/dashboard?q=${encodeURIComponent(q)}` : "/dashboard";

    if (!session) {
      router.push(`/login?next=${encodeURIComponent(dashboardPath)}` as "/login");
      return;
    }

    router.push(dashboardPath as "/dashboard");
  };

  return (
    <>
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Brain ASCII Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
          <pre
            aria-hidden="true"
            className="mx-auto w-fit whitespace-pre text-[5px] md:text-[6.5px] text-primary/[0.5] [font-variant-ligatures:none]"
            style={{ fontFamily: ASCII_FONT_STACK, lineHeight: 1.15, letterSpacing: 0 }}
          >
            {brainFrames[brainFrameIndex]}
          </pre>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="max-w-5xl mx-auto w-full">
            {/* ASCII Logo — Vercel skills.sh approach: two layered <pre> tags */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="relative mb-6 w-full flex items-start justify-center select-none"
            >
              <div className="relative mx-auto w-fit max-w-full">
                {/* Shadow layer (box-drawing chars, muted) */}
                <pre className="inline-block whitespace-pre text-[9px] lg:text-[15px] tracking-[-1px] leading-[125%] text-muted-foreground/50 font-[family-name:var(--font-fira-mono)]">
                  {normalizedShadow}
                </pre>
                {/* Foreground layer (solid blocks only, on top) */}
                <pre className="absolute top-0 left-0 inline-block whitespace-pre text-[9px] lg:text-[15px] tracking-[-1px] leading-[125%] text-foreground font-[family-name:var(--font-fira-mono)]">
                  {normalizedSolid}
                </pre>
              </div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-xs sm:text-sm uppercase tracking-[0.2em] text-muted-foreground font-normal mb-10"
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
              <form onSubmit={handleHeroSubmit} className="space-y-6">
                <input
                  type="text"
                  value={heroPrompt}
                  onChange={(event) => setHeroPrompt(event.target.value)}
                  placeholder="I want my agent to know how to use…"
                  className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-primary"
                  aria-label="Describe the skill you need"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Copy className="w-3 h-3" />
                    {skillCount > 0 && <span>{skillCount} skills in the registry</span>}
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-60"
                    disabled={isPending}
                  >
                    Submit
                    <ArrowUp className="w-2.5 h-2.5" />
                  </button>
                </div>
              </form>
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
                className="order-2 w-full sm:order-1 sm:w-auto px-7 py-2.5 bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 hover:scale-[1.02] transition-all duration-150"
              >
                {session ? "Go to Dashboard" : "Get started"}
              </Link>
              <button
                className="order-1 w-full sm:order-2 sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-background/95 backdrop-blur-md border border-border text-foreground text-sm hover:border-primary/50 transition-colors duration-150"
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
