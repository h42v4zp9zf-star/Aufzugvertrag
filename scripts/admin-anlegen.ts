// Legt ein Verwaltungskonto an (zum Freischalten der Liftfirmen).
// Aufruf: DATABASE_URL=... npm run admin:anlegen -- name@firma.ch "langes-passwort"
import { db, dbSchliessen } from "../lib/db.ts";
import { emailFehler, hashPasswort, passwortFehler } from "../lib/passwort.ts";
import { kontoAnlegen, kontoMitHashPerEmail } from "../lib/repo.ts";

const [email, passwort] = process.argv.slice(2);
if (!email || !passwort) {
  console.error('Aufruf: npm run admin:anlegen -- name@firma.ch "langes-passwort"');
  process.exit(1);
}
const ef = emailFehler(email.trim());
if (ef) {
  console.error(ef);
  process.exit(1);
}
const pf = passwortFehler(passwort);
if (pf) {
  console.error(pf);
  process.exit(1);
}

const d = await db();
if (await kontoMitHashPerEmail(d, email)) {
  console.error("Für diese E-Mail-Adresse gibt es bereits ein Konto.");
} else {
  await kontoAnlegen(d, { firma: "Verwaltung", uid: "", email, passwortHash: await hashPasswort(passwort), rolle: "admin", status: "aktiv" });
  console.log(`Verwaltungskonto ${email} angelegt.`);
}
await dbSchliessen();
