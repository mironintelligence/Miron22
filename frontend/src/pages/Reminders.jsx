import React, { useEffect, useState, useMemo, useCallback } from "react";
import { authFetch } from "../auth/api";
import { emitToast } from "../utils/toastBus";

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const GOLD = "#ebac00";

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function parseDate(s) { try { return new Date(s); } catch { return null; } }
function fmtTime(s) {
  const d = parseDate(s);
  if (!d) return "";
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateFull(s) {
  const d = parseDate(s);
  if (!d) return s;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Mini form modal ──────────────────────────────────────────────────────────
function CreateModal({ defaultDate, onSave, onClose }) {
  const toLocal = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [title, setTitle]           = useState("");
  const [details, setDetails]       = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [court, setCourt]           = useState("");
  const [dueAt, setDueAt]           = useState(toLocal(defaultDate || new Date()));
  const [remind7d, setRemind7d]     = useState(false);
  const [remind1d, setRemind1d]     = useState(true);
  const [remind1h, setRemind1h]     = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [saving, setSaving]         = useState(false);

  const submit = async () => {
    if (!title.trim() || !dueAt) return;
    setSaving(true);
    try {
      const offsets = [];
      if (remind7d) offsets.push(7 * 24 * 60);
      if (remind1d) offsets.push(24 * 60);
      if (remind1h) offsets.push(60);
      const channels = ["in_app"];
      if (notifyEmail) channels.push("email");
      const res = await authFetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, details, case_number: caseNumber, court,
          due_at: new Date(dueAt).toISOString(),
          remind_offsets_minutes: offsets,
          channels,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Kaydedilemedi."); }
      emitToast("Hatırlatıcı kaydedildi.", "success");
      onSave();
    } catch (e) { emitToast(e.message || "Hata.", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)",padding:16 }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%",maxWidth:460,background:"#0a0a0a",border:"0.5px solid #2a2a2a",borderRadius:16,padding:24,display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ color:"#fff",fontWeight:600,fontSize:15 }}>Yeni Hatırlatıcı</span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:18,lineHeight:1 }}>×</button>
        </div>

        <input style={inp} placeholder="Başlık *" value={title} onChange={e=>setTitle(e.target.value)} autoFocus />
        <textarea style={{...inp,height:72,resize:"none"}} placeholder="Not / detay" value={details} onChange={e=>setDetails(e.target.value)} />

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <input style={inp} placeholder="Dosya No" value={caseNumber} onChange={e=>setCaseNumber(e.target.value)} />
          <input style={inp} placeholder="Mahkeme" value={court} onChange={e=>setCourt(e.target.value)} />
        </div>

        <div>
          <div style={{ fontSize:11,color:"#555",marginBottom:6 }}>Tarih & Saat</div>
          <input type="datetime-local" style={inp} value={dueAt} onChange={e=>setDueAt(e.target.value)} />
        </div>

        <div style={{ background:"#111",border:"0.5px solid #222",borderRadius:10,padding:"12px 14px" }}>
          <div style={{ fontSize:11,color:"#555",marginBottom:8 }}>Hatırlatma</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
            {[{label:"7 gün önce",v:remind7d,set:setRemind7d},{label:"1 gün önce",v:remind1d,set:setRemind1d},{label:"1 saat önce",v:remind1h,set:setRemind1h}].map(({label,v,set})=>(
              <label key={label} style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#888",cursor:"pointer" }}>
                <CheckBox checked={v} onChange={set} /> {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ background:"#111",border:"0.5px solid #222",borderRadius:10,padding:"12px 14px" }}>
          <div style={{ fontSize:11,color:"#555",marginBottom:8 }}>Bildirim</div>
          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
            <div style={{ fontSize:12,color:"#555" }}>Uygulama içi — her zaman aktif</div>
            <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#888",cursor:"pointer" }}>
              <CheckBox checked={notifyEmail} onChange={setNotifyEmail} /> E-posta bildirimi
            </label>
          </div>
        </div>

        <button onClick={submit} disabled={saving||!title.trim()||!dueAt}
          style={{ background:GOLD,color:"#000",fontWeight:700,fontSize:13,border:"none",borderRadius:10,padding:"11px 0",cursor:"pointer",opacity:(saving||!title.trim()||!dueAt)?0.5:1,transition:"opacity 150ms" }}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

function CheckBox({ checked, onChange }) {
  return (
    <div onClick={()=>onChange(!checked)}
      style={{ width:16,height:16,borderRadius:4,border:`1.5px solid ${checked?GOLD:"#333"}`,background:checked?GOLD:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 150ms" }}>
      {checked && <svg width="9" height="7" viewBox="0 0 9 7"><polyline points="1,3.5 3.5,6 8,1" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>}
    </div>
  );
}

const inp = { width:"100%",boxSizing:"border-box",background:"#000",border:"0.5px solid #2a2a2a",borderRadius:8,padding:"9px 12px",color:"#ccc",fontSize:13,outline:"none",fontFamily:"inherit" };

// ── Calendar cell ────────────────────────────────────────────────────────────
function CalCell({ day, today, selected, hasDot, inMonth, onClick }) {
  const isToday = today && isSameDay(day, today);
  const isSel   = selected && isSameDay(day, selected);
  return (
    <button onClick={onClick}
      style={{ position:"relative",width:34,height:34,borderRadius:"50%",border:"none",cursor:inMonth?"pointer":"default",
        background: isSel ? GOLD : isToday ? "rgba(235,172,0,0.15)" : "transparent",
        color: isSel ? "#000" : isToday ? GOLD : inMonth ? "#ccc" : "#333",
        fontWeight: isSel||isToday ? 700 : 400,
        fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",
        transition:"all 130ms",outline:"none",
      }}>
      {day.getDate()}
      {hasDot && !isSel && (
        <span style={{ position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:GOLD }} />
      )}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Reminders() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected]   = useState(today);
  const [modalDate, setModalDate] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/reminders");
      if (res.ok) setItems(await res.json());
      else emitToast("Hatırlatıcılar yüklenemedi.", "error");
    } catch { emitToast("Yükleme hatası.", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // days that have reminders
  const dotDays = useMemo(() => {
    const set = new Set();
    items.filter(r=>!r.archived_at).forEach(r=>{
      const d = parseDate(r.due_at);
      if (d) set.add(startOfDay(d).toDateString());
    });
    return set;
  }, [items]);

  // calendar grid
  const calDays = useMemo(() => {
    const year = viewMonth.getFullYear(), mon = viewMonth.getMonth();
    const first = new Date(year, mon, 1);
    // Monday-first: 0=Mon…6=Sun
    let dow = first.getDay(); // 0=Sun
    dow = (dow + 6) % 7;     // convert to Mon-first
    const days = [];
    for (let i = 0; i < dow; i++) days.push({ date: new Date(year, mon, 1-dow+i), inMonth: false });
    const last = new Date(year, mon+1, 0).getDate();
    for (let d = 1; d <= last; d++) days.push({ date: new Date(year, mon, d), inMonth: true });
    while (days.length % 7 !== 0) days.push({ date: new Date(year, mon+1, days.length - last - dow + 1), inMonth: false });
    return days;
  }, [viewMonth]);

  const selectedItems = useMemo(() => items.filter(r => {
    const d = parseDate(r.due_at);
    return d && isSameDay(d, selected) && !r.archived_at;
  }).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at)), [items, selected]);

  const upcoming = items.filter(r=>!r.archived_at).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at));
  const archived = items.filter(r=>!!r.archived_at);

  const action = async (id, path, method="POST") => {
    try {
      const res = await authFetch(`/api/reminders/${encodeURIComponent(id)}${path}`, { method });
      if (res.ok) load();
      else emitToast("İşlem başarısız.", "error");
    } catch { emitToast("Hata.", "error"); }
  };

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1));

  const isCurrentMonth = viewMonth.getMonth() === today.getMonth() && viewMonth.getFullYear() === today.getFullYear();

  return (
    <div className="premium-scope" style={{ minHeight:"100vh",padding:"24px 16px 80px",maxWidth:1120,margin:"0 auto" }}>
      {modalDate && (
        <CreateModal
          defaultDate={modalDate}
          onSave={() => { setModalDate(null); load(); }}
          onClose={() => setModalDate(null)}
        />
      )}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0,fontSize:28,fontWeight:700,color:GOLD }}>Takvim & Hatırlatıcılar</h1>
        <p style={{ margin:"4px 0 0",fontSize:13,color:"#555" }}>Duruşma ve son günleri takip edin. E-posta ve uygulama içi bildirim.</p>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"minmax(300px,380px) 1fr",gap:20,alignItems:"start" }}>

        {/* ── LEFT: Calendar ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>

          {/* Month card */}
          <div style={{ background:"#0a0a0a",border:"0.5px solid #1e1e1e",borderRadius:16,padding:"20px 20px 16px",userSelect:"none" }}>
            {/* Header */}
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
              <button onClick={prevMonth} style={navBtn}>‹</button>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ color:"#fff",fontWeight:700,fontSize:15 }}>
                  {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </span>
                {!isCurrentMonth && (
                  <button onClick={()=>{setViewMonth(new Date(today.getFullYear(),today.getMonth(),1));setSelected(today);}}
                    style={{ fontSize:10,color:GOLD,background:"rgba(235,172,0,0.1)",border:"0.5px solid rgba(235,172,0,0.3)",borderRadius:6,padding:"2px 8px",cursor:"pointer" }}>
                    Bugün
                  </button>
                )}
              </div>
              <button onClick={nextMonth} style={navBtn}>›</button>
            </div>

            {/* Day labels */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:6 }}>
              {DAYS.map(d=>(
                <div key={d} style={{ textAlign:"center",fontSize:10,color:"#444",fontWeight:600,padding:"0 0 4px",letterSpacing:0.5 }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",rowGap:4 }}>
              {calDays.map(({date,inMonth},i)=>(
                <div key={i} style={{ display:"flex",justifyContent:"center" }}>
                  <CalCell
                    day={date}
                    today={today}
                    selected={selected}
                    hasDot={dotDays.has(startOfDay(date).toDateString())}
                    inMonth={inMonth}
                    onClick={()=>{ if(inMonth){setSelected(startOfDay(date));if(viewMonth.getMonth()!==date.getMonth())setViewMonth(new Date(date.getFullYear(),date.getMonth(),1)); }}}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Add button */}
          <button onClick={()=>setModalDate(selected)}
            style={{ background:GOLD,color:"#000",fontWeight:700,fontSize:13,border:"none",borderRadius:12,padding:"13px 0",cursor:"pointer",letterSpacing:0.3 }}>
            + Yeni Hatırlatıcı Ekle
          </button>

          {/* Mini legend */}
          <div style={{ display:"flex",gap:12,alignItems:"center",padding:"0 4px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:5 }}>
              <div style={{ width:10,height:10,borderRadius:"50%",background:"rgba(235,172,0,0.15)",border:`1.5px solid ${GOLD}` }} />
              <span style={{ fontSize:11,color:"#444" }}>Bugün</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:5 }}>
              <div style={{ width:10,height:10,borderRadius:"50%",background:GOLD }} />
              <span style={{ fontSize:11,color:"#444" }}>Seçili</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:5 }}>
              <div style={{ width:5,height:5,borderRadius:"50%",background:GOLD }} />
              <span style={{ fontSize:11,color:"#444" }}>Hatırlatıcı var</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Day detail + list ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>

          {/* Selected day events */}
          <div style={{ background:"#0a0a0a",border:"0.5px solid #1e1e1e",borderRadius:16,padding:20 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:"#fff" }}>
                  {selected.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"})}
                </div>
                {isSameDay(selected,today) && <div style={{ fontSize:10,color:GOLD,marginTop:2 }}>Bugün</div>}
              </div>
              <button onClick={()=>setModalDate(selected)}
                style={{ background:"rgba(235,172,0,0.1)",border:"0.5px solid rgba(235,172,0,0.3)",color:GOLD,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                + Ekle
              </button>
            </div>

            {loading ? (
              <div style={{ color:"#333",fontSize:13,textAlign:"center",padding:24 }}>Yükleniyor…</div>
            ) : selectedItems.length === 0 ? (
              <div style={{ textAlign:"center",padding:"28px 0" }}>
                <div style={{ fontSize:32,marginBottom:8,opacity:0.3 }}>📅</div>
                <div style={{ color:"#333",fontSize:13 }}>Bu gün için hatırlatıcı yok.</div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {selectedItems.map(r=>(
                  <EventCard key={r.id} r={r}
                    onArchive={()=>action(r.id,"/archive")}
                    onDelete={()=>action(r.id,"","DELETE")}
                  />
                ))}
              </div>
            )}
          </div>

          {/* All upcoming */}
          <div style={{ background:"#0a0a0a",border:"0.5px solid #1e1e1e",borderRadius:16,padding:20 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
              {[{label:"Tümü",v:false},{label:"Arşiv",v:true}].map(({label,v})=>(
                <button key={label} onClick={()=>setShowArchived(v)}
                  style={{ fontSize:12,fontWeight:showArchived===v?700:400,color:showArchived===v?GOLD:"#444",background:showArchived===v?"rgba(235,172,0,0.1)":"transparent",border:`0.5px solid ${showArchived===v?"rgba(235,172,0,0.3)":"transparent"}`,borderRadius:8,padding:"4px 12px",cursor:"pointer",transition:"all 130ms" }}>
                  {label}
                </button>
              ))}
            </div>
            {(!showArchived ? upcoming : archived).length === 0 ? (
              <div style={{ color:"#333",fontSize:13,padding:"12px 0" }}>Kayıt yok.</div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:340,overflowY:"auto" }}>
                {(!showArchived ? upcoming : archived).map(r=>(
                  <EventCard key={r.id} r={r} compact
                    onArchive={()=>action(r.id,r.archived_at?"/unarchive":"/archive")}
                    onDelete={()=>action(r.id,"","DELETE")}
                    onSelect={()=>{const d=parseDate(r.due_at);if(d){setSelected(startOfDay(d));setViewMonth(new Date(d.getFullYear(),d.getMonth(),1));}}}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Event card ───────────────────────────────────────────────────────────────
function EventCard({ r, onArchive, onDelete, onSelect, compact }) {
  const [open, setOpen] = useState(false);
  const dueDate = parseDate(r.due_at);
  const isPast  = dueDate && dueDate < new Date();

  return (
    <div style={{ background:"#111",border:`0.5px solid ${isPast?"#2a1a1a":"#1e1e1e"}`,borderLeft:`3px solid ${isPast?"#8b0000":GOLD}`,borderRadius:12,padding:compact?"10px 14px":"14px 16px",cursor:onSelect?"pointer":"default",transition:"border-color 130ms" }}
      onClick={onSelect}>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8 }}>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:compact?12:13,fontWeight:600,color:isPast?"#666":"#d4d4d4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
            {r.title}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap" }}>
            <span style={{ fontSize:11,color:isPast?"#444":GOLD,fontVariantNumeric:"tabular-nums" }}>
              {fmtDateFull(r.due_at)}
            </span>
            {isPast && <span style={{ fontSize:10,color:"#8b0000",background:"rgba(139,0,0,0.15)",padding:"1px 6px",borderRadius:4 }}>Geçti</span>}
          </div>
          {r.court && <div style={{ fontSize:11,color:"#444",marginTop:3 }}>{r.court}{r.case_number?` · ${r.case_number}`:""}</div>}
        </div>
        <div style={{ display:"flex",gap:6,flexShrink:0 }}>
          {!compact && (
            <button onClick={e=>{e.stopPropagation();setOpen(v=>!v);}} style={{ fontSize:11,color:"#444",background:"none",border:"none",cursor:"pointer",padding:"2px 4px" }}>
              {open?"▲":"▼"}
            </button>
          )}
          <button onClick={e=>{e.stopPropagation();onArchive();}} style={{ fontSize:10,color:"#555",background:"none",border:"none",cursor:"pointer",padding:"2px 6px" }}>
            {r.archived_at?"Geri Al":"Arşiv"}
          </button>
          <button onClick={e=>{e.stopPropagation();onDelete();}} style={{ fontSize:10,color:"#8b2222",background:"none",border:"none",cursor:"pointer",padding:"2px 6px" }}>Sil</button>
        </div>
      </div>
      {!compact && open && r.details && (
        <div style={{ marginTop:10,paddingTop:10,borderTop:"0.5px solid #1e1e1e",fontSize:12,color:"#666",lineHeight:1.7,whiteSpace:"pre-wrap" }}>
          {r.details}
        </div>
      )}
    </div>
  );
}

const navBtn = { background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer",padding:"0 6px",lineHeight:1,transition:"color 130ms" };
