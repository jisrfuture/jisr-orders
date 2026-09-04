import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase.js'
import Track from './Track.jsx'
import { LayoutDashboard, Package, Tags, Users, Search, LogOut, Loader2, RefreshCw, X } from 'lucide-react'
import {
  INK, APP_BG, GOLD, OLIVE, PAPER, LINE, FLOW, HOLD,
  canon, stageColor, isDone, isActive, fmtDate, fmtTs, daysSince, prodSummary, fmtPhone,
} from './constants.js'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1u5kVsuZ09rpEwir49tuMMBlK5SDNGN5ylBFgZTOIH2w/edit'

const S = {
  input: { padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${LINE}`, background: '#fff', fontSize: 15, color: INK, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  card: { background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, padding: 18 },
  btn: { padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
}

/* ============ التوجيه: #/admin للموظفين، غير ذلك صفحة العميل ============ */
const useHash = () => {
  const [h, setH] = useState(window.location.hash)
  useEffect(() => { const f = () => setH(window.location.hash); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  return h
}

export default function App() {
  const hash = useHash()
  return (
    <div style={{ minHeight: '100vh', background: APP_BG, color: INK, fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif' }}>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}} input:focus,select:focus{border-color:${GOLD}!important} button:focus-visible{outline:2px solid ${GOLD};outline-offset:2px} @media (prefers-reduced-motion:reduce){.spin{animation:none}}`}</style>
      {hash.startsWith('#/admin') ? <Admin /> : <Track />}
      <a href={hash.startsWith('#/admin') ? '#/' : '#/admin'} style={{ position: 'fixed', bottom: 14, left: 14, fontSize: 12.5, color: OLIVE, textDecoration: 'none', opacity: 0.7 }}>
        {hash.startsWith('#/admin') ? 'صفحة العميل' : 'دخول الموظفين'}
      </a>
    </div>
  )
}

/* ============ دخول الموظفين (بدون تسجيل حسابات جديدة) ============ */
function StaffLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)
  const go = async (e) => {
    e.preventDefault(); setErr(null); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setErr('البريد أو كلمة المرور غير صحيحة.')
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={go} style={{ ...S.card, width: '100%', maxWidth: 400, padding: 28, background: PAPER }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 26, color: GOLD }}>✳</div>
          <h1 style={{ margin: '6px 0 2px', fontSize: 21 }}>لوحة المتابعة</h1>
          <div style={{ color: OLIVE, fontSize: 14 }}>للموظفين والإدارة</div>
        </div>
        <input style={{ ...S.input, width: '100%', marginBottom: 10, direction: 'ltr' }} type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={{ ...S.input, width: '100%', marginBottom: 10, direction: 'ltr' }} type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 10 }}>{err}</div>}
        <button type="submit" disabled={loading} style={{ ...S.btn, width: '100%', justifyContent: 'center', background: INK, color: '#fff', padding: 13 }}>
          {loading ? <Loader2 size={18} className="spin" /> : 'دخول'}
        </button>
      </form>
    </div>
  )
}

/* ============ لوحة الموظفين (عرض فقط) ============ */
function Admin() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (session === undefined) return <Center><Loader2 size={28} className="spin" color={OLIVE} /></Center>
  if (!session) return <StaffLogin />
  return <Dashboard userEmail={session.user.email} />
}
const Center = ({ children }) => <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>

