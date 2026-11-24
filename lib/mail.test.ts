import { test } from "node:test";
import assert from "node:assert/strict";
import { benachrichtigen, benachrichtigungAn, mailEinstellungen, mailSenden, RESEND_URL, STANDARD_ABSENDER, versenden, type Mail } from "./mail.ts";

const MAIL: Mail = { betreff: "Test „Ä“", text: "Hallo", anhaenge: [{ dateiname: "a.pdf", inhalt: new Uint8Array([37, 80, 68, 70]) }] };
const ENV = { RESEND_API_KEY: "re_test", BENACHRICHTIGUNG_AN: "dario@example.ch" };

function fakeFetch(status: number, antwort: unknown) {
  const aufrufe: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    aufrufe.push({ url, init });
    return new Response(JSON.stringify(antwort), { status, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
  return { f, aufrufe };
}

test("Einstellungen: ohne Schlüssel bleibt der Versand aus, Empfänger separat", () => {
  assert.equal(mailEinstellungen({}), null);
  assert.equal(mailEinstellungen({ RESEND_API_KEY: "  " }), null);
  assert.deepEqual(mailEinstellungen(ENV), { apiKey: "re_test", absender: STANDARD_ABSENDER });
  assert.equal(mailEinstellungen({ ...ENV, MAIL_ABSENDER: "Elevaris <termine@elevaris.ch>" })?.absender, "Elevaris <termine@elevaris.ch>");
  assert.equal(benachrichtigungAn(ENV), "dario@example.ch");
  assert.equal(benachrichtigungAn({ BENACHRICHTIGUNG_AN: " " }), null);
});

test("Versand: Anfrage an Resend mit Schlüssel, Empfänger und Anhang in Base64", async () => {
  const { f, aufrufe } = fakeFetch(200, { id: "abc-123" });
  const r = await mailSenden(MAIL, "dario@example.ch", mailEinstellungen(ENV)!, f);
  assert.deepEqual(r, { ok: true, id: "abc-123" });
  assert.equal(aufrufe.length, 1);
  assert.equal(aufrufe[0].url, RESEND_URL);
  assert.equal((aufrufe[0].init.headers as Record<string, string>).Authorization, "Bearer re_test");
  const body = JSON.parse(String(aufrufe[0].init.body));
  assert.deepEqual(body.to, ["dario@example.ch"]);
  assert.equal(body.from, STANDARD_ABSENDER);
  assert.equal(body.subject, "Test „Ä“");
  assert.deepEqual(body.attachments, [{ filename: "a.pdf", content: "JVBERg==" }]);
});

test("Versand: Fehler von Resend wird gemeldet, nicht geworfen", async () => {
  const { f } = fakeFetch(403, { message: "You can only send testing emails to your own email address" });
  const r = await mailSenden(MAIL, "firma@example.ch", mailEinstellungen(ENV)!, f);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.fehler : "", /403.*own email address/);
});

test("Benachrichtigen: ohne Einstellungen kein Versand, bei Fehlern nie eine Ausnahme", async () => {
  const { f, aufrufe } = fakeFetch(200, { id: "x" });
  assert.equal(await benachrichtigen("Test", async () => MAIL, {}, f), null);
  assert.equal(aufrufe.length, 0, "ohne Schlüssel wird nichts gesendet");

  const kaputt = (async () => {
    throw new Error("Netzwerk weg");
  }) as unknown as typeof fetch;
  assert.deepEqual(await benachrichtigen("Test", async () => MAIL, ENV, kaputt), { ok: false, fehler: "Netzwerk weg" });
  const r = await benachrichtigen(
    "Test",
    async () => {
      throw new Error("PDF kaputt");
    },
    ENV,
    f,
  );
  assert.deepEqual(r, { ok: false, fehler: "PDF kaputt" });
  assert.deepEqual(await benachrichtigen("Test", async () => MAIL, ENV, f), { ok: true, id: "x" });
  assert.equal(await benachrichtigen("Test", async () => MAIL, { RESEND_API_KEY: "re_x" }, f), null, "ohne BENACHRICHTIGUNG_AN");
});

test("Versenden an eine andere Adresse (z. B. Passwort vergessen) braucht nur den Schlüssel", async () => {
  const { f, aufrufe } = fakeFetch(200, { id: "y" });
  assert.deepEqual(await versenden("Passwort", "firma@example.ch", async () => MAIL, { RESEND_API_KEY: "re_x" }, f), { ok: true, id: "y" });
  assert.deepEqual(JSON.parse(String(aufrufe[0].init.body)).to, ["firma@example.ch"]);
  assert.equal(await versenden("Passwort", null, async () => MAIL, { RESEND_API_KEY: "re_x" }, f), null);
});
