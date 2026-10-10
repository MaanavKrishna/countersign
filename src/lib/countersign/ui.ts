// Words for the screens a grandparent uses, in the circle's language.
// Kept small on purpose: the "Who's calling?" check, the words display and the phone-table card.

import type { Lang } from "./languages";

export type UiText = {
  close: string;
  whoCalling: string;
  dialogLabel: string;
  ask: (who: string) => string;
  realReads: (who: string) => string;
  match: string;
  noMatch: string;
  someoneElse: string;
  reallyThem: (who: string) => string;
  matchBody: string;
  hangUp: string;
  noMatchBody: (who: string) => string;
  readAloud: string;
  alsoAccept: string;
  changesIn: (s: number) => string;
  card: {
    eyebrow: string;
    title: [string, string];
    step1: string;
    step2: string;
    step3: string;
    numbers: string;
    tips: [string, string, string];
  };
};

export const UI: Record<Lang, UiText> = {
  en: {
    close: "Close",
    whoCalling: "Who says they're calling?",
    dialogLabel: "Who's calling?",
    ask: (w) => `Ask: “${w}, what's our countersign?”`,
    realReads: (w) => `The real ${w} reads it from their phone. They should say:`,
    match: "The words match",
    noMatch: "Wrong, or they won't say",
    someoneElse: "← Someone else",
    reallyThem: (w) => `It's really ${w}.`,
    matchBody: "The words match. If they still ask for gift cards, crypto or a wire transfer, call them back on the number you have saved anyway.",
    hangUp: "Hang up now.",
    noMatchBody: (w) => `The real ${w} would know the words. This is very likely a scam using a copied voice. Hang up and call ${w} on the number you already have. Don't send money.`,
    readAloud: "Read the words aloud",
    alsoAccept: "Their clock may differ slightly. Also accept:",
    changesIn: (s) => `Changes in ${s} seconds`,
    card: {
      eyebrow: "Countersign · keep by the phone",
      title: ["A call asks for money?", "Check it first."],
      step1: "Ask: “What's our countersign?”",
      step2: "Open Countersign → Who's calling? → tap their name. Check their words match.",
      step3: "Wrong words, or they won't say? Hang up. Call them back on the number below.",
      numbers: "Numbers I already trust:",
      tips: [
        "Real family never minds being asked.",
        "Never read your words to someone who called you.",
        "Banks, police and the government never ask for gift cards, crypto or codes.",
      ],
    },
  },
  es: {
    close: "Cerrar",
    whoCalling: "¿Quién dice que llama?",
    dialogLabel: "¿Quién llama?",
    ask: (w) => `Pregunta: «${w}, ¿cuál es nuestra contraseña?»`,
    realReads: (w) => `${w} de verdad la lee en su teléfono. Debería decir:`,
    match: "Las palabras coinciden",
    noMatch: "No coinciden, o no quiere decirlas",
    someoneElse: "← Otra persona",
    reallyThem: (w) => `Es ${w} de verdad.`,
    matchBody: "Las palabras coinciden. Si aun así pide tarjetas regalo, criptomonedas o una transferencia, llámale tú al número que ya tienes guardado.",
    hangUp: "Cuelga ahora.",
    noMatchBody: (w) => `${w} de verdad sabría las palabras. Es muy probable que sea una estafa con una voz copiada. Cuelga y llama a ${w} al número que ya tienes. No envíes dinero.`,
    readAloud: "Leer las palabras en voz alta",
    alsoAccept: "Su reloj puede ir un poco distinto. Acepta también:",
    changesIn: (s) => `Cambia en ${s} segundos`,
    card: {
      eyebrow: "Countersign · junto al teléfono",
      title: ["¿Una llamada pide dinero?", "Compruébalo antes."],
      step1: "Pregunta: «¿Cuál es nuestra contraseña?»",
      step2: "Abre Countersign → ¿Quién llama? → toca su nombre. Comprueba que las palabras coinciden.",
      step3: "¿Palabras equivocadas, o no quiere decirlas? Cuelga. Llámale al número de abajo.",
      numbers: "Números de confianza:",
      tips: [
        "A la familia de verdad no le molesta que preguntes.",
        "Nunca leas tus palabras a quien te ha llamado a ti.",
        "Los bancos, la policía y el gobierno nunca piden tarjetas regalo, criptomonedas ni códigos.",
      ],
    },
  },
  fr: {
    close: "Fermer",
    whoCalling: "Qui dit appeler ?",
    dialogLabel: "Qui appelle ?",
    ask: (w) => `Demandez : « ${w}, quel est notre mot de passe ? »`,
    realReads: (w) => `Le vrai ${w} le lit sur son téléphone. Il devrait dire :`,
    match: "Les mots correspondent",
    noMatch: "Faux, ou refuse de répondre",
    someoneElse: "← Quelqu'un d'autre",
    reallyThem: (w) => `C'est bien ${w}.`,
    matchBody: "Les mots correspondent. S'il demande quand même des cartes cadeaux, des cryptomonnaies ou un virement, rappelez-le au numéro que vous avez déjà.",
    hangUp: "Raccrochez.",
    noMatchBody: (w) => `Le vrai ${w} connaîtrait les mots. C'est très probablement une arnaque avec une voix copiée. Raccrochez et appelez ${w} au numéro que vous avez déjà. N'envoyez pas d'argent.`,
    readAloud: "Lire les mots à voix haute",
    alsoAccept: "Son horloge peut être un peu décalée. Acceptez aussi :",
    changesIn: (s) => `Change dans ${s} secondes`,
    card: {
      eyebrow: "Countersign · à garder près du téléphone",
      title: ["Un appel demande de l'argent ?", "Vérifiez d'abord."],
      step1: "Demandez : « Quel est notre mot de passe ? »",
      step2: "Ouvrez Countersign → Qui appelle ? → touchez son nom. Vérifiez que les mots correspondent.",
      step3: "Mots faux, ou refuse de répondre ? Raccrochez. Rappelez au numéro ci-dessous.",
      numbers: "Numéros de confiance :",
      tips: [
        "La vraie famille ne s'offusque jamais qu'on lui demande.",
        "Ne lisez jamais vos mots à quelqu'un qui vous a appelé.",
        "Les banques, la police et l'État ne demandent jamais de cartes cadeaux, de cryptomonnaies ni de codes.",
      ],
    },
  },
  it: {
    close: "Chiudi",
    whoCalling: "Chi dice di chiamare?",
    dialogLabel: "Chi chiama?",
    ask: (w) => `Chiedi: «${w}, qual è la nostra parola d'ordine?»`,
    realReads: (w) => `${w}, quello vero, la legge dal suo telefono. Dovrebbe dire:`,
    match: "Le parole corrispondono",
    noMatch: "Sbagliate, o non vuole dirle",
    someoneElse: "← Un'altra persona",
    reallyThem: (w) => `È davvero ${w}.`,
    matchBody: "Le parole corrispondono. Se chiede comunque carte regalo, criptovalute o un bonifico, richiamalo al numero che hai già salvato.",
    hangUp: "Riattacca subito.",
    noMatchBody: (w) => `${w}, quello vero, conoscerebbe le parole. È molto probabilmente una truffa con una voce copiata. Riattacca e chiama ${w} al numero che hai già. Non mandare soldi.`,
    readAloud: "Leggi le parole ad alta voce",
    alsoAccept: "Il suo orologio potrebbe essere un po' diverso. Accetta anche:",
    changesIn: (s) => `Cambia tra ${s} secondi`,
    card: {
      eyebrow: "Countersign · da tenere vicino al telefono",
      title: ["Una chiamata chiede soldi?", "Prima controlla."],
      step1: "Chiedi: «Qual è la nostra parola d'ordine?»",
      step2: "Apri Countersign → Chi chiama? → tocca il suo nome. Controlla che le parole corrispondano.",
      step3: "Parole sbagliate, o non vuole dirle? Riattacca. Richiama al numero qui sotto.",
      numbers: "Numeri di cui mi fido:",
      tips: [
        "La famiglia vera non si offende se chiedi.",
        "Non leggere mai le tue parole a chi ti ha chiamato.",
        "Banche, polizia e Stato non chiedono mai carte regalo, criptovalute o codici.",
      ],
    },
  },
  pt: {
    close: "Fechar",
    whoCalling: "Quem diz que está a ligar?",
    dialogLabel: "Quem está a ligar?",
    ask: (w) => `Pergunte: «${w}, qual é a nossa senha?»`,
    realReads: (w) => `O verdadeiro ${w} lê-a no telemóvel. Deve dizer:`,
    match: "As palavras coincidem",
    noMatch: "Erradas, ou não quer dizer",
    someoneElse: "← Outra pessoa",
    reallyThem: (w) => `É mesmo ${w}.`,
    matchBody: "As palavras coincidem. Se mesmo assim pedir cartões-presente, criptomoedas ou uma transferência, ligue-lhe de volta para o número que já tem guardado.",
    hangUp: "Desligue já.",
    noMatchBody: (w) => `O verdadeiro ${w} saberia as palavras. É muito provavelmente uma burla com uma voz copiada. Desligue e ligue a ${w} para o número que já tem. Não envie dinheiro.`,
    readAloud: "Ler as palavras em voz alta",
    alsoAccept: "O relógio dele pode estar ligeiramente diferente. Aceite também:",
    changesIn: (s) => `Muda em ${s} segundos`,
    card: {
      eyebrow: "Countersign · junto ao telefone",
      title: ["Uma chamada pede dinheiro?", "Confirme primeiro."],
      step1: "Pergunte: «Qual é a nossa senha?»",
      step2: "Abra o Countersign → Quem está a ligar? → toque no nome. Confirme que as palavras coincidem.",
      step3: "Palavras erradas, ou não quer dizer? Desligue. Ligue de volta para o número abaixo.",
      numbers: "Números em que confio:",
      tips: [
        "A família verdadeira nunca se importa que pergunte.",
        "Nunca leia as suas palavras a quem lhe ligou.",
        "Bancos, polícia e Estado nunca pedem cartões-presente, criptomoedas ou códigos.",
      ],
    },
  },
};
