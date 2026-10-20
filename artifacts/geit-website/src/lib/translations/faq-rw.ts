import type { FaqTranslation } from "./faq-types";

/** Human review approved, as confirmed by the project owner. See supportReview. */
export const rwFaq: Record<string, FaqTranslation> = {
  services: {
    question: "GEIT Ltd itanga izihe serivisi?",
    answer: "GEIT itanga gucunga ingufu n’ubujyanama, gutegura imishinga, ubushakashatsi ku masoko, ibisubizo by’ikoranabuhanga, ubujyanama ku ngufu zisubira, gukoresha ingufu neza n’igenzura, ubujyanama ku kubika ingufu muri bateri no ku guhindura imikoreshereze yazo, ubujyanama ku kwishyuza imodoka z’amashanyarazi, isesengura ry’ingufu rikoresha ikoranabuhanga na serivisi zo kubara ibyuka bihumanya. Impapuro za serivisi zisobanura ibyo zikubiyemo n’intambwe zikurikira. Serivisi z’ubujyanama zitandukanye n’ibikorwa bya porogaramu biboneka mu mwanya w’akazi.",
    statusNote: "Soma ibisobanuro bya serivisi cyangwa uvugane na GEIT ku byo ukeneye.", keywords: ["serivisi", "ubujyanama", "ubushakashatsi", "imishinga", "kwishyuza", "ibyuka", "sosiyete"],
  },
  "what-is": {
    question: "GEIT Energy SaaS ni iki?",
    answer: "GEIT Energy SaaS ni umwanya w’akazi wo gusesengura ingufu winjirwamo ukoresheje konti. Ibigo byinjizamo intoki amakuru y’ibipimo ku bihe byagenwe, bigacunga ahakorerwa n’ibyuma bipima, bikabika isesengura, ingero z’ibishobora kuba na raporo. Ubu iri mu igerageza ry’imbere, bityo ntitangwa nka serivisi yo gukurikirana ingufu mu mikorere isanzwe.",
    statusNote: "Iri mu igerageza ry’imbere.", keywords: ["urubuga", "porogaramu", "umwanya", "ibisobanuro"],
  },
  who: {
    question: "Ni nde ushobora gukoresha urubuga?",
    answer: "Abakoresha biyandikishije bari mu kigo, bafite inshingano za nyiracyo, umuyobozi, ushinzwe ingufu, umujyanama, umusesenguzi cyangwa usoma gusa. Uburenganzira butandukana hakurikijwe inshingano. Nyuma yo kwiyandikisha, emeza aderesi ya imeri mbere yo kwinjira. Abatarinjiye babona aho kwinjirira, si amakuru y’abakiriya.",
    statusNote: "Uburenganzira bushingiye ku nshingano burakora.", keywords: ["abakoresha", "inshingano", "kwiyandikisha", "konti", "kwinjira", "ikigo", "umusomyi", "umusesenguzi"],
  },
  data: {
    question: "Ni ayahe makuru y’ingufu urubuga rushobora gukurikirana?",
    answer: "Rusesengura ibipimo by’ingufu n’ububasha bw’amashanyarazi byafashwe ku bihe byagenwe, winjiza ukoresheje inyandikorugero za CSV cyangwa XLSX, nyuma yo kubanza kugenzura amakuru no kwemeza ku mugaragaro ko yinjizwa. Dosiye ntizirenza imirongo 5 000 na 2 MiB. Ntirwihuza n’ibyuma bipima cyangwa amarembo ya IoT kandi ntirukusanya amakuru ako kanya, bityo ntirutanga gukurikirana amakuru ako kanya.",
    statusNote: "Kwinjiza intoki gusa. Nta bipimo byoherezwa ako kanya.", keywords: ["amakuru", "ibipimo", "gukurikirana", "kwinjiza", "dosiye", "ibyuma", "ako kanya"],
  },
  "solar-battery": {
    question: "Rushyigikira amashanyarazi akomoka ku zuba n’ububiko bw’ingufu muri bateri?",
    answer: "Yego, ku rwego rw’isuzuma ry’ibanze. Urubuga rufite ingero z’ibanze z’umusaruro w’izuba n’imikorere ya bateri, hubahirizwa imipaka y’ubushobozi, urugero rw’umuriro urimo, ububasha n’imikorere. Ni imibare y’ibanze ifite ibisobanuro, si uburyo buhanitse bwo gushaka igisubizo cyiza kurusha ibindi kandi si ibipimo by’imikorere ya bateri byapimwe. GEIT inatanga ubujyanama ku ngufu zisubira no ku bubiko bw’ingufu.",
    statusNote: "Ingero z’ibanze gusa.", keywords: ["izuba", "bateri", "ububiko", "zisubira", "urugero", "imikorere"],
  },
  dashboards: {
    question: "Ni ibihe bibaho by’amakuru, isesengura na raporo biboneka?",
    answer: "Isesengura ryabitswe ryo gucunga ingufu ryerekana ingufu zakoreshejwe, ububasha bwo hejuru, urugero rw’amakuru ahari, igipimo cy’umutwaro n’ikiguzi ku giciro kidahinduka, hamwe n’ibishushanyo n’imbonerahamwe zorohereza bose. Hari impanga z’ikoranabuhanga zishingiye ku makuru yinjijwe n’iteganyagihe ry’ibanze iyo amateka ahagije. Urupapuro rusange rw’umwanya w’akazi ni aho kugera ku bice bya porogaramu, si ikibaho cy’ibipimo by’ahakorerwa hose. Bitewe n’igice, amakuru asohorwa muri CSV, XLSX, PDF cyangwa JSON; imbonerahamwe za PDF ni incamake. Ahantu hahuriza raporo hamwe harateganyijwe ariko ntiharaboneka.",
    statusNote: "Amakuru yerekanwa kuri buri sesengura. Guhuriza raporo hamwe birateganyijwe.", keywords: ["ikibaho", "ibibaho", "isesengura", "raporo", "gusohora", "igishushanyo", "iteganyagihe", "impanga"],
  },
  inefficiencies: {
    question: "Abakoresha bashobora gukurikirana imikorere y’ingufu no kubona aho zipfa ubusa?",
    answer: "Abakoresha bashobora gusuzuma isesengura ryabitswe bakareba imiterere y’imikoreshereze, ibihe by’ububasha bwo hejuru n’igipimo cy’umutwaro, bakanagereranya ibihe. Kugaragaza ibidasanzwe birahari ariko si ugusuzuma impamvu y’ikosa ry’ibikoresho. Iteganyagihe risaba nibura iminsi 35 yuzuye ikurikirana kandi ntiryerekanwa iyo amateka adahagije. Ku isuzuma ry’imikoreshereze y’ingufu ry’ahakorerwa, GEIT itanga igenzura nka serivisi y’ubujyanama.",
    statusNote: "Gusesengura amakuru yinjijwe, si ugukurikirana ubudahagarara.", keywords: ["gukoresha neza", "imikorere", "gupfa ubusa", "igenzura", "ibidasanzwe", "kuzigama", "umusaruro"],
  },
  alerts: {
    question: "Imbuzi n’imenyesha bikora bite?",
    answer: "Ushobora kubika amategeko ya kWh za buri munsi cyangwa kW z’igihe cy’ububasha bwo hejuru. Amategeko asuzumwa gusa iyo isesengura ribitswe; imburi ibonetse ihuza n’iryo sesengura kandi ushobora kwemeza ko wayibonye. Nta gahunda isuzuma ku masaha yagenwe, nta suzuma ridahagarara, nta kohereza kuri imeri, SMS cyangwa imenyesha rya push. Kubika itegeko rero ntibivuze gukurikirana bikora buri gihe.",
    statusNote: "Bisuzumwa iyo ubika. Nta nzira zo kohereza imenyesha.", keywords: ["imbuzi", "imburi", "imenyesha", "amategeko", "itegeko", "ntarengwa"],
  },
  sites: {
    question: "Urubuga rushyigikira inyubako cyangwa ahakorerwa henshi?",
    answer: "Yego. Ushobora kurema no guhindura ahakorerwa n’ibyuma bipima, gushyiraho amasaha y’ahakorerwa n’ibiciro bidahinduka, kubishyira mu bubiko bw’ibitagikoreshwa cyangwa kubigarura, hakurikijwe inshingano zawe. Si urutonde rusange rw’ibikoresho cyangwa uburyo bwo kubibungabunga, kandi urupapuro rusange si ikibaho cy’ibipimo by’ahakorerwa hose.",
    statusNote: "Gucunga ahakorerwa n’ibyuma bipima gusa.", keywords: ["ahakorerwa", "inyubako", "henshi", "ibyuma", "ibikoresho", "ibiciro"],
  },
  security: {
    question: "Amakuru y’abakiriya n’uburenganzira bwo kuyageraho birindwa bite?",
    answer: "Amakuru y’abakiriya ari mu mbonerahamwe z’ibigo zikoresha Row Level Security, dosiye ziri mu bubiko bw’ibanga kandi kwinjira gukoresha cookies za HttpOnly. Kugeraho bishingira ku kuba uri mu kigo n’inshingano zawe. Ibi byasuzumwe mu igenzura ry’amakuru asobanura ububiko ritagira icyo rihindura; igerageza ryuzuye ry’uko ibigo bitandukanye bitagerana ku makuru n’isuzuma ryigenga ry’umutekano biracyategerejwe. GEIT ntiyemeza ko ifite icyemezo cy’umutekano. Vugana na GEIT ku bibazo by’umutekano cyangwa ibanga.",
    statusNote: "Nta cyemezo cyemezwa. Isuzuma ryigenga rirategerejwe.", keywords: ["umutekano", "ibanga", "uburenganzira", "kurinda", "icyemezo", "kugeraho"],
  },
  start: {
    question: "Abakiriya batangira bate cyangwa bagasaba kwerekerwa uko rukora?",
    answer: "Ohereza imeri cyangwa uhamagare GEIT ukoresheje amakuru yo ku rupapuro rw’itumanaho kugira ngo muganire ku byo ukeneye cyangwa usabe kwerekerwa uko rukora. Ifishi y’ubujyanama yo ku rubuga igenzura gusa ibyo winjije: ntiyohereza cyangwa ngo ibike ubusabe kuko uburyo bwo kubwohereza butarashyizweho. Ushobora kwiyandikisha no kwemeza imeri kugira ngo winjire mu mwanya w’akazi, ubu uri mu igerageza ry’imbere.",
    statusNote: "Itumanaho no kwiyandikisha birahari.", keywords: ["gutangira", "kwerekwa", "igerageza", "igiciro", "ibiciro", "ubusabe", "ubujyanama", "ikiguzi", "kwishyura"],
  },
  support: {
    question: "Abakoresha babona bate ubufasha bwa tekiniki?",
    answer: "Ku bibazo byo kwinjira, koresha impapuro zo kugarura konti ku rubuga: kwibagirwa ijambo ry’ibanga no kurihindura. Ku bindi, vugana na GEIT ukoresheje amakuru ari hasi. Iki kiganiro gisubiza gusa gishingiye ku bibazo n’ibisubizo byateguwe kandi ntigishobora gufungura dosiye y’ubufasha cyangwa kureba konti yawe.",
    statusNote: "Ubufasha bw’umuntu binyuze mu itumanaho.", keywords: ["ubufasha", "gufasha", "tekiniki", "ikibazo", "ijambo", "ibanga", "kugarura", "kwibagirwa", "umuntu"],
  },
};
