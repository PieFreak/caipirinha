// Verbs in the present and the past (pretérito perfeito), in the four forms Brazilians
// use: eu; você, ele, ela and a gente; nós; vocês, eles and elas. Regular verbs are
// made by rule, irregular ones are written out. Tested in tests/.

// Who does it, and which of the four forms that takes. A form is shown with one of its
// pronouns at a time; "a gente" (we, in everyday speech) takes the você form.
export const PERSONS = [
  { slot: 0, pronouns: ['eu'], en: 'I' },
  { slot: 1, pronouns: ['você', 'ele', 'ela', 'a gente'], en: 'you, he, she, we (a gente)' },
  { slot: 2, pronouns: ['nós'], en: 'we' },
  { slot: 3, pronouns: ['vocês', 'eles', 'elas'], en: 'you all, they' },
];

export const TENSES = { present: 'present', past: 'past' };

const ENDINGS = {
  ar: { present: ['o', 'a', 'amos', 'am'], past: ['ei', 'ou', 'amos', 'aram'] },
  er: { present: ['o', 'e', 'emos', 'em'], past: ['i', 'eu', 'emos', 'eram'] },
  ir: { present: ['o', 'e', 'imos', 'em'], past: ['i', 'iu', 'imos', 'iram'] },
};

// A regular verb. Spelling keeps the sound: chegar → cheguei, ficar → fiquei,
// começar → comecei; conhecer → conheço.
export function regular(inf) {
  const stem = inf.slice(0, -2);
  const ending = ENDINGS[inf.slice(-2)];
  const present = ending.present.map((end) => stem + end);
  const past = ending.past.map((end) => stem + end);
  if (inf.endsWith('car')) past[0] = `${stem.slice(0, -1)}quei`;
  if (inf.endsWith('gar')) past[0] = `${stem}uei`;
  if (inf.endsWith('çar')) past[0] = `${stem.slice(0, -1)}cei`;
  if (inf.endsWith('cer')) present[0] = `${stem.slice(0, -1)}ço`;
  return { present, past };
}

