import { useState, type FormEvent } from "react";
import { useExplainEngineeringScenario, type EngineeringWorkspaceAiStatus } from "@workspace/api-client-react";
import { Alert, Field, SubmitButton, WRITE, apiMessage } from "../common";
import { Panel } from "../energy/ui";
import { INPUT, type SustainModule } from "./utils";

export function AiPanel({ orgId, module, scenarioId, aiStatus }: { orgId: string; module: SustainModule; scenarioId: string; aiStatus: EngineeringWorkspaceAiStatus | undefined }) {
  const explain = useExplainEngineeringScenario(WRITE);
  const [question, setQuestion] = useState(""); const [consent, setConsent] = useState(false); const [errs, setErrs] = useState<{ q?: string; c?: string }>({});
  if (aiStatus !== "configured") return <Panel id="ai-h" title="Evidence assistant"><div data-testid="notice-ai-disabled"><Alert tone="info">The optional AI evidence assistant is not configured on this server. Everything else works without it, and no data is sent anywhere.</Alert></div></Panel>;
  function submit(e: FormEvent) {
    e.preventDefault(); const t = question.trim();
    const x = { q: t.length < 5 || t.length > 1000 ? "Ask a question of 5 to 1000 characters." : undefined, c: consent ? undefined : "Consent is required before sending." };
    setErrs(x); if (x.q || x.c) return;
    explain.mutate({ orgId, module, id: scenarioId, data: { question: t, consent: true } });
  }
  const a = explain.data;
  return (
    <Panel id="ai-h" title="Evidence assistant">
      <p className="mb-4 max-w-3xl text-xs leading-5 text-[#5d707c]">The assistant only selects which verified evidence items from this saved scenario answer your question. It writes no numbers; every statement shown is trusted text produced by the server from the saved result.</p>
      <form onSubmit={submit} noValidate className="max-w-3xl space-y-4" data-testid="form-ai">
        {explain.isError && <Alert testId="error-ai">{apiMessage(explain.error, "The assistant could not answer.")}</Alert>}
        <Field label="QUESTION" error={errs.q}>{(p) => <textarea id={p.id} rows={2} className={INPUT} value={question} onChange={(e) => setQuestion(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-ai-question" />}</Field>
        <div><label className="flex items-start gap-3 text-sm text-[#34495a]"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="check-ai-consent" />Send this saved scenario’s verified evidence to the configured AI provider</label>{errs.c && <p className="mt-1.5 text-xs font-semibold text-[#9b2c1b]">{errs.c}</p>}</div>
        <SubmitButton pending={explain.isPending} testId="button-ask-ai">Select relevant evidence</SubmitButton>
      </form>
      {a && (
        <div className="mt-6 max-w-3xl space-y-3" data-testid="result-ai">
          <p className="text-xs text-[#6b7b87]">Provider {a.provider}, model {a.model}. Cites input hash <span className="break-all font-mono" data-testid="text-ai-hash">{a.inputHash}</span> (scenario {a.scenarioId}).</p>
          {a.evidence.length === 0 ? <Alert tone="info">No evidence item matched the question.</Alert> : <ul className="space-y-2" data-testid="list-ai-evidence">{a.evidence.map((x) => <li key={x.id} className="border-l-4 border-[#168568] bg-[#f2f5f7] px-4 py-2 text-sm"><span className="mr-2 font-mono text-[11px] text-[#6b7b87]">{x.id}</span>{x.text}</li>)}</ul>}
          <p className="text-xs italic text-[#5d707c]" data-testid="text-ai-limitation">{a.limitation}</p>
        </div>)}
    </Panel>
  );
}
