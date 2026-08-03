import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Compass, Users, Plane, Ticket, BarChart3, Plus, Trash2, Pencil,
  Search, Printer, X, IndianRupee, Phone, Mail, MapPin,
  ChevronRight, AlertCircle, CheckCircle2, Clock, Loader2, Menu, LogOut,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

/* ---------------------------------- tokens --------------------------------- */
const C = {
  bgDeep: "#0A0F1D",
  bgPanel: "#131A2C",
  bgPanelAlt: "#182238",
  bgInset: "#0E1526",
  border: "#243252",
  borderSoft: "#1B2540",
  gold: "#E8B85C",
  goldDim: "#8A6E3A",
  goldSoft: "rgba(232,184,92,0.13)",
  teal: "#4FD1C5",
  tealSoft: "rgba(79,209,197,0.13)",
  text: "#E9EDF6",
  textMuted: "#8B93A9",
  textFaint: "#5B6480",
  success: "#34D399",
  successSoft: "rgba(52,211,153,0.14)",
  warning: "#FBBF24",
  warningSoft: "rgba(251,191,36,0.14)",
  danger: "#F87171",
  dangerSoft: "rgba(248,113,113,0.14)",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

const GLOBAL_CSS = `
${FONTS}
* { box-sizing: border-box; }
.ltt-root { font-family: 'Inter', sans-serif; color: ${C.text}; }
.ltt-display { font-family: 'Space Grotesk', sans-serif; }
.ltt-mono { font-family: 'JetBrains Mono', monospace; }
.ltt-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.ltt-scroll::-webkit-scrollbar-track { background: transparent; }
.ltt-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 8px; }
.ltt-focus:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
.ltt-route-line { transition: width 1.3s cubic-bezier(0.16,1,0.3,1); }
@media (prefers-reduced-motion: reduce) {
  .ltt-route-line { transition: none !important; }
}
.ltt-ticket-notch {
  background:
    radial-gradient(circle at 0 50%, transparent 10px, ${C.bgPanel} 10.5px) top left / 100% 50% no-repeat,
    radial-gradient(circle at 100% 50%, transparent 10px, ${C.bgPanel} 10.5px) bottom left / 100% 50% no-repeat;
}
@media print {
  body * { visibility: hidden; }
  .ltt-print-area, .ltt-print-area * { visibility: visible; }
  .ltt-print-area { position: absolute; top: 0; left: 0; width: 100%; }
  .ltt-no-print { display: none !important; }
}
`;

/* --------------------------------- helpers --------------------------------- */
const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const nextInvoiceNo = (invoices) => {
  const year = new Date().getFullYear();
  const count = invoices.filter((i) => (i.invoiceNo || "").includes(`LTT-${year}`)).length + 1;
  return `LTT-${year}-${String(count).padStart(4, "0")}`;
};

const STATUS_META = {
  Paid: { color: C.success, soft: C.successSoft, icon: CheckCircle2 },
  Pending: { color: C.warning, soft: C.warningSoft, icon: Clock },
  Overdue: { color: C.danger, soft: C.dangerSoft, icon: AlertCircle },
};

/* ------------------------------- Firestore hook ------------------------------ */
// Keeps a live array in sync with a Firestore collection scoped to the signed-in user,
// and lets components call setItems(fullNextArray) just like plain useState.
function useCollectionState(name, uid) {
  const [items, setItemsState] = useState([]);
  const latest = useRef([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, name), where("ownerId", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        latest.current = arr;
        setItemsState(arr);
      },
      (err) => console.error(`Firestore listen failed (${name})`, err)
    );
    return unsub;
  }, [name, uid]);

  const setItems = useCallback(
    async (next) => {
      const prev = latest.current;
      const prevIds = new Set(prev.map((p) => p.id));
      const nextIds = new Set(next.map((n) => n.id));
      const writes = [];
      for (const item of next) {
        const old = prev.find((p) => p.id === item.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(item)) {
          writes.push(setDoc(doc(db, name, item.id), { ...item, ownerId: uid }));
        }
      }
      for (const id of prevIds) {
        if (!nextIds.has(id)) writes.push(deleteDoc(doc(db, name, id)));
      }
      try {
        await Promise.all(writes);
      } catch (e) {
        console.error(`Firestore write failed (${name})`, e);
      }
    },
    [name, uid]
  );

  return [items, setItems];
}

