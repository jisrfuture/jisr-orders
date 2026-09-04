import { useState } from 'react'
import { supabase } from './supabase.js'
import { Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { INK, GOLD, OLIVE, PAPER, LINE, FLOW, HOLD, canon, stageColor, fmtDate, fmtTs, daysSince, prodSummary } from './constants.js'

const S = {
  input: { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${LINE}`, background: '#fff', fontSize: 17, color: INK, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  label: { display: 'block', fontSize: 13.5, fontWeight: 600, color: OLIVE, marginBottom: 6 },
}

/* ---------- شريط المراحل (العنصر الأساسي في الصفحة) ---------- */
function StageRail({ status }) {
  const c = canon(status)
  const idx = FLOW.indexOf(c)
  const held = HOLD.includes(c) || idx === -1
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '14px 0 6px' }}>
        {FLOW.map((s, i) => {
          const reached = !held && i <= idx
          const current = !held && i === idx
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < FLOW.length - 1 ? 1 : 'none' }}>
              <div title={s} style={{
                width: current ? 18 : 12, height: current ? 18 : 12, borderRadius: 999, flexShrink: 0,
                background: reached ? (current ? GOLD : INK) : '#fff',
                border: `2px solid ${reached ? (current ? GOLD : INK) : LINE}`,
                boxShadow: current ? `0 0 0 5px ${GOLD}33` : 'none',
              }} />
              {i < FLOW.length - 1 && <div style={{ flex: 1, height: 2, background: !held && i < idx ? INK : LINE }} />}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: OLIVE }}>
        <span>{FLOW[0]}</span><span>{FLOW[FLOW.length - 1]}</span>
      </div>
    </div>
  )
}

function OrderCard({ o }) {
  const [open, setOpen] = useState(false)
  const c = canon(o.status)
  const col = stageColor(c)
  const days = daysSince(o)
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${LINE}`, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: OLIVE }}>رقم الفاتورة</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: INK, letterSpacing: 0.5, fontVariantNumeric: 'tabular-nums' }}>{o.invoice_no || '—'}</div>
        </div>
        <span style={{ background: col.bg, color: col.text, padding: '7px 14px', borderRadius: 999, fontSize: 14.5, fontWeight: 700, alignSelf: 'center' }}>
          {c || 'لم تُحدّد بعد'}
        </span>
      </div>

      <StageRail status={o.status} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 14, fontSize: 14 }}>
        <Info k="نوع الطلب" v={o.order_type || '—'} />
        <Info k="تاريخ التعميد" v={fmtDate(o.approval_date)} />
        <Info k="التسليم المتوقع" v={fmtDate(o.delivery_date)} />
        <Info k="الأيام من التعميد" v={days == null ? '—' : `${days} يوم`} />
      </div>

      <button onClick={() => setOpen((v) => !v)} style={{ marginTop: 12, background: 'transparent', border: 'none', color: OLIVE, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'inherit' }}>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />} تفاصيل القطع
      </button>
      {open && (
        <div style={{ marginTop: 8, fontSize: 14, color: INK, lineHeight: 1.9 }}>
          {prodSummary(o.products)}
          {o.total_qty != null && <span style={{ color: OLIVE }}> — الإجمالي {o.total_qty}</span>}
        </div>
      )}
    </div>
  )
}
const Info = ({ k, v }) => (
  <div><div style={{ fontSize: 12.5, color: OLIVE }}>{k}</div><div style={{ fontWeight: 600, color: INK }}>{v}</div></div>
)