// [infinitive, meaning, irregular forms or nothing]
const LIST = [
  // -ar
  ['falar', 'to speak'], ['trabalhar', 'to work'], ['morar', 'to live (somewhere)'], ['gostar', 'to like'],
  ['estudar', 'to study'], ['comprar', 'to buy'], ['tomar', 'to drink / to take'], ['andar', 'to walk'],
  ['olhar', 'to look'], ['precisar', 'to need'], ['pensar', 'to think'], ['chamar', 'to call'],
  ['voltar', 'to come back'], ['ajudar', 'to help'], ['esperar', 'to wait'], ['encontrar', 'to find / to meet'],
  ['levar', 'to take (along)'], ['lembrar', 'to remember'], ['chegar', 'to arrive'], ['ficar', 'to stay'],
  ['pagar', 'to pay'], ['começar', 'to begin'], ['jogar', 'to play (a game)'], ['tocar', 'to play (music) / to touch'],
  ['acordar', 'to wake up'], ['achar', 'to think / to find'], ['viajar', 'to travel'], ['dançar', 'to dance'],
  ['cozinhar', 'to cook'], ['nadar', 'to swim'],
  // -er
  ['comer', 'to eat'], ['beber', 'to drink'], ['viver', 'to live'], ['aprender', 'to learn'],
  ['entender', 'to understand'], ['vender', 'to sell'], ['escrever', 'to write'], ['responder', 'to answer'],
  ['correr', 'to run'], ['receber', 'to receive'], ['escolher', 'to choose'], ['conhecer', 'to know (people, places)'],
  ['esquecer', 'to forget'],
  // -ir
  ['abrir', 'to open'], ['partir', 'to leave'], ['decidir', 'to decide'], ['assistir', 'to watch'],
  ['dividir', 'to share / to split'], ['discutir', 'to discuss'],
  // irregular: [present eu, você, nós, vocês], [past eu, você, nós, vocês]
  ['ser', 'to be (permanent)', ['sou', 'é', 'somos', 'são'], ['fui', 'foi', 'fomos', 'foram']],
  ['estar', 'to be (temporary)', ['estou', 'está', 'estamos', 'estão'], ['estive', 'esteve', 'estivemos', 'estiveram']],
  ['ter', 'to have', ['tenho', 'tem', 'temos', 'têm'], ['tive', 'teve', 'tivemos', 'tiveram']],
  ['ir', 'to go', ['vou', 'vai', 'vamos', 'vão'], ['fui', 'foi', 'fomos', 'foram']],
  ['fazer', 'to do / to make', ['faço', 'faz', 'fazemos', 'fazem'], ['fiz', 'fez', 'fizemos', 'fizeram']],
  ['poder', 'to be able to / can', ['posso', 'pode', 'podemos', 'podem'], ['pude', 'pôde', 'pudemos', 'puderam']],
  ['querer', 'to want', ['quero', 'quer', 'queremos', 'querem'], ['quis', 'quis', 'quisemos', 'quiseram']],
  ['saber', 'to know (a fact)', ['sei', 'sabe', 'sabemos', 'sabem'], ['soube', 'soube', 'soubemos', 'souberam']],
  ['dizer', 'to say', ['digo', 'diz', 'dizemos', 'dizem'], ['disse', 'disse', 'dissemos', 'disseram']],
  ['dar', 'to give', ['dou', 'dá', 'damos', 'dão'], ['dei', 'deu', 'demos', 'deram']],
  ['ver', 'to see', ['vejo', 'vê', 'vemos', 'veem'], ['vi', 'viu', 'vimos', 'viram']],
  ['vir', 'to come', ['venho', 'vem', 'vimos', 'vêm'], ['vim', 'veio', 'viemos', 'vieram']],
  ['trazer', 'to bring', ['trago', 'traz', 'trazemos', 'trazem'], ['trouxe', 'trouxe', 'trouxemos', 'trouxeram']],
  ['sair', 'to go out / to leave', ['saio', 'sai', 'saímos', 'saem'], ['saí', 'saiu', 'saímos', 'saíram']],
  ['pôr', 'to put', ['ponho', 'põe', 'pomos', 'põem'], ['pus', 'pôs', 'pusemos', 'puseram']],
  ['ler', 'to read', ['leio', 'lê', 'lemos', 'leem'], ['li', 'leu', 'lemos', 'leram']],
  ['ouvir', 'to hear', ['ouço', 'ouve', 'ouvimos', 'ouvem'], ['ouvi', 'ouviu', 'ouvimos', 'ouviram']],
  ['pedir', 'to ask for / to order', ['peço', 'pede', 'pedimos', 'pedem'], ['pedi', 'pediu', 'pedimos', 'pediram']],
  ['dormir', 'to sleep', ['durmo', 'dorme', 'dormimos', 'dormem'], ['dormi', 'dormiu', 'dormimos', 'dormiram']],
  ['sentir', 'to feel', ['sinto', 'sente', 'sentimos', 'sentem'], ['senti', 'sentiu', 'sentimos', 'sentiram']],
  ['preferir', 'to prefer', ['prefiro', 'prefere', 'preferimos', 'preferem'], ['preferi', 'preferiu', 'preferimos', 'preferiram']],
  ['seguir', 'to follow', ['sigo', 'segue', 'seguimos', 'seguem'], ['segui', 'seguiu', 'seguimos', 'seguiram']],
  ['subir', 'to go up', ['subo', 'sobe', 'subimos', 'sobem'], ['subi', 'subiu', 'subimos', 'subiram']],
  ['perder', 'to lose / to miss', ['perco', 'perde', 'perdemos', 'perdem'], ['perdi', 'perdeu', 'perdemos', 'perderam']],
];

export const VERBS = LIST.map(([inf, en, present, past]) => ({
  inf, en, irregular: !!present, ...(present ? { present, past } : regular(inf)),
}));

export const VERBS_BY_INF = Object.fromEntries(VERBS.map((verb) => [verb.inf, verb]));

// Every form of every verb: a typed form that is one of these is another form, not a typo.
export const VERB_FORMS = new Set(VERBS.flatMap((verb) => [verb.inf, ...verb.present, ...verb.past]));

// The groups of Practise › Verbs.
export const VERB_GROUPS = [
  { id: 'verbs-present', title: 'Present: regular verbs', tense: 'present', irregular: false,
    about: 'Eu falo, você fala, nós falamos, vocês falam: the endings follow a pattern.' },
  { id: 'verbs-present-irregular', title: 'Present: irregular verbs', tense: 'present', irregular: true,
    about: 'Ser, estar, ter, ir and the other everyday verbs that break the pattern.' },
  { id: 'verbs-past', title: 'Past: regular verbs', tense: 'past', irregular: false,
    about: 'Eu falei, você falou, nós falamos, vocês falaram: what happened.' },
  { id: 'verbs-past-irregular', title: 'Past: irregular verbs', tense: 'past', irregular: true,
    about: 'Fui, tive, fiz, disse: the past of the everyday irregular verbs.' },
];

export const verbsOf = (group) => VERBS.filter((verb) => verb.irregular === group.irregular);