function Dashboard({ userEmail }) {
  const [tab, setTab] = useState('dash')
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [lastSync, setLastSync] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)
  const [detail, setDetail] = useState(null)

  const load = async () => {
    setLoading(true)
    const [o, c, s] = await Promise.all([
      supabase.from('orders').select('*').order('sheet_row', { ascending: false }),
      supabase.from('customers').select('name, phone'),
      supabase.from('sync_log').select('*').order('ran_at', { ascending: false }).limit(1),
    ])
    setOrders(o.data || []); setCustomers(c.data || []); setLastSync(s.data?.[0] || null)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const phoneOf = useMemo(() => { const m = {}; customers.forEach((c) => { m[c.name] = c.phone }); return m }, [customers])

  const counts = useMemo(() => {
    const c = {}
    orders.forEach((o) => { const k = canon(o.status) || 'بدون حالة'; c[k] = (c[k] || 0) + 1 })
    return c
  }, [orders])
  const stageList = useMemo(() => {
    const known = [...FLOW, ...HOLD]
    const extra = Object.keys(counts).filter((k) => !known.includes(k))
    return [...known, ...extra]
  }, [counts])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return orders.filter((o) => {
      const c = canon(o.status)
      if (onlyActive && !isActive(c) && !stageFilter) return false
      if (stageFilter && c !== stageFilter && !(stageFilter === 'بدون حالة' && !c)) return false
      if (typeFilter && (o.order_type || '') !== typeFilter) return false
      if (!t) return true
      return [o.invoice_no, o.brand, o.file_no, o.notes, o.cs_notes].some((v) => (v || '').toLowerCase().includes(t))
    })
  }, [orders, q, stageFilter, typeFilter, onlyActive])

  const brands = useMemo(() => {
    const m = {}
    orders.forEach((o) => {
      if (!m[o.brand]) m[o.brand] = { total: 0, active: 0, done: 0, last: null }
      const b = m[o.brand]; b.total++
      if (isDone(o.status)) b.done++; else if (isActive(o.status)) b.active++
      if (o.approval_date && (!b.last || o.approval_date > b.last)) b.last = o.approval_date
    })
    return Object.entries(m).sort((a, b) => b[1].active - a[1].active || b[1].total - a[1].total)
  }, [orders])

  const late = useMemo(() => orders.filter((o) => isActive(o.status) && o.delivery_date && o.delivery_date < new Date().toISOString().slice(0, 10)), [orders])
  const activeN = orders.filter((o) => isActive(o.status)).length
  const types = useMemo(() => [...new Set(orders.map((o) => o.order_type).filter(Boolean))], [orders])

  const tabs = [
    { id: 'dash', label: 'لوحة المتابعة', icon: LayoutDashboard },
    { id: 'orders', label: 'الطلبات', icon: Package },
    { id: 'brands', label: 'العملاء', icon: Tags },
    { id: 'phones', label: 'الجوالات', icon: Users },
  ]

  return (
    <div>
      <header style={{ background: INK, color: '#fff', padding: '16px 22px', borderBottom: `3px solid ${GOLD}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22, color: GOLD }}>✳</span>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>متابعة الطلبات</div>
              <div style={{ fontSize: 12.5, opacity: 0.8 }}>مصنع جسر المستقبل — عرض مباشر من جدول الطلبات</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span style={{ opacity: 0.85 }}>{userEmail}</span>
            <button onClick={() => supabase.auth.signOut()} style={{ ...S.btn, background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '8px 12px', fontSize: 13.5 }}><LogOut size={15} /> خروج</button>
          </div>
        </div>
      </header>

      <div style={{ background: PAPER, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <nav style={{ display: 'flex', gap: 4 }}>
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ ...S.btn, background: 'transparent', color: tab === t.id ? INK : OLIVE, borderBottom: `3px solid ${tab === t.id ? GOLD : 'transparent'}`, borderRadius: 0, padding: '14px 12px', fontWeight: tab === t.id ? 700 : 600 }}>
                <t.icon size={17} /> {t.label}
              </button>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: OLIVE, padding: '8px 0' }}>
            <span>
              آخر سحبة من الشيت: {lastSync ? fmtTs(lastSync.ran_at) : '—'}
              {lastSync && !lastSync.ok && <span style={{ color: '#B91C1C', fontWeight: 700 }}> — فشلت: {lastSync.message}</span>}
            </span>
            <button onClick={load} title="تحديث العرض" style={{ ...S.btn, background: 'transparent', color: OLIVE, padding: 6 }}><RefreshCw size={15} className={loading ? 'spin' : ''} /></button>
            <a href={SHEET_URL} target="_blank" rel="noreferrer" style={{ color: INK, fontWeight: 700, textDecoration: 'none' }}>فتح الشيت للتعديل ↗</a>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 22 }}>
        {loading && orders.length === 0 && <Center><Loader2 size={28} className="spin" color={OLIVE} /></Center>}

        {!loading && tab === 'dash' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {stageList.filter((s) => counts[s]).map((s) => {
                const c = stageColor(s)
                return (
                  <button key={s} onClick={() => { setStageFilter(s); setOnlyActive(false); setTab('orders') }} style={{ ...S.card, textAlign: 'center', cursor: 'pointer', borderColor: c.bg, padding: '18px 10px', fontFamily: 'inherit' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: c.text, fontVariantNumeric: 'tabular-nums' }}>{counts[s]}</div>
                    <div style={{ fontSize: 13.5, color: INK, fontWeight: 600, marginTop: 2 }}>{s}</div>
                  </button>
                )
              })}
            </div>
            <div style={{ ...S.card, marginTop: 14, display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 15 }}>
              <Stat k="إجمالي الطلبات" v={orders.length} />
              <Stat k="قيد العمل" v={activeN} />
              <Stat k="مشحونة" v={counts['تم الشحن'] || 0} />
              <Stat k="متأخرة عن موعد التسليم" v={late.length} warn={late.length > 0} />
              <Stat k="عملاء بجوال مسجل" v={`${customers.length} من ${brands.length}`} />
            </div>

            {late.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>متأخرة عن موعد التسليم ({late.length})</h3>
                <OrdersTable rows={late} phoneOf={phoneOf} onOpen={setDetail} compact />
              </div>
            )}
          </>
        )}

        {!loading && tab === 'orders' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={17} color={OLIVE} style={{ position: 'absolute', right: 12, top: 12 }} />
                <input style={{ ...S.input, width: '100%', paddingRight: 38 }} placeholder="بحث برقم الفاتورة، العميل، رقم الملف، الملاحظات…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select style={S.input} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="">كل المراحل</option>
                {stageList.map((s) => <option key={s} value={s}>{s} ({counts[s] || 0})</option>)}
              </select>
              <select style={S.input} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">كل الأنواع</option>
                {types.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: OLIVE, cursor: 'pointer' }}>
                <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> قيد العمل فقط
              </label>
              <span style={{ fontSize: 13.5, color: OLIVE }}>{filtered.length} طلب</span>
            </div>
            <OrdersTable rows={filtered} phoneOf={phoneOf} onOpen={setDetail} />
          </>
        )}

        {!loading && tab === 'brands' && (
          <div style={{ ...S.card, padding: 0, overflow: 'auto' }}>
            <table style={T.table}>
              <thead><tr>{['العميل', 'الجوال', 'قيد العمل', 'مشحونة', 'الإجمالي', 'آخر تعميد'].map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
              <tbody>
                {brands.map(([name, b]) => (
                  <tr key={name} style={{ cursor: 'pointer' }} onClick={() => { setQ(name); setStageFilter(''); setOnlyActive(false); setTab('orders') }}>
                    <td style={{ ...T.td, fontWeight: 700 }}>{name}</td>
                    <td style={{ ...T.td, direction: 'ltr', textAlign: 'right', color: phoneOf[name] ? INK : '#B91C1C' }}>{phoneOf[name] ? fmtPhone(phoneOf[name]) : 'غير مسجل'}</td>
                    <td style={T.td}>{b.active}</td><td style={T.td}>{b.done}</td><td style={T.td}>{b.total}</td>
                    <td style={T.td}>{fmtDate(b.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'phones' && <Phones customers={customers} brands={brands} />}
      </main>

      {detail && <DetailModal o={detail} phone={phoneOf[detail.brand]} onClose={() => setDetail(null)} />}
    </div>
  )
}

const Stat = ({ k, v, warn }) => (
  <div><span style={{ color: OLIVE }}>{k}: </span><span style={{ fontWeight: 700, color: warn ? '#B91C1C' : INK }}>{v}</span></div>
)

const T = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'right', padding: '11px 12px', background: PAPER, color: OLIVE, fontWeight: 700, borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap', position: 'sticky', top: 0 },
  td: { padding: '10px 12px', borderBottom: `1px solid #EEEAE0`, verticalAlign: 'top' },
}

function Badge({ status }) {
  const c = canon(status); const col = stageColor(c)
  return <span style={{ background: col.bg, color: col.text, padding: '4px 10px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{c || 'بدون حالة'}</span>
}

function OrdersTable({ rows, phoneOf, onOpen, compact }) {
  const today = new Date().toISOString().slice(0, 10)
  const cols = compact
    ? ['الفاتورة', 'العميل', 'الحالة', 'التسليم', 'التأخير']
    : ['الفاتورة', 'العميل', 'النوع', 'الحالة', 'التعميد', 'الأيام', 'التسليم', 'الإجمالي', 'الطابعة', 'الجوال']
  return (
    <div style={{ ...S.card, padding: 0, overflow: 'auto', maxHeight: '70vh' }}>
      <table style={T.table}>
        <thead><tr>{cols.map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={cols.length} style={{ ...T.td, textAlign: 'center', color: OLIVE, padding: 30 }}>لا توجد طلبات تطابق البحث</td></tr>}
          {rows.map((o) => {
            const d = daysSince(o)
            const lateBy = o.delivery_date && isActive(o.status) && o.delivery_date < today ? Math.round((new Date(today) - new Date(o.delivery_date)) / 86400000) : 0
            return (
              <tr key={o.id} onClick={() => onOpen(o)} style={{ cursor: 'pointer' }}>
                <td style={{ ...T.td, fontWeight: 700, whiteSpace: 'nowrap' }}>{o.invoice_no || <span style={{ color: '#B91C1C' }}>بدون رقم</span>}</td>
                <td style={T.td}>{o.brand}</td>
                {!compact && <td style={T.td}>{o.order_type || '—'}</td>}
                <td style={T.td}><Badge status={o.status} /></td>
                {!compact && <td style={{ ...T.td, whiteSpace: 'nowrap' }}>{fmtDate(o.approval_date)}</td>}
                {!compact && <td style={T.td}>{d == null ? '—' : d}</td>}
                <td style={{ ...T.td, whiteSpace: 'nowrap', color: lateBy ? '#B91C1C' : INK }}>{fmtDate(o.delivery_date)}</td>
                {compact && <td style={{ ...T.td, color: '#B91C1C', fontWeight: 700 }}>{lateBy} يوم</td>}
                {!compact && <td style={T.td}>{o.total_qty ?? '—'}</td>}
                {!compact && <td style={T.td}>{o.printer || '—'}</td>}
                {!compact && <td style={{ ...T.td, direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap' }}>{phoneOf[o.brand] ? fmtPhone(phoneOf[o.brand]) : <span style={{ color: '#B91C1C' }}>—</span>}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DetailModal({ o, phone, onClose }) {
  const rows = [
    ['رقم الفاتورة', o.invoice_no], ['العميل', o.brand], ['الجوال', phone ? fmtPhone(phone) : 'غير مسجل'],
    ['رقم الملف', o.file_no], ['نوع الطلب', o.order_type], ['تاريخ التحويل', fmtDate(o.transfer_date)],
    ['تاريخ التعميد', fmtDate(o.approval_date)], ['الأيام من التعميد', daysSince(o)], ['تاريخ التسليم', fmtDate(o.delivery_date)],
    ['تفاصيل الطلب', prodSummary(o.products)], ['الإجمالي', o.total_qty], ['عدد الأمتار والرولات', o.meters],
    ['نوع الطابعة', o.printer], ['العدد المخيط', o.sewn_qty], ['جاهز للشحن', o.ready_to_ship], ['تم التنفيذ', o.executed],
    ['ملاحظات خدمة العملاء', o.cs_notes], ['ملاحظات', o.notes], ['صف الشيت', o.sheet_row],
  ]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,58,50,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...S.card, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 19 }}>{o.invoice_no || 'بدون رقم'}</h2><Badge status={o.status} />
          </div>
          <button onClick={onClose} style={{ ...S.btn, background: 'transparent', padding: 6 }}><X size={20} color={OLIVE} /></button>
        </div>
        <table style={{ width: '100%', fontSize: 14.5, borderCollapse: 'collapse' }}>
          <tbody>{rows.map(([k, v]) => (
            <tr key={k}><td style={{ padding: '7px 0', color: OLIVE, width: 170, verticalAlign: 'top' }}>{k}</td><td style={{ padding: '7px 0', fontWeight: 600, whiteSpace: 'pre-wrap' }}>{v == null || v === '' ? '—' : v}</td></tr>
          ))}</tbody>
        </table>
        <div style={{ marginTop: 14, fontSize: 13, color: OLIVE }}>للتعديل: افتح الشيت وعدّل الصف رقم {o.sheet_row}. التغيير يظهر هنا خلال نصف ساعة.</div>
      </div>
    </div>
  )
}

function Phones({ customers, brands }) {
  const names = new Set(customers.map((c) => c.name))
  const missing = brands.filter(([name, b]) => !names.has(name) && b.active > 0)
  const orphan = customers.filter((c) => !brands.some(([n]) => n === c.name))
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={S.card}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>عملاء قيد العمل بدون جوال مسجل ({missing.length})</h3>
        <div style={{ fontSize: 13.5, color: OLIVE, marginBottom: 10 }}>أضفهم في تبويب "العملاء" في الشيت بنفس الاسم حرفياً، وبيظهر لهم طلباتهم عند الدخول.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{missing.map(([n]) => <span key={n} style={{ background: '#FEE2E2', color: '#B91C1C', padding: '5px 12px', borderRadius: 999, fontSize: 13.5 }}>{n}</span>)}{missing.length === 0 && <span style={{ color: '#15803D' }}>كل عملاء الطلبات النشطة لهم جوال.</span>}</div>
      </div>
      {orphan.length > 0 && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>أسماء في تبويب العملاء لا تطابق أي طلب ({orphan.length})</h3>
          <div style={{ fontSize: 13.5, color: OLIVE, marginBottom: 10 }}>غالباً اختلاف في كتابة الاسم بين التبويبين.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{orphan.map((c) => <span key={c.name} style={{ background: '#FEF3C7', color: '#B45309', padding: '5px 12px', borderRadius: 999, fontSize: 13.5 }}>{c.name} — {fmtPhone(c.phone)}</span>)}</div>
        </div>
      )}
      <div style={{ ...S.card, padding: 0, overflow: 'auto' }}>
        <table style={T.table}>
          <thead><tr><th style={T.th}>العميل</th><th style={T.th}>الجوال</th></tr></thead>
          <tbody>{customers.map((c, i) => <tr key={i}><td style={T.td}>{c.name}</td><td style={{ ...T.td, direction: 'ltr', textAlign: 'right' }}>{fmtPhone(c.phone)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}