/* ---------- الصفحة ---------- */
export default function Track() {
  const [phone, setPhone] = useState('')
  const [invoice, setInvoice] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [orders, setOrders] = useState(null)

  const search = async (e) => {
    e?.preventDefault()
    setErr(null)
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 9) { setErr('اكتب رقم الجوال كامل (مثال: 05xxxxxxxx)'); return }
    if (!invoice.trim()) { setErr('اكتب رقم فاتورة واحدة من فواتيرك (مثال: QTE3650)'); return }
    setLoading(true)
    /* لاحقاً مع SMS: يُستبدل هذا النداء بـ supabase.auth.signInWithOtp({ phone }) ثم rpc بدون رقم فاتورة */
    const { data, error } = await supabase.rpc('track_orders', { p_phone: digits, p_invoice: invoice.trim() })
    setLoading(false)
    if (error) { setErr('تعذر الاتصال بالخادم، حاول بعد قليل.'); return }
    if (!data || data.length === 0) {
      setErr('ما لقينا طلبات بهذا الجوال ورقم الفاتورة. تأكد من الرقمين، أو تواصل مع خدمة العملاء.')
      setOrders(null)
      return
    }
    setOrders(data)
  }

  const active = orders ? orders.filter((o) => !['تم الشحن', 'ملغي', 'رصيد'].includes(canon(o.status))) : []
  const done = orders ? orders.filter((o) => ['تم الشحن', 'ملغي', 'رصيد'].includes(canon(o.status))) : []

  return (
    <div style={{ minHeight: '100vh', padding: '0 16px 60px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', padding: '44px 0 26px' }}>
          <div style={{ fontSize: 28, color: GOLD, lineHeight: 1 }}>✳</div>
          <h1 style={{ margin: '10px 0 4px', color: INK, fontSize: 26, fontWeight: 700 }}>تابع طلبك</h1>
          <div style={{ color: OLIVE, fontSize: 15 }}>مصنع جسر المستقبل لصناعة الأزياء</div>
        </header>

        {!orders && (
          <form onSubmit={search} style={{ background: PAPER, borderRadius: 18, border: `1px solid ${LINE}`, padding: 22 }}>
            <label style={S.label}>رقم الجوال المسجل في الفاتورة</label>
            <input style={{ ...S.input, direction: 'ltr', textAlign: 'right' }} inputMode="tel" placeholder="05xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div style={{ height: 14 }} />
            <label style={S.label}>رقم أي فاتورة من فواتيرك</label>
            <input style={{ ...S.input, direction: 'ltr', textAlign: 'right' }} placeholder="QTE0000" value={invoice} onChange={(e) => setInvoice(e.target.value.toUpperCase())} />
            {err && <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginTop: 14 }}>{err}</div>}
            <button type="submit" disabled={loading} style={{ marginTop: 16, width: '100%', padding: 14, borderRadius: 12, border: 'none', background: INK, color: '#fff', fontSize: 16.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />} عرض طلباتي
            </button>
            <p style={{ color: OLIVE, fontSize: 13, marginTop: 14, marginBottom: 0, lineHeight: 1.8 }}>
              رقم الفاتورة يبدأ بـ QTE وتجده في فاتورتك من جسر المستقبل. البيانات تُحدّث كل نصف ساعة.
            </p>
          </form>
        )}

        {orders && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ color: INK, fontSize: 17, fontWeight: 700 }}>{orders[0].brand}</div>
              <button onClick={() => { setOrders(null); setInvoice('') }} style={{ background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 999, padding: '6px 14px', color: OLIVE, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5 }}>بحث برقم آخر</button>
            </div>

            {active.length > 0 && <Section title={`قيد التنفيذ (${active.length})`} items={active} />}
            {done.length > 0 && <Section title={`مكتملة (${done.length})`} items={done} muted />}

            <div style={{ color: OLIVE, fontSize: 12.5, textAlign: 'center', marginTop: 22 }}>
              آخر تحديث من المصنع: {fmtTs(orders[0].synced_at)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, items, muted }) {
  const [open, setOpen] = useState(!muted)
  return (
    <div style={{ marginBottom: 22 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ background: 'transparent', border: 'none', padding: '4px 0', color: INK, fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
        {open ? <ChevronUp size={18} color={OLIVE} /> : <ChevronDown size={18} color={OLIVE} />} {title}
      </button>
      {open && <div style={{ display: 'grid', gap: 12, marginTop: 10, opacity: muted ? 0.85 : 1 }}>{items.map((o, i) => <OrderCard key={(o.invoice_no || '') + i} o={o} />)}</div>}
    </div>
  )
}
