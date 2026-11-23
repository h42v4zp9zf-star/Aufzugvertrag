"use client";

// Unterschrift des Kunden mit dem Finger auf dem Bildschirm (Wunsch Dario, 23.11.2026).

import { useEffect, useRef, useState, type PointerEvent } from "react";

export function Unterschrift({ wert, setzen }: { wert: string; setzen: (v: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const zeichnet = useRef(false);
  const letzte = useRef<{ x: number; y: number } | null>(null);
  const [neu, setNeu] = useState(!wert);
  const [leer, setLeer] = useState(true);

  useEffect(() => {
    if (!neu) return;
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#171a20";
  }, [neu]);

  const punkt = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function start(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    zeichnet.current = true;
    letzte.current = punkt(e);
    const ctx = e.currentTarget.getContext("2d");
    if (ctx && letzte.current) {
      ctx.beginPath();
      ctx.arc(letzte.current.x, letzte.current.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "#171a20";
      ctx.fill();
    }
  }

  function bewegen(e: PointerEvent<HTMLCanvasElement>) {
    if (!zeichnet.current || !letzte.current) return;
    const p = punkt(e);
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(letzte.current.x, letzte.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    letzte.current = p;
  }

  function ende(e: PointerEvent<HTMLCanvasElement>) {
    if (!zeichnet.current) return;
    zeichnet.current = false;
    letzte.current = null;
    setLeer(false);
    setzen(e.currentTarget.toDataURL("image/png"));
  }

  function loeschen() {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setLeer(true);
    setzen("");
  }

  if (wert && !neu) {
    return (
      <div className="unterschrift-feld">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wert} alt="Unterschrift des Kunden" className="unterschrift unterschrift--bild" />
        <button
          type="button"
          className="linkbtn"
          onClick={() => {
            setzen("");
            setLeer(true);
            setNeu(true);
          }}
        >
          Neu unterschreiben
        </button>
      </div>
    );
  }

  return (
    <div className="unterschrift-feld">
      <canvas
        ref={canvas}
        className="unterschrift"
        aria-label="Feld für die Unterschrift des Kunden"
        onPointerDown={start}
        onPointerMove={bewegen}
        onPointerUp={ende}
        onPointerCancel={ende}
      />
      <div className="row-between">
        <span className="muted">{leer ? "Hier mit dem Finger unterschreiben." : "Unterschrift erfasst."}</span>
        {!leer && (
          <button type="button" className="linkbtn" onClick={loeschen}>
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}
