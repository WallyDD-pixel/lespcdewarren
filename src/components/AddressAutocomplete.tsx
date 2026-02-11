"use client";
import { useEffect, useRef, useState } from "react";

export type Address = {
  label: string;
  postcode?: string;
  city?: string;
  street?: string;
  housenumber?: string;
};

export default function AddressAutocomplete({ value, onChange, placeholder = "Adresse" }: { value: string; onChange: (v: string, parsed?: Partial<Address>) => void; placeholder?: string }) {
  const [q, setQ] = useState(value || "");
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => { setQ(value || ""); }, [value]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q || q.trim().length < 2) { setSuggestions([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address/lookup?q=${encodeURIComponent(q)}`);
        const j = await res.json();
        if (!j?.ok) { setSuggestions([]); setLoading(false); return; }
        const sug = (j.suggestions || []).map((s: any) => ({ label: s.label, postcode: s.postcode, city: s.city, street: s.street, housenumber: s.housenumber }));
        setSuggestions(sug);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  return (
    <div className="relative">
      <input
        className="input"
        value={q}
        placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        autoComplete="off"
      />
      {open && (loading || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-1 max-h-64 overflow-auto rounded-md border border-white/20 bg-black text-white shadow-2xl divide-y divide-white/10" role="listbox">
          {loading && <div className="px-3 py-2 text-xs text-white/80">Recherche…</div>}
          {suggestions.map((s, i) => (
            <button key={i} type="button" className="block w-full text-left px-3 py-2 hover:bg-white/10 text-sm whitespace-normal" onMouseDown={(e)=> e.preventDefault()} onClick={() => { setQ(s.label); setOpen(false); onChange(s.label, s); }}>
              {s.label}
            </button>
          ))}
          <div className="px-3 py-1 text-[10px] text-white/70">Suggestions par api-adresse.data.gouv.fr</div>
        </div>
      )}
    </div>
  );
}
