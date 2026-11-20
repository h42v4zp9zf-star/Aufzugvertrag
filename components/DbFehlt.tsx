export function DbFehlt() {
  return (
    <div className="banner">
      Das Portal braucht eine Datenbank. Bitte die Umgebungsvariable <code>DATABASE_URL</code> setzen (siehe README).
    </div>
  );
}