/* --------------------------------- primitives -------------------------------- */
function LotusMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 30C20 30 8 24 8 14C8 14 16 16 20 24C24 16 32 14 32 14C32 24 20 30 20 30Z" fill={C.gold} opacity="0.9" />
      <path d="M20 30C20 30 12 22 14 12C14 12 20 15 20 24C20 15 26 12 26 12C28 22 20 30 20 30Z" fill={C.gold} />
      <circle cx="20" cy="29" r="2.4" fill={C.bgDeep} />
    </svg>
  );
}

function Badge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Pending;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ltt-mono"
      style={{ background: meta.soft, color: meta.color }}
    >
      <Icon size={12} strokeWidth={2.5} />
      {status}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span style={{ color: C.textMuted }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: C.bgInset,
  border: `1px solid ${C.border}`,
  color: C.text,
};

function TextInput(props) {
  return (
    <input
      {...props}
      className={`ltt-focus rounded-lg px-3 py-2 text-sm w-full ${props.className || ""}`}
      style={{ ...inputStyle, ...(props.style || {}) }}
    />
  );
}
function Select(props) {
  return (
    <select {...props} className="ltt-focus rounded-lg px-3 py-2 text-sm w-full" style={inputStyle}>
      {props.children}
    </select>
  );
}

function Button({ variant = "primary", className = "", children, ...rest }) {
  const styles = {
    primary: { background: C.gold, color: "#1A1206", border: "1px solid transparent" },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
    danger: { background: C.dangerSoft, color: C.danger, border: "1px solid transparent" },
    teal: { background: C.tealSoft, color: C.teal, border: "1px solid transparent" },
  };
  return (
    <button
      {...rest}
      className={`ltt-focus inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-transform active:scale-95 ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto ltt-scroll"
      style={{ background: "rgba(6,9,18,0.72)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl my-6`} style={{ background: C.bgPanel, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
          <h3 className="ltt-display text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="ltt-focus p-1 rounded-md" style={{ color: C.textMuted }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="p-3 rounded-full" style={{ background: C.goldSoft }}>
        <Icon size={22} color={C.gold} />
      </div>
      <p className="ltt-display font-medium">{title}</p>
      <p className="text-sm max-w-xs" style={{ color: C.textMuted }}>{hint}</p>
      {actionLabel && (
        <Button onClick={onAction} className="mt-1">
          <Plus size={15} /> {actionLabel}
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ route stat strip ----------------------------- */
function RouteStats({ stats }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 80);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="relative rounded-2xl p-5 md:p-7 overflow-hidden"
      style={{ background: `radial-gradient(120% 140% at 0% 0%, ${C.bgPanelAlt} 0%, ${C.bgPanel} 55%)`, border: `1px solid ${C.borderSoft}` }}
    >
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <p className="text-xs ltt-mono tracking-widest uppercase" style={{ color: C.textFaint }}>Business route · FY {new Date().getFullYear()}</p>
          <h2 className="ltt-display text-lg md:text-xl font-semibold mt-1">Where the business stands today</h2>
        </div>
      </div>
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-4">
        <div
          className="absolute top-[10px] left-[6%] right-[6%] h-px hidden lg:block ltt-route-line"
          style={{ width: drawn ? "88%" : "0%", backgroundImage: `repeating-linear-gradient(90deg, ${C.gold} 0 6px, transparent 6px 12px)` }}
        />
        {stats.map((s) => (
          <div key={s.label} className="relative flex flex-col gap-2">
            <div className="hidden lg:flex items-center justify-center w-5 h-5 rounded-full absolute -top-[2px] left-0" style={{ background: C.gold }} />
            <div className="flex items-center gap-2" style={{ color: C.textMuted }}>
              <s.icon size={15} />
              <span className="text-xs uppercase tracking-wide ltt-mono">{s.label}</span>
            </div>
            <p className="ltt-display text-2xl md:text-3xl font-semibold" style={{ color: s.color || C.text }}>{s.value}</p>
            {s.sub && <p className="text-xs" style={{ color: C.textFaint }}>{s.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Dashboard --------------------------------- */
function Dashboard({ customers, trips, invoices, goTo }) {
  const totals = useMemo(() => {
    const billed = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const collected = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + (i.total || 0), 0);
    const pending = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + (i.total || 0), 0);
    return { billed, collected, pending };
  }, [invoices]);

  const stats = [
    { label: "Total billed", value: inr(totals.billed), icon: IndianRupee, color: C.gold },
    { label: "Collected", value: inr(totals.collected), icon: CheckCircle2, color: C.success },
    { label: "Outstanding", value: inr(totals.pending), icon: Clock, color: C.warning, sub: `${invoices.filter((i) => i.status !== "Paid").length} invoice(s)` },
    { label: "Trips booked", value: trips.length, icon: Plane, color: C.teal, sub: `${customers.length} travellers on file` },
  ];

  const recent = [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  return (
    <div className="flex flex-col gap-5">
      <RouteStats stats={stats} />
      <div className="rounded-2xl" style={{ background: C.bgPanel, border: `1px solid ${C.borderSoft}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
          <h3 className="ltt-display font-semibold">Recent invoices</h3>
          <button onClick={() => goTo("invoices")} className="ltt-focus text-sm flex items-center gap-1" style={{ color: C.teal }}>
            View all <ChevronRight size={14} />
          </button>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={Ticket} title="No invoices yet" hint="Once you bill a customer, it'll show up here." actionLabel="Create invoice" onAction={() => goTo("invoices")} />
        ) : (
          <div className="divide-y" style={{ borderColor: C.borderSoft }}>
            {recent.map((inv) => {
              const cust = customers.find((c) => c.id === inv.customerId);
              return (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3 flex-wrap gap-2">
                  <div>
                    <p className="ltt-mono text-sm">{inv.invoiceNo}</p>
                    <p className="text-xs" style={{ color: C.textMuted }}>{cust ? cust.name : "Walk-in"} · {fmtDate(inv.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="ltt-mono text-sm">{inr(inv.total)}</span>
                    <Badge status={inv.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Customers ---------------------------------- */
function CustomerForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { name: "", phone: "", email: "", address: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.name.trim()) return;
        onSave({ ...f, id: f.id || uid() });
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Full name">
        <TextInput value={f.name} onChange={set("name")} placeholder="e.g. Ramesh Subramaniam" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><TextInput value={f.phone} onChange={set("phone")} placeholder="+91 90000 00000" /></Field>
        <Field label="Email"><TextInput value={f.email} onChange={set("email")} placeholder="name@email.com" type="email" /></Field>
      </div>
      <Field label="Address">
        <textarea value={f.address} onChange={set("address")} rows={2} className="ltt-focus rounded-lg px-3 py-2 text-sm w-full" style={inputStyle} placeholder="City, state" />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save customer</Button>
      </div>
    </form>
  );
}

function Customers({ customers, setCustomers, trips, invoices }) {
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || "").includes(q));

  const upsert = (c) => {
    const exists = customers.some((x) => x.id === c.id);
    const next = exists ? customers.map((x) => (x.id === c.id ? c : x)) : [...customers, c];
    setCustomers(next);
    setModal(null);
  };
  const remove = (id) => { setCustomers(customers.filter((c) => c.id !== id)); setConfirmDel(null); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textFaint }} />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search travellers…" style={{ paddingLeft: 32 }} />
        </div>
        <Button onClick={() => setModal({})}><Plus size={15} /> Add customer</Button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: C.bgPanel, border: `1px solid ${C.borderSoft}` }}>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title={q ? "No matches" : "No travellers yet"} hint={q ? "Try a different search." : "Add your first customer to start billing them."} actionLabel={!q && "Add customer"} onAction={() => setModal({})} />
        ) : (
          <div className="divide-y ltt-scroll overflow-x-auto" style={{ borderColor: C.borderSoft }}>
            {filtered.map((c) => {
              const tripCount = trips.filter((t) => t.customerId === c.id).length;
              const spend = invoices.filter((i) => i.customerId === c.id).reduce((s, i) => s + (i.total || 0), 0);
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3.5 gap-4 flex-wrap">
                  <div className="min-w-[160px]">
                    <p className="font-medium">{c.name}</p>
                    <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: C.textMuted }}>
                      {c.phone && <span className="flex items-center gap-1"><Phone size={11} />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail size={11} />{c.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-sm">
                    <div className="text-right"><p className="ltt-mono">{tripCount}</p><p className="text-xs" style={{ color: C.textFaint }}>trips</p></div>
                    <div className="text-right"><p className="ltt-mono">{inr(spend)}</p><p className="text-xs" style={{ color: C.textFaint }}>billed</p></div>
                    <button onClick={() => setModal(c)} className="ltt-focus p-1.5 rounded-md" style={{ color: C.teal }}><Pencil size={15} /></button>
                    <button onClick={() => setConfirmDel(c)} className="ltt-focus p-1.5 rounded-md" style={{ color: C.danger }}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal !== null && (
        <Modal title={modal.id ? "Edit customer" : "Add customer"} onClose={() => setModal(null)}>
          <CustomerForm initial={modal.id ? modal : null} onSave={upsert} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {confirmDel && (
        <Modal title="Remove customer?" onClose={() => setConfirmDel(null)}>
          <p className="text-sm mb-4" style={{ color: C.textMuted }}>
            This removes <b style={{ color: C.text }}>{confirmDel.name}</b> from your records. Their past invoices and trips stay, but won't link to a name anymore.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => remove(confirmDel.id)}>Remove</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ----------------------------------- Trips ------------------------------------ */
const PACKAGES = ["Budget", "Standard", "Premium", "Custom"];

function TripForm({ initial, customers, onSave, onCancel }) {
  const [f, setF] = useState(
    initial || { customerId: customers[0]?.id || "", destination: "", startDate: "", endDate: "", pax: 1, package: "Standard", cost: "", notes: "" }
  );
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.destination.trim() || !f.customerId) return;
        onSave({ ...f, id: f.id || uid(), pax: Number(f.pax) || 1, cost: Number(f.cost) || 0 });
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Traveller">
        <Select value={f.customerId} onChange={set("customerId")} required>
          <option value="" disabled>Choose a customer</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Destination"><TextInput value={f.destination} onChange={set("destination")} placeholder="e.g. Kerala Backwaters" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date"><TextInput type="date" value={f.startDate} onChange={set("startDate")} /></Field>
        <Field label="End date"><TextInput type="date" value={f.endDate} onChange={set("endDate")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Travellers (pax)"><TextInput type="number" min="1" value={f.pax} onChange={set("pax")} /></Field>
        <Field label="Package">
          <Select value={f.package} onChange={set("package")}>
            {PACKAGES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Package cost (₹)"><TextInput type="number" min="0" value={f.cost} onChange={set("cost")} placeholder="0" /></Field>
      <Field label="Notes">
        <textarea value={f.notes} onChange={set("notes")} rows={2} className="ltt-focus rounded-lg px-3 py-2 text-sm w-full" style={inputStyle} placeholder="Hotel, transport, special requests…" />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save trip</Button>
      </div>
    </form>
  );
}

function Trips({ trips, setTrips, customers }) {
  const [modal, setModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const upsert = (t) => {
    const exists = trips.some((x) => x.id === t.id);
    setTrips(exists ? trips.map((x) => (x.id === t.id ? t : x)) : [...trips, t]);
    setModal(null);
  };
  const remove = (id) => { setTrips(trips.filter((t) => t.id !== id)); setConfirmDel(null); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setModal({})} disabled={customers.length === 0}><Plus size={15} /> Add trip</Button>
      </div>
      {customers.length === 0 && <p className="text-xs px-1" style={{ color: C.textFaint }}>Add a customer first before booking a trip.</p>}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.bgPanel, border: `1px solid ${C.borderSoft}` }}>
        {trips.length === 0 ? (
          <EmptyState icon={Plane} title="No trips booked" hint="Every trip you log here can be turned into an invoice in one click." actionLabel={customers.length ? "Add trip" : null} onAction={() => setModal({})} />
        ) : (
          <div className="divide-y" style={{ borderColor: C.borderSoft }}>
            {trips.map((t) => {
              const cust = customers.find((c) => c.id === t.customerId);
              return (
                <div key={t.id} className="flex items-center justify-between px-5 py-3.5 gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="p-2 rounded-lg" style={{ background: C.tealSoft }}><MapPin size={15} color={C.teal} /></div>
                    <div>
                      <p className="font-medium">{t.destination}</p>
                      <p className="text-xs" style={{ color: C.textMuted }}>{cust?.name || "Unassigned"} · {t.pax} pax · {t.package}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-sm">
                    <p className="ltt-mono text-xs" style={{ color: C.textMuted }}>{fmtDate(t.startDate)} → {fmtDate(t.endDate)}</p>
                    <p className="ltt-mono">{inr(t.cost)}</p>
                    <button onClick={() => setModal(t)} className="ltt-focus p-1.5 rounded-md" style={{ color: C.teal }}><Pencil size={15} /></button>
                    <button onClick={() => setConfirmDel(t)} className="ltt-focus p-1.5 rounded-md" style={{ color: C.danger }}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {modal !== null && (
        <Modal title={modal.id ? "Edit trip" : "Add trip"} onClose={() => setModal(null)}>
          <TripForm initial={modal.id ? modal : null} customers={customers} onSave={upsert} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {confirmDel && (
        <Modal title="Delete trip?" onClose={() => setConfirmDel(null)}>
          <p className="text-sm mb-4" style={{ color: C.textMuted }}>This removes <b style={{ color: C.text }}>{confirmDel.destination}</b> from trip records.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => remove(confirmDel.id)}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------- Invoices ----------------------------------- */
function InvoiceForm({ initial, customers, trips, invoices, onSave, onCancel }) {
  const [customerId, setCustomerId] = useState(initial?.customerId || customers[0]?.id || "");
  const [tripId, setTripId] = useState(initial?.tripId || "");
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  const [status, setStatus] = useState(initial?.status || "Pending");
  const [taxPercent, setTaxPercent] = useState(initial?.taxPercent ?? 5);
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [items, setItems] = useState(initial?.items || [{ id: uid(), description: "", qty: 1, rate: 0 }]);

  const applyTrip = (id) => {
    setTripId(id);
    const trip = trips.find((t) => t.id === id);
    if (trip) setItems([{ id: uid(), description: `${trip.destination} — ${trip.package} package (${trip.pax} pax)`, qty: 1, rate: trip.cost }]);
  };

  const updateItem = (id, patch) => setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addItem = () => setItems([...items, { id: uid(), description: "", qty: 1, rate: 0 }]);
  const removeItem = (id) => setItems(items.length > 1 ? items.filter((it) => it.id !== id) : items);

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const taxAmt = subtotal * ((Number(taxPercent) || 0) / 100);
  const total = Math.max(subtotal + taxAmt - (Number(discount) || 0), 0);
  const custTrips = trips.filter((t) => t.customerId === customerId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!customerId) return;
        onSave({
          id: initial?.id || uid(),
          invoiceNo: initial?.invoiceNo || nextInvoiceNo(invoices),
          customerId, tripId, date, dueDate, status,
          taxPercent: Number(taxPercent) || 0,
          discount: Number(discount) || 0,
          items: items.filter((it) => it.description.trim()),
          subtotal, taxAmt, total,
        });
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Customer">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="" disabled>Choose customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Link a trip (optional)">
          <Select value={tripId} onChange={(e) => applyTrip(e.target.value)}>
            <option value="">No linked trip</option>
            {custTrips.map((t) => <option key={t.id} value={t.id}>{t.destination}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Invoice date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Due date"><TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: C.textMuted }}>Line items</span>
          <button type="button" onClick={addItem} className="ltt-focus text-xs flex items-center gap-1" style={{ color: C.teal }}><Plus size={13} /> Add item</button>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div key={it.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 60px 90px 28px" }}>
              <TextInput placeholder="Description" value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} />
              <TextInput type="number" min="0" placeholder="Qty" value={it.qty} onChange={(e) => updateItem(it.id, { qty: e.target.value })} />
              <TextInput type="number" min="0" placeholder="Rate ₹" value={it.rate} onChange={(e) => updateItem(it.id, { rate: e.target.value })} />
              <button type="button" onClick={() => removeItem(it.id)} className="ltt-focus p-1" style={{ color: C.textFaint }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tax (%)"><TextInput type="number" min="0" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} /></Field>
        <Field label="Discount (₹)"><TextInput type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
      </div>
      <div className="rounded-xl p-4 flex flex-col gap-1.5 text-sm" style={{ background: C.bgInset, border: `1px solid ${C.borderSoft}` }}>
        <div className="flex justify-between" style={{ color: C.textMuted }}><span>Subtotal</span><span className="ltt-mono">{inr(subtotal)}</span></div>
        <div className="flex justify-between" style={{ color: C.textMuted }}><span>Tax</span><span className="ltt-mono">{inr(taxAmt)}</span></div>
        <div className="flex justify-between" style={{ color: C.textMuted }}><span>Discount</span><span className="ltt-mono">−{inr(discount)}</span></div>
        <div className="flex justify-between font-semibold pt-1.5 mt-1" style={{ borderTop: `1px solid ${C.borderSoft}`, color: C.gold }}><span>Total</span><span className="ltt-mono">{inr(total)}</span></div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save invoice</Button>
      </div>
    </form>
  );
}

function InvoiceTicket({ invoice, customer, onClose }) {
  return (
    <Modal title="" onClose={onClose} wide>
      <div className="ltt-no-print flex justify-end mb-3 -mt-2">
        <Button variant="teal" onClick={() => window.print()}><Printer size={14} /> Print / Save PDF</Button>
      </div>
      <div className="ltt-print-area rounded-2xl overflow-hidden ltt-ticket-notch" style={{ background: C.bgPanel, border: `1px dashed ${C.border}` }}>
        <div className="p-6 flex items-center justify-between flex-wrap gap-3" style={{ background: `linear-gradient(120deg, ${C.goldSoft}, transparent)` }}>
          <div className="flex items-center gap-2">
            <LotusMark size={30} />
            <div>
              <p className="ltt-display font-semibold leading-tight">Lakshmi Tours and Travels</p>
              <p className="text-xs" style={{ color: C.textMuted }}>Journeys, billed beautifully</p>
            </div>
          </div>
          <div className="text-right">
            <p className="ltt-mono text-sm">{invoice.invoiceNo}</p>
            <Badge status={invoice.status} />
          </div>
        </div>
        <div className="px-6 py-4 flex items-center justify-between border-y border-dashed" style={{ borderColor: C.border }}>
          <div>
            <p className="text-xs uppercase tracking-widest ltt-mono" style={{ color: C.textFaint }}>Billed to</p>
            <p className="font-medium mt-0.5">{customer?.name || "Walk-in customer"}</p>
            <p className="text-xs" style={{ color: C.textMuted }}>{customer?.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest ltt-mono" style={{ color: C.textFaint }}>Dates</p>
            <p className="text-sm mt-0.5">Issued {fmtDate(invoice.date)}</p>
            <p className="text-xs" style={{ color: C.textMuted }}>Due {fmtDate(invoice.dueDate)}</p>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="flex text-xs uppercase tracking-wide pb-2" style={{ color: C.textFaint }}>
            <span className="flex-1">Description</span><span className="w-14 text-right">Qty</span><span className="w-24 text-right">Rate</span><span className="w-28 text-right">Amount</span>
          </div>
          {invoice.items.map((it) => (
            <div key={it.id} className="flex text-sm py-1.5" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
              <span className="flex-1">{it.description}</span>
              <span className="w-14 text-right ltt-mono">{it.qty}</span>
              <span className="w-24 text-right ltt-mono">{inr(it.rate)}</span>
              <span className="w-28 text-right ltt-mono">{inr(it.qty * it.rate)}</span>
            </div>
          ))}
          <div className="flex flex-col gap-1 items-end mt-3 text-sm">
            <div className="flex gap-8" style={{ color: C.textMuted }}><span>Subtotal</span><span className="ltt-mono w-24 text-right">{inr(invoice.subtotal)}</span></div>
            <div className="flex gap-8" style={{ color: C.textMuted }}><span>Tax ({invoice.taxPercent}%)</span><span className="ltt-mono w-24 text-right">{inr(invoice.taxAmt)}</span></div>
            <div className="flex gap-8" style={{ color: C.textMuted }}><span>Discount</span><span className="ltt-mono w-24 text-right">−{inr(invoice.discount)}</span></div>
            <div className="flex gap-8 font-semibold text-base pt-1" style={{ color: C.gold }}><span>Total</span><span className="ltt-mono w-24 text-right">{inr(invoice.total)}</span></div>
          </div>
        </div>
        <div className="px-6 pb-6 text-xs text-center" style={{ color: C.textFaint }}>Thank you for travelling with Lakshmi Tours and Travels ✦</div>
      </div>
    </Modal>
  );
}

function Invoices({ invoices, setInvoices, customers, trips }) {
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [filter, setFilter] = useState("All");

  const upsert = (inv) => {
    const exists = invoices.some((x) => x.id === inv.id);
    setInvoices(exists ? invoices.map((x) => (x.id === inv.id ? inv : x)) : [...invoices, inv]);
    setModal(null);
  };
  const remove = (id) => { setInvoices(invoices.filter((i) => i.id !== id)); setConfirmDel(null); };

  const shown = invoices.filter((i) => filter === "All" || i.status === filter).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {["All", "Paid", "Pending", "Overdue"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="ltt-focus px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: filter === s ? C.gold : C.bgPanelAlt, color: filter === s ? "#1A1206" : C.textMuted, border: `1px solid ${filter === s ? "transparent" : C.borderSoft}` }}
            >
              {s}
            </button>
          ))}
        </div>
        <Button onClick={() => setModal({})} disabled={customers.length === 0}><Plus size={15} /> New invoice</Button>
      </div>
      {customers.length === 0 && <p className="text-xs px-1" style={{ color: C.textFaint }}>Add a customer first before creating an invoice.</p>}

      <div className="rounded-2xl overflow-hidden" style={{ background: C.bgPanel, border: `1px solid ${C.borderSoft}` }}>
        {shown.length === 0 ? (
          <EmptyState icon={Ticket} title="No invoices here" hint="Create one to start billing a traveller." actionLabel={customers.length ? "New invoice" : null} onAction={() => setModal({})} />
        ) : (
          <div className="divide-y" style={{ borderColor: C.borderSoft }}>
            {shown.map((inv) => {
              const cust = customers.find((c) => c.id === inv.customerId);
              return (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3.5 gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div className="p-2 rounded-lg" style={{ background: C.goldSoft }}><Ticket size={15} color={C.gold} /></div>
                    <div>
                      <p className="ltt-mono text-sm">{inv.invoiceNo}</p>
                      <p className="text-xs" style={{ color: C.textMuted }}>{cust?.name || "Walk-in"} · {fmtDate(inv.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="ltt-mono text-sm">{inr(inv.total)}</span>
                    <Badge status={inv.status} />
                    <button onClick={() => setViewing(inv)} className="ltt-focus p-1.5 rounded-md" style={{ color: C.teal }}><Printer size={15} /></button>
                    <button onClick={() => setModal(inv)} className="ltt-focus p-1.5 rounded-md" style={{ color: C.textMuted }}><Pencil size={15} /></button>
                    <button onClick={() => setConfirmDel(inv)} className="ltt-focus p-1.5 rounded-md" style={{ color: C.danger }}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal !== null && (
        <Modal title={modal.id ? "Edit invoice" : "New invoice"} onClose={() => setModal(null)} wide>
          <InvoiceForm initial={modal.id ? modal : null} customers={customers} trips={trips} invoices={invoices} onSave={upsert} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {viewing && <InvoiceTicket invoice={viewing} customer={customers.find((c) => c.id === viewing.customerId)} onClose={() => setViewing(null)} />}
      {confirmDel && (
        <Modal title="Delete invoice?" onClose={() => setConfirmDel(null)}>
          <p className="text-sm mb-4" style={{ color: C.textMuted }}>This permanently removes <b style={{ color: C.text }}>{confirmDel.invoiceNo}</b>.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => remove(confirmDel.id)}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------- Reports ------------------------------------ */
function Reports({ invoices, customers }) {
  const monthly = useMemo(() => {
    const map = new Map();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      map.set(key, { month: key, billed: 0, collected: 0 });
    }
    invoices.forEach((inv) => {
      const d = new Date(inv.date);
      if (isNaN(d)) return;
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      if (map.has(key)) {
        const row = map.get(key);
        row.billed += inv.total || 0;
        if (inv.status === "Paid") row.collected += inv.total || 0;
      }
    });
    return Array.from(map.values());
  }, [invoices]);

  const statusPie = useMemo(() => {
    return Object.keys(STATUS_META)
      .map((s) => ({ name: s, value: invoices.filter((i) => i.status === s).length, color: STATUS_META[s].color }))
      .filter((d) => d.value > 0);
  }, [invoices]);

  const topCustomers = useMemo(() => {
    const spend = new Map();
    invoices.forEach((inv) => spend.set(inv.customerId, (spend.get(inv.customerId) || 0) + (inv.total || 0)));
    return [...spend.entries()]
      .map(([id, total]) => ({ customer: customers.find((c) => c.id === id), total }))
      .filter((r) => r.customer)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices, customers]);

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl" style={{ background: C.bgPanel, border: `1px solid ${C.borderSoft}` }}>
        <EmptyState icon={BarChart3} title="Nothing to report yet" hint="Reports fill in automatically once you start invoicing customers." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: C.bgPanel, border: `1px solid ${C.borderSoft}` }}>
          <p className="ltt-display font-semibold mb-1">Billed vs collected</p>
          <p className="text-xs mb-4" style={{ color: C.textFaint }}>Last 6 months</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: C.textFaint, fontSize: 12 }} axisLine={{ stroke: C.borderSoft }} tickLine={false} />
                <YAxis tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => inr(v)} />
                <Tooltip contentStyle={{ background: C.bgInset, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }} formatter={(v) => inr(v)} labelStyle={{ color: C.text }} />
                <Bar dataKey="billed" fill={C.goldDim} radius={[4, 4, 0, 0]} name="Billed" />
                <Bar dataKey="collected" fill={C.gold} radius={[4, 4, 0, 0]} name="Collected" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: C.bgPanel, border: `1px solid ${C.borderSoft}` }}>
          <p className="ltt-display font-semibold mb-1">Payment status</p>
          <p className="text-xs mb-2" style={{ color: C.textFaint }}>By invoice count</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                  {statusPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.bgInset, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {statusPie.map((d) => (
              <span key={d.name} className="text-xs flex items-center gap-1.5" style={{ color: C.textMuted }}>
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl" style={{ background: C.bgPanel, border: `1px solid ${C.borderSoft}` }}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
          <p className="ltt-display font-semibold">Top travellers by spend</p>
        </div>
        <div className="divide-y" style={{ borderColor: C.borderSoft }}>
          {topCustomers.map((r, i) => (
            <div key={r.customer.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="ltt-mono text-xs w-5" style={{ color: C.textFaint }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm font-medium">{r.customer.name}</span>
              </div>
              <span className="ltt-mono text-sm" style={{ color: C.gold }}>{inr(r.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- Login ------------------------------------- */
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("That email or password doesn't match. Please check and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ltt-root min-h-screen w-full flex items-center justify-center p-4" style={{ background: C.bgDeep }}>
      <style>{GLOBAL_CSS}</style>
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl p-6" style={{ background: C.bgPanel, border: `1px solid ${C.borderSoft}` }}>
        <div className="flex flex-col items-center gap-2 mb-6">
          <LotusMark size={36} />
          <p className="ltt-display font-semibold text-lg">Lakshmi Tours and Travels</p>
          <p className="text-xs" style={{ color: C.textFaint }}>Billing sign in</p>
        </div>
        <div className="flex flex-col gap-3">
          <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Password"><TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: C.danger }}>{error}</p>}
        <Button type="submit" className="w-full mt-5" disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

/* ----------------------------------- Shell ------------------------------------ */
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: Compass },
  { key: "customers", label: "Customers", icon: Users },
  { key: "trips", label: "Trips", icon: Plane },
  { key: "invoices", label: "Invoices", icon: Ticket },
  { key: "reports", label: "Reports", icon: BarChart3 },
];

function BillingApp({ uid: userId }) {
  const [tab, setTab] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [customers, setCustomers] = useCollectionState("customers", userId);
  const [trips, setTrips] = useCollectionState("trips", userId);
  const [invoices, setInvoices] = useCollectionState("invoices", userId);

  const Page = { dashboard: Dashboard, customers: Customers, trips: Trips, invoices: Invoices, reports: Reports }[tab];

  return (
    <div className="ltt-root min-h-screen w-full flex" style={{ background: C.bgDeep }}>
      <style>{GLOBAL_CSS}</style>
      <aside
        className={`fixed md:static z-40 top-0 left-0 h-full w-64 flex-col p-5 gap-1 ${mobileNav ? "flex" : "hidden"} md:flex`}
        style={{ background: C.bgPanel, borderRight: `1px solid ${C.borderSoft}` }}
      >
        <div className="flex items-center gap-2.5 mb-8 px-1">
          <LotusMark />
          <div>
            <p className="ltt-display font-semibold leading-tight text-[15px]">Lakshmi Tours</p>
            <p className="text-[11px] tracking-wide" style={{ color: C.textFaint }}>& Travels · Billing</p>
          </div>
        </div>
        {NAV.map((n) => {
          const active = tab === n.key;
          return (
            <button
              key={n.key}
              onClick={() => { setTab(n.key); setMobileNav(false); }}
              className="ltt-focus flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
              style={{ background: active ? C.goldSoft : "transparent", color: active ? C.gold : C.textMuted, borderLeft: active ? `2px solid ${C.gold}` : "2px solid transparent" }}
            >
              <n.icon size={16} /> {n.label}
            </button>
          );
        })}
        <button
          onClick={() => signOut(auth)}
          className="ltt-focus flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mt-auto"
          style={{ color: C.textMuted, borderTop: `1px solid ${C.borderSoft}` }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>
      {mobileNav && <div className="fixed inset-0 z-30 md:hidden" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileNav(false)} />}
      <main className="flex-1 min-w-0">
        <header className="flex items-center justify-between px-5 md:px-8 py-4 flex-wrap gap-2" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden ltt-focus p-1.5 rounded-md" style={{ color: C.text }} onClick={() => setMobileNav(true)}><Menu size={18} /></button>
            <h1 className="ltt-display text-lg font-semibold">{NAV.find((n) => n.key === tab)?.label}</h1>
          </div>
        </header>
        <div className="p-5 md:p-8 max-w-6xl mx-auto">
          <Page customers={customers} setCustomers={setCustomers} trips={trips} setTrips={setTrips} invoices={invoices} setInvoices={setInvoices} goTo={setTab} />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = logged out

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) {
    return (
      <div className="ltt-root flex items-center justify-center min-h-screen" style={{ background: C.bgDeep }}>
        <style>{GLOBAL_CSS}</style>
        <Loader2 className="animate-spin" size={22} color={C.gold} />
      </div>
    );
  }
  if (!user) return <Login />;
  return <BillingApp uid={user.uid} />;
}
