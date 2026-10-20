import type { FaqTranslation } from "./faq-types";

/** Human review approved, as confirmed by the project owner. See supportReview. */
export const swFaq: Record<string, FaqTranslation> = {
  services: {
    question: "GEIT Ltd inatoa huduma gani?",
    answer: "GEIT inatoa usimamizi na ushauri wa nishati, uendelezaji wa miradi, utafiti wa masoko, suluhisho za teknolojia, ushauri wa nishati jadidifu, ufanisi na ukaguzi wa nishati, ushauri wa uhifadhi wa nishati kwenye betri na unyumbufu wa matumizi, ushauri wa kuchaji magari ya umeme, uchambuzi wa kidijitali wa nishati na huduma za kupima alama ya kaboni. Kurasa za huduma zinaeleza wigo na hatua zinazofuata. Huduma za ushauri ni tofauti na uwezo wa programu unaopatikana katika eneo la kazi.",
    statusNote: "Soma wigo wa huduma au wasiliana na GEIT kuhusu mahitaji yako.", keywords: ["huduma", "ushauri", "mshauri", "utafiti", "miradi", "kuchaji", "kaboni", "kampuni"],
  },
  "what-is": {
    question: "GEIT Energy SaaS ni nini?",
    answer: "GEIT Energy SaaS ni eneo la kazi la uchambuzi wa nishati linalohitaji kuingia kwenye akaunti. Mashirika huingiza data za vipindi kwa mikono, husimamia maeneo na mita, na huhifadhi uchambuzi, hali za mfano na ripoti. Kwa sasa iko katika majaribio ya ndani, hivyo haitolewi kama huduma ya ufuatiliaji katika matumizi halisi ya uzalishaji.",
    statusNote: "Hatua ya majaribio ya ndani.", keywords: ["jukwaa", "bidhaa", "eneo", "maelezo"],
  },
  who: {
    question: "Nani anaweza kutumia jukwaa?",
    answer: "Watumiaji waliosajiliwa walio katika shirika, wenye majukumu ya mmiliki, msimamizi, meneja wa nishati, mshauri, mchambuzi au msomaji. Ruhusa hutofautiana kulingana na jukumu. Thibitisha barua pepe yako baada ya kusajiliwa kabla ya kuingia. Wageni ambao hawajaingia huona ukurasa wa kuingia, si rekodi za wateja.",
    statusNote: "Udhibiti wa ufikiaji kwa majukumu unafanya kazi.", keywords: ["watumiaji", "majukumu", "sajili", "akaunti", "kuingia", "shirika", "msomaji", "mchambuzi"],
  },
  data: {
    question: "Jukwaa linaweza kufuatilia data gani za nishati?",
    answer: "Linachambua vipimo vya nishati na nguvu vya vipindi unavyopakia kwa kutumia violezo vya CSV au XLSX, baada ya hakikisho la uthibitishaji na kukubali wazi kuingiza data. Faili zina kikomo cha safu 5 000 na 2 MiB. Haliunganishi mita au malango ya IoT na halikusanyi data za moja kwa moja, kwa hiyo halitoi ufuatiliaji wa wakati halisi.",
    statusNote: "Uingizaji wa mikono tu. Hakuna vipimo vya moja kwa moja.", keywords: ["data", "vipimo", "kufuatilia", "ufuatiliaji", "kuingiza", "mita", "moja kwa moja", "kupakia", "faili"],
  },
  "solar-battery": {
    question: "Je, linasaidia mifumo ya sola PV na uhifadhi wa nishati kwenye betri?",
    answer: "Ndiyo, katika tathmini ya awali. Jukwaa lina hali za mfano za msingi za uzalishaji wa sola na uendeshaji wa betri zenye mipaka ya uwezo, kiwango cha chaji, nguvu na ufanisi. Hizi ni hesabu za msingi zilizoelezwa, si uboreshaji wa hali ya juu wala utendaji wa betri uliopimwa. GEIT pia hutoa ushauri wa nishati jadidifu na uhifadhi.",
    statusNote: "Hali za mfano za msingi tu.", keywords: ["jua", "sola", "betri", "uhifadhi", "jadidifu", "mfano", "unyumbufu"],
  },
  dashboards: {
    question: "Dashibodi, uchambuzi na ripoti zipi zinapatikana?",
    answer: "Uchambuzi wa usimamizi wa nishati uliohifadhiwa unaonyesha matumizi, nguvu ya kilele, kiwango cha upatikanaji wa data, kipengele cha mzigo na gharama kwa bei isiyobadilika, pamoja na chati na majedwali yanayofikika. Mapacha wa kidijitali wa data zilizoingizwa na utabiri wa msingi wenye historia ya kutosha vinapatikana. Muhtasari wa eneo la kazi ni ukurasa wa kufikia moduli, si dashibodi ya maeneo yote. Moduli husafirisha CSV, XLSX, PDF au JSON kulingana na moduli; majedwali ya PDF ni muhtasari. Kituo cha ripoti zilizounganishwa kimepangwa na hakipatikani bado.",
    statusNote: "Mwonekano kwa kila uchambuzi. Kituo cha ripoti zilizounganishwa kimepangwa.", keywords: ["dashibodi", "uchambuzi", "ripoti", "kusafirisha", "chati", "utabiri", "pacha", "muhtasari"],
  },
  inefficiencies: {
    question: "Watumiaji wanaweza kufuatilia utendaji wa nishati na kutambua matumizi yasiyo na ufanisi?",
    answer: "Watumiaji wanaweza kukagua uchambuzi uliohifadhiwa wa mifumo ya matumizi, vilele na kipengele cha mzigo, na kulinganisha vipindi. Uchunguzi wa hitilafu za data upo lakini si utambuzi wa hitilafu za vifaa. Utabiri unahitaji angalau siku 35 kamili mfululizo na hauonyeshwi historia isipotosha. Kwa ukaguzi wa ufanisi wa eneo, GEIT hutoa ukaguzi kama huduma ya ushauri.",
    statusNote: "Uchambuzi wa data zilizoingizwa, si ufuatiliaji endelevu.", keywords: ["ufanisi", "utendaji", "upotevu", "ukaguzi", "hitilafu", "akiba", "mzigo"],
  },
  alerts: {
    question: "Tahadhari na arifa zinafanyaje kazi?",
    answer: "Unaweza kuhifadhi kanuni za kWh za kila siku au kW za kipindi cha kilele. Kanuni hukaguliwa tu uchambuzi unapohifadhiwa; tahadhari iliyowashwa huunganisha kwenye uchambuzi huo na inaweza kuthibitishwa kuwa imeonwa. Hakuna kipangaji cha muda, tathmini endelevu au utumaji kwa barua pepe, SMS au arifa za push. Kwa hiyo kuhifadhi kanuni hakumaanishi ufuatiliaji hai.",
    statusNote: "Hukaguliwa wakati wa kuhifadhi. Hakuna njia za kutuma.", keywords: ["tahadhari", "arifa", "barua", "kanuni", "kizingiti"],
  },
  sites: {
    question: "Jukwaa linasaidia majengo au maeneo mengi?",
    answer: "Ndiyo. Unaweza kuunda na kubadilisha maeneo na mita, kuweka kanda za saa na bei zisizobadilika, na kuyaweka kwenye kumbukumbu zisizotumika au kuyarejesha, kulingana na jukumu lako. Si rejista ya jumla ya vifaa wala mfumo wa matengenezo, na muhtasari si dashibodi ya viashiria vya maeneo yote.",
    statusNote: "Usimamizi wa maeneo na mita tu.", keywords: ["eneo", "maeneo", "jengo", "majengo", "mengi", "mita", "vifaa", "bei"],
  },
  security: {
    question: "Data za wateja na ruhusa za ufikiaji zinalindwaje?",
    answer: "Rekodi za wateja ziko katika majedwali ya kila shirika yenye Row Level Security, faili ziko katika hifadhi binafsi na vikao hutumia cookies za HttpOnly. Ufikiaji hufuata uanachama wa shirika na jukumu. Hili lilikaguliwa kwa ukaguzi wa metadata wa kusoma tu; jaribio kamili la tabia kati ya mashirika na ukaguzi huru wa usalama bado havijafanywa, na GEIT haidai uthibitisho wowote wa usalama. Wasiliana na GEIT kwa maswali ya usalama au faragha.",
    statusNote: "Hakuna uthibitisho unaodaiwa. Ukaguzi huru unasubiriwa.", keywords: ["usalama", "faragha", "ruhusa", "ulinzi", "uthibitisho", "usimbaji", "ufikiaji"],
  },
  start: {
    question: "Wateja wanawezaje kuanza au kuomba maonesho ya matumizi?",
    answer: "Tuma barua pepe au piga simu kwa GEIT kwa maelezo kwenye ukurasa wa mawasiliano kujadili mahitaji yako au kuomba maonesho. Fomu ya ushauri kwenye tovuti huhakiki yaliyoingizwa tu: haitumi wala kuhifadhi maombi kwa sababu utumaji haujawekwa. Unaweza kusajiliwa na kuthibitisha barua pepe ili kuingia katika eneo la kazi, ambalo kwa sasa liko katika majaribio ya ndani.",
    statusNote: "Mawasiliano na usajili vinapatikana.", keywords: ["kuanza", "maonesho", "majaribio", "bei", "nukuu", "ushauri", "gharama", "malipo"],
  },
  support: {
    question: "Watumiaji wanawezaje kupata msaada wa kiufundi?",
    answer: "Kwa matatizo ya kuingia, tumia kurasa za kurejesha akaunti kwenye jukwaa: kusahau nenosiri na kuweka upya nenosiri. Kwa mengine, wasiliana moja kwa moja na GEIT kwa maelezo yaliyo hapa chini. Gumzo hili hujibu kutoka kwenye maswali yaliyotayarishwa tu na haliwezi kufungua tiketi za msaada au kufikia akaunti yako.",
    statusNote: "Msaada wa mtu kupitia mawasiliano.", keywords: ["msaada", "saidia", "kiufundi", "tatizo", "matatizo", "nenosiri", "kurejesha", "kusahau", "mtu"],
  },
};
