import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { Link } from "wouter";
import { SUPPORT_OPEN_EVENT, answerQuestion, humanContact, getSuggestedQuestions, type SupportAnswer } from "@/data/saas-faq";
import { useLanguage } from "@/lib/language-context";
import { supportCopy } from "@/lib/translations/support";
import { SupportLanguageNotice } from "./support-language-notice";

type Msg = { id: number; from: "user" | "bot"; text: string; answer?: SupportAnswer };

export function SupportWidget() {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  return <LocalizedSupport key={language} open={open} setOpen={setOpen} />;
}

function LocalizedSupport({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { language } = useLanguage();
  const copy = supportCopy[language];
  const suggestedQuestions = getSuggestedQuestions(language);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const conversation = useRef(0);
  const pending = useRef(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const contact = humanContact();

  const ask = useCallback(async (q: string) => {
    const question = q.trim().slice(0, 300);
    if (!question || pending.current) return;
    const version = conversation.current;
    pending.current = true;
    setMsgs((m) => [...m.slice(-38), { id: ++idRef.current, from: "user", text: question }]);
    setBusy(true);
    const answer = await answerQuestion(question, undefined, undefined, language);
    if (version !== conversation.current) return;
    setMsgs((m) => [...m, { id: ++idRef.current, from: "bot", text: answer.text, answer }]);
    setBusy(false);
    pending.current = false;
  }, [language]);

  const close = useCallback(() => { setOpen(false); launcher.current?.focus(); }, [setOpen]);

  useEffect(() => () => { conversation.current++; }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      if (q) void ask(q);
    };
    window.addEventListener(SUPPORT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SUPPORT_OPEN_EVENT, onOpen);
  }, [ask, setOpen]);

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [msgs]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    if (e.key !== "Tab" || !panel.current) return;
    const f = Array.from(panel.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input"));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); const q = text; setText(""); void ask(q); };
  const reset = () => { conversation.current++; pending.current = false; setBusy(false); setMsgs([]); setText(""); input.current?.focus(); };

  return (
    <div lang={language} className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
      {open && (
        <div ref={panel} id="geit-support-panel" role="dialog" aria-modal="false" aria-labelledby="geit-support-title" onKeyDown={onKey} className="fixed inset-x-3 bottom-20 flex max-h-[min(36rem,calc(100dvh-6.5rem))] flex-col border border-[#c9d5db] bg-white text-[#10243a] shadow-[0_18px_50px_rgba(16,36,58,.28)] sm:absolute sm:inset-x-auto sm:bottom-16 sm:right-0 sm:w-[24rem]">
          <div className="flex items-start justify-between gap-3 bg-[#10243a] px-4 py-3 text-white">
            <div>
              <h2 id="geit-support-title" className="text-sm font-bold">{copy.title}</h2>
              <p className="mt-0.5 text-[11px] leading-4 text-white/75">{copy.disclosure}</p>
            </div>
            <button type="button" onClick={close} aria-label={copy.close} className="p-1 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e8b64b]"><X size={18} aria-hidden="true" /></button>
          </div>
          <div ref={log} role="log" aria-live="polite" aria-label={copy.conversation} className="min-h-[9rem] flex-1 space-y-3 overflow-y-auto bg-[#f7f9fa] px-4 py-3 text-sm">
            <SupportLanguageNotice />
            <p className="bg-white p-3 leading-6 text-[#34505f] shadow-sm">{copy.welcome}</p>
            <p className="text-xs text-[#647481]">{copy.languageReset}</p>
            {msgs.map((m) => m.from === "user" ? (
              <p key={m.id} className="ml-8 bg-[#168568] p-3 leading-6 text-white">{m.text}</p>
            ) : (
              <div key={m.id} className="mr-4 bg-white p-3 leading-6 text-[#34505f] shadow-sm">
                {m.answer?.status && <p className="mb-1 text-[11px] font-bold tracking-[.08em] text-[#168568]">{copy[m.answer.status].toUpperCase()}</p>}
                <p>{m.text}</p>
                {m.answer && m.answer.links.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-bold">
                    {m.answer.links.map((l) => <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className="text-[#168568] underline underline-offset-2">{l.label}</Link></li>)}
                  </ul>
                )}
                {m.answer?.kind === "human" && (
                  <p className="mt-2 border-t border-[#dce3e8] pt-2 text-xs">
                    {copy.humanHelp} <Link href={contact.page} onClick={() => setOpen(false)} className="font-bold text-[#168568] underline">{copy.contactPage}</Link>
                    {contact.email && <> {copy.or} <a className="font-bold text-[#168568] underline" href={`mailto:${contact.email}`}>{contact.email}</a></>}
                    {contact.telephone && <> {copy.or} <a className="font-bold text-[#168568] underline" href={`tel:${contact.telephone.replace(/[^+\d]/g, "")}`}>{contact.telephone}</a></>}. {copy.replyTime}
                  </p>
                )}
                {m.answer?.related && m.answer.related.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.answer.related.map((r) => <button key={r} type="button" onClick={() => void ask(r)} className="border border-[#c9d5db] px-2 py-1 text-left text-xs hover:bg-[#f2f5f7]">{r}</button>)}
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-xs text-[#647481]">{copy.busy}</p>}
          </div>
          <div className="border-t border-[#dce3e8] px-4 pt-3">
            <p className="text-[11px] font-bold tracking-[.1em] text-[#647481]" id="geit-suggest">{copy.suggestions}</p>
            <ul aria-labelledby="geit-suggest" className="mt-2 flex max-h-20 flex-wrap gap-2 overflow-y-auto">
              {suggestedQuestions.map((s) => <li key={s}><button type="button" onClick={() => void ask(s)} className="border border-[#c9d5db] px-2 py-1 text-left text-xs hover:bg-[#f2f5f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#168568]">{s}</button></li>)}
            </ul>
          </div>
          <form onSubmit={submit} className="flex gap-2 p-4">
            <label htmlFor="geit-support-input" className="sr-only">{copy.question}</label>
            <input ref={input} id="geit-support-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} autoComplete="off" placeholder={copy.input} className="min-w-0 flex-1 border border-[#c9d5db] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#168568]" />
             <button type="submit" disabled={busy || !text.trim()} aria-label={copy.send} className="bg-[#168568] px-3 text-white hover:bg-[#116d55] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b64b]"><Send size={16} aria-hidden="true" /></button>
          </form>
          <div className="flex items-center justify-between border-t border-[#dce3e8] px-4 py-2 text-xs">
            <button type="button" onClick={reset} className="inline-flex items-center gap-1 font-bold text-[#168568] underline"><RotateCcw size={13} aria-hidden="true" />{copy.reset}</button>
            <Link href="/#saas-faq" onClick={() => setOpen(false)} className="font-bold text-[#168568] underline">{copy.read}</Link>
          </div>
        </div>
      )}
       <button ref={launcher} type="button" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open} aria-controls={open ? "geit-support-panel" : undefined} aria-haspopup="dialog" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#10243a] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(16,36,58,.28)] transition hover:bg-[#1a3956] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]">
        <MessageCircle size={20} aria-hidden="true" />
        <span className="max-sm:sr-only">{copy.launcher}</span>
      </button>
    </div>
  );
}

export default SupportWidget;
