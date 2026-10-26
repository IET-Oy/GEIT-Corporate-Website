import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createElement as h, Fragment, StrictMode } from "react";
import { Router } from "wouter";
import { supportRuntime } from "./helpers/support-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const languages = ["en", "fr", "rw", "sw"];
const accountQuestions = {
  en: "Please help with my account",
  fr: "Aidez-moi avec mon compte",
  rw: "Mfasha kuri konti yanjye",
  sw: "Nisaidie kuhusu akaunti yangu",
};

test("Energy DT navigation remains visible and announces its coming-soon state on click", async () => {
  const r = await supportRuntime(root);
  const { render, within, user, cleanup, LanguageProvider, AppNav } = r;
  try {
    render(h(LanguageProvider, { initialLanguage: "en" },
      h(Router, { ssrPath: "/" }, h(AppNav))));
    const link = within(document.body).getByRole("link", { name: "Energy DT" });
    assert.equal(link.getAttribute("href"), "/energy-saas");
    await user.click(link);
    assert.match(within(document.body).getByRole("status").textContent, /coming soon/i);
    assert.equal(window.location.pathname, "/");
  } finally {
    cleanup();
    await r.close();
  }
});

test("public support interactions stay in the shared selected language", async t => {
  const r = await supportRuntime(root);
  const { render, within, user, act, cleanup, faq, supportCopy, timing } = r;
  t.afterEach(() => {
    cleanup();
    timing.deferAnswers(false);
    timing.pending.splice(0);
  });
  const mount = (initialLanguage) => render(
    h(StrictMode, null, h(r.LanguageProvider, { initialLanguage },
      h(Router, { ssrPath: "/" }, h(Fragment, null,
        h("header", null, h(r.LanguageSelector)),
        h(r.SaasFaqSection), h(r.SupportWidget))))));
  const section = () => document.querySelector("#saas-faq");
  const dialog = () => within(document.querySelector('[role="dialog"]'));
  const log = () => document.querySelector('[role="log"]');
  const launcher = language => within(document.body).getByRole("button", { name: supportCopy[language].launcher });
  const switchTo = async language => {
    await user.selectOptions(document.querySelector("header select"), language);
    assert.equal(document.documentElement.lang, language);
    assert.equal(window.localStorage.getItem("geit-language-preference"), language);
  };
  const checkSuggestions = language => {
    const list = dialog().getByRole("list", { name: supportCopy[language].suggestions });
    assert.deepEqual(within(list).getAllByRole("button").map(button => button.textContent), faq.getSuggestedQuestions(language));
  };
  const checkClean = language => {
    const copy = supportCopy[language];
    assert.equal(section().lang, language);
    assert.equal(document.querySelector('[role="dialog"]').parentElement.lang, language);
    assert.equal(within(section()).getByRole("searchbox", { name: copy.search }).value, "");
    assert.equal(within(section()).getAllByRole("button", { expanded: false }).length, 12);
    assert.equal(dialog().getByRole("textbox", { name: copy.question }).value, "");
    assert.equal(log().textContent.includes(copy.welcome), true);
    assert.equal(log().textContent.includes(copy.languageReset), true);
    assert.equal(dialog().queryByText(copy.busy), null);
    checkSuggestions(language);
  };
  const ask = async (question, language) => {
    await user.type(dialog().getByRole("textbox", { name: supportCopy[language].question }), question);
    await user.keyboard("{Enter}");
  };
  try {
    for (const language of languages) {
      await t.test(`${language}: FAQ search, accordion, support event, suggestions, related questions and escalation`, async () => {
        mount(language);
        const copy = supportCopy[language];
        const items = faq.getSaasFaq(language);
        const search = within(section()).getByRole("searchbox", { name: copy.search });
        await user.type(search, "zzzyyyxxxx");
        assert.equal(within(section()).getByRole("status").textContent, copy.noMatch);
        await user.click(within(section()).getByRole("button", { name: copy.clear }));
        assert.equal(search.value, "");
        assert.equal(within(section()).getAllByRole("button", { expanded: false }).length, 12);
        const item = items.find(item => !item.humanHelp);
        await user.type(search, item.question);
        const toggle = within(section()).getByRole("button", { name: item.question, exact: true });
        await user.click(toggle);
        const region = within(section()).getByRole("region", { name: item.question, exact: true });
        assert.equal(toggle.getAttribute("aria-controls"), region.id);
        assert.equal(within(region).getByText(item.answer).textContent, item.answer);
        await user.click(within(region).getByRole("button", { name: copy.ask }));
        assert.equal(document.activeElement, dialog().getByRole("textbox", { name: copy.question }));
        assert.ok(within(log()).getByText(item.question, { exact: true }));
        assert.ok(within(log()).getByText(item.answer, { exact: true }));
        assert.ok(within(log()).getByText(copy[item.status].toUpperCase(), { exact: true }));
        for (const link of item.links) {
          assert.equal(within(log()).getByRole("link", { name: link.label, exact: true }).getAttribute("href"), link.href);
        }
        await user.click(toggle);
        assert.equal(region.hidden, true);
        checkSuggestions(language);
        await user.click(dialog().getByRole("button", { name: copy.reset }));
        const suggested = faq.getSuggestedQuestions(language)[0];
        await user.click(dialog().getByRole("button", { name: suggested, exact: true }));
        assert.ok(within(log()).getByText(faq.answerFromFaq(suggested, items, language).text, { exact: true }));

        // Choose a real answer with related questions in each locale, not a mocked fixture.
        const relatedSource = items.find(item => faq.answerFromFaq(item.question, items, language).related?.length);
        assert.ok(relatedSource, `No related-question coverage for ${language}`);
        await user.click(dialog().getByRole("button", { name: copy.reset }));
        await ask(relatedSource.question, language);
        const related = faq.answerFromFaq(relatedSource.question, items, language).related;
        const relatedButtons = within(log()).getAllByRole("button").filter(button => button.textContent !== copy.english);
        assert.deepEqual(relatedButtons.map(button => button.textContent), related);
        assert.ok(related.every(question => items.some(item => item.question === question)));
        await user.click(relatedButtons[0]);
        const expected = faq.answerFromFaq(related[0], items, language);
        assert.ok(within(log()).getAllByText(expected.text, { exact: true }).length);

        for (const [question, reply] of [["zzzyyyxxxx", copy.unknown], [accountQuestions[language], copy.human]]) {
          await user.click(dialog().getByRole("button", { name: copy.reset }));
          await ask(question, language);
          assert.ok(within(log()).getByText(reply, { exact: true }));
          assert.ok(log().textContent.includes(copy.humanHelp));
          assert.ok(log().textContent.includes(copy.replyTime));
          assert.equal(within(log()).getByRole("link", { name: copy.contactPage, exact: true }).getAttribute("href"), "/contact");
          assert.equal(within(log()).getByRole("link", { name: copy.contact, exact: true }).getAttribute("href"), "/contact");
          const contact = faq.humanContact();
          assert.equal(within(log()).getByRole("link", { name: contact.email }).getAttribute("href"), `mailto:${contact.email}`);
        }
        cleanup();
      });
    }

    await t.test("every directed language switch clears searches, expanded FAQ, messages and drafts while keeping support open", async () => {
      // All 12 directed transitions catch bugs hidden by a single en → fr path.
      for (const source of languages) for (const target of languages.filter(value => value !== source)) {
        mount(source);
        const oldItem = faq.getSaasFaq(source)[0];
        await user.type(within(section()).getByRole("searchbox"), oldItem.question);
        await user.click(within(section()).getByRole("button", { name: oldItem.question, exact: true }));
        await user.click(launcher(source));
        await ask("zzzyyyxxxx", source);
        await user.type(dialog().getByRole("textbox"), "unfinished conversation");
        const selector = document.querySelector("header select");
        await switchTo(target);
        assert.equal(document.querySelector("header select"), selector, "selector must not be remounted or moved");
        assert.equal(launcher(target).getAttribute("aria-expanded"), "true");
        checkClean(target);
        assert.equal(log().textContent.includes(supportCopy[source].unknown), false);
        assert.equal(log().textContent.includes("zzzyyyxxxx"), false);
        assert.equal(log().textContent.includes("unfinished conversation"), false);
        await ask(faq.getSuggestedQuestions(target)[0], target);
        assert.ok(within(log()).getByText(faq.answerFromFaq(faq.getSuggestedQuestions(target)[0], faq.getSaasFaq(target), target).text, { exact: true }));
        cleanup();
      }
    });

    await t.test("late old-language answers cannot enter a new conversation or clear its busy state", async () => {
      for (let index = 0; index < languages.length; index++) {
        const source = languages[index], target = languages[(index + 1) % languages.length];
        mount(source);
        timing.deferAnswers(true);
        await user.click(launcher(source));
        await ask(faq.getSuggestedQuestions(source)[0], source);
        assert.ok(dialog().getByText(supportCopy[source].busy));
        assert.equal(dialog().getByRole("button", { name: supportCopy[source].send }).disabled, true);
        const old = timing.pending.shift();
        assert.equal(old.language, source);
        await switchTo(target);
        checkClean(target);
        const question = faq.getSuggestedQuestions(target)[0];
        await ask(question, target);
        const current = timing.pending.shift();
        assert.equal(current.language, target);
        await act(async () => { await old.release(); });
        assert.ok(dialog().getByText(supportCopy[target].busy));
        assert.equal(within(log()).queryByText(faq.answerFromFaq(old.question, faq.getSaasFaq(source), source).text, { exact: true }), null);
        await act(async () => { await current.release(); });
        assert.equal(dialog().queryByText(supportCopy[target].busy), null);
        assert.ok(within(log()).getByText(faq.answerFromFaq(question, faq.getSaasFaq(target), target).text, { exact: true }));
        cleanup();
      }
      timing.deferAnswers(false);
    });

    for (const language of languages) {
      await t.test(`${language}: reset cancels pending answers and keyboard focus stays usable`, async () => {
        mount(language);
        const copy = supportCopy[language];
        launcher(language).focus();
        await user.keyboard("{Enter}");
        assert.equal(document.activeElement, dialog().getByRole("textbox"));
        timing.deferAnswers(true);
        await ask(faq.getSuggestedQuestions(language)[0], language);
        const old = timing.pending.shift();
        // Rapid suggested clicks must not start a second in-flight answer.
        await user.click(dialog().getByRole("button", { name: faq.getSuggestedQuestions(language)[1], exact: true }));
        assert.equal(timing.pending.length, 0);
        await user.type(dialog().getByRole("textbox"), "draft to clear");
        await user.click(dialog().getByRole("button", { name: copy.reset }));
        assert.equal(document.activeElement, dialog().getByRole("textbox"));
        checkClean(language);
        const before = log().textContent;
        await act(async () => { await old.release(); });
        assert.equal(log().textContent, before);
        timing.deferAnswers(false);
        await ask("zzzyyyxxxx", language);
        assert.ok(within(log()).getByText(copy.unknown));
        await user.click(dialog().getByRole("button", { name: copy.reset }));
        const close = dialog().getByRole("button", { name: copy.close });
        const last = dialog().getByRole("link", { name: copy.read });
        last.focus();
        await user.tab();
        assert.equal(document.activeElement, close);
        await user.tab({ shift: true });
        assert.equal(document.activeElement, last);
        await user.keyboard("{Escape}");
        assert.equal(document.querySelector('[role="dialog"]'), null);
        assert.equal(document.activeElement, launcher(language));
        assert.equal(launcher(language).getAttribute("aria-expanded"), "false");
        await user.keyboard(" ");
        assert.equal(document.activeElement, dialog().getByRole("textbox"));
        cleanup();
      });
    }

    await t.test("English-source notices use the shared selector and preference survives remount without conversations", async () => {
      for (const source of languages.filter(value => value !== "en")) {
        for (const surface of ["faq", "widget"]) {
          mount(source);
          await user.click(launcher(source));
          await ask("zzzyyyxxxx", source);
          await user.type(within(section()).getByRole("searchbox"), "zzzyyyxxxx");
          const scope = surface === "faq" ? within(section()) : dialog();
          await user.click(scope.getByRole("button", { name: supportCopy[source].english, exact: true }));
          assert.equal(document.querySelector("header select").value, "en");
          checkClean("en");
          assert.equal(within(section()).queryByRole("button", { name: supportCopy[source].english }), null);
          assert.equal(window.localStorage.getItem("geit-language-preference"), "en");
          cleanup();
        }
      }
      for (const language of languages) {
        mount("en");
        await switchTo(language);
        await user.click(launcher(language));
        await ask("zzzyyyxxxx", language);
        cleanup();
        mount(undefined);
        assert.equal(document.querySelector("header select").value, language);
        assert.equal(document.documentElement.lang, language);
        assert.equal(launcher(language).getAttribute("aria-expanded"), "false");
        await user.click(launcher(language));
        checkClean(language);
        assert.deepEqual(Object.keys(window.localStorage), ["geit-language-preference"]);
        cleanup();
      }
    });
  } finally {
    await r.close();
  }
});
