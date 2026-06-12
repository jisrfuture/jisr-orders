import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase.js'
import {
  LayoutDashboard, Package, Tags, Plus, Search, X, Trash2,
  History, Pencil, LogOut, Loader2
} from 'lucide-react'

/* ============ هوية جسر المستقبل ============ */
const INK = '#1F3A32'
const APP_BG = '#F1EEE4'
const GOLD = '#C6A45A'
const OLIVE = '#687351'

/* ============ الثوابت ============ */
const STAGES = ['تصميم', 'عينة', 'انتاج', 'جودة وتغليف', 'شحن', 'تم التسليم']
const SPECIAL_STAGES = ['معلق بانتظار التعميد', 'ملغي']
const ALL_STAGES = [...STAGES, ...SPECIAL_STAGES]

const STAGE_COLORS = {
  'تصميم': { bg: '#EDE9FE', text: '#6D28D9' },
  'عينة': { bg: '#FEF3C7', text: '#B45309' },
  'انتاج': { bg: '#DBEAFE', text: '#1D4ED8' },
  'جودة وتغليف': { bg: '#CCFBF1', text: '#0F766E' },
  'شحن': { bg: '#FFEDD5', text: '#C2410C' },
  'تم التسليم': { bg: '#DCFCE7', text: '#15803D' },
  'معلق بانتظار التعميد': { bg: '#F3F4F6', text: '#4B5563' },
  'ملغي': { bg: '#FEE2E2', text: '#B91C1C' },
}

const PRODUCTS = ['عباية', 'طرحة', 'جلابية', 'فستان', 'قماش (متر)', 'سكارف', 'كاجوال', 'توت باق', 'سديري', 'قميص', 'تنورة', 'سجادات']
const PRINTERS = ['', 'القديمة', 'الجديدة', 'القديمة + الجديدة']

/* المصرح لهم بالاطلاع على سجل النشاط */
const ADMIN_EMAILS = [
  'azzoz2972@gmail.com',
  'synalnafisah@gmail.com',
  'khawlamss124@gmail.com',
]
const isAdmin = (email) => ADMIN_EMAILS.includes((email || '').trim().toLowerCase())

const fmtDate = (d) => (d ? d : '—')
const fmtTs = (ts) => {
  try {
    return new Date(ts).toLocaleString('ar-SA-u-ca-gregory', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ts
  }
}
const prodSummary = (p) => {
  if (!p || typeof p !== 'object') return '—'
  const parts = Object.entries(p).filter(([, q]) => q > 0).map(([n, q]) => `${n} ×${q}`)
  return parts.length ? parts.join('، ') : '—'
}

/* ============ أنماط عامة ============ */
const S = {
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #d6d0c0',
    background: '#fff', fontSize: 15, color: INK, outline: 'none', boxSizing: 'border-box',
  },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: OLIVE, marginBottom: 6 },
  btn: {
    padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
  },
  card: {
    background: '#fff', borderRadius: 14, padding: 16,
    border: '1px solid #e3ddcc', boxShadow: '0 1px 3px rgba(31,58,50,0.06)',
  },
}

/* ============ شاشة الدخول ============ */
function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const submit = async () => {
    setErr(null); setMsg(null)
    if (!email.trim() || !password) { setErr('اكتب الإيميل وكلمة المرور'); return }
    if (mode === 'signup' && !name.trim()) { setErr('اكتب اسمك (الأول والثاني)'); return }
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        })
        if (error) throw error
        setMsg('تم إنشاء الحساب ✅ افتح إيميلك واضغط رابط التأكيد، وبعدها ارجع هنا وسجّل دخول')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (e) {
      const m = (e.message || '').toLowerCase()
      if (m.includes('invalid login')) setErr('الإيميل أو كلمة المرور غير صحيحة')
      else if (m.includes('not confirmed')) setErr('إيميلك غير مؤكد — افتح بريدك واضغط رابط التأكيد أولاً')
      else if (m.includes('already registered')) setErr('هذا الإيميل مسجّل من قبل — سجّل دخول')
      else if (m.includes('at least 6')) setErr('كلمة المرور لازم تكون 6 خانات أو أكثر')
      else setErr('صار خطأ: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: APP_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ ...S.card, width: '100%', maxWidth: 420, padding: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 30, color: GOLD }}>✳</div>
          <h1 style={{ margin: '6px 0 2px', color: INK, fontSize: 22 }}>متابعة الطلبات</h1>
          <div style={{ color: OLIVE, fontSize: 14, fontWeight: 700 }}>مصنع جسر المستقبل</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button onClick={() => { setMode('login'); setErr(null); setMsg(null) }}
            style={{ ...S.btn, flex: 1, background: mode === 'login' ? INK : '#eee8d8', color: mode === 'login' ? '#fff' : INK }}>
            تسجيل دخول
          </button>
          <button onClick={() => { setMode('signup'); setErr(null); setMsg(null) }}
            style={{ ...S.btn, flex: 1, background: mode === 'signup' ? INK : '#eee8d8', color: mode === 'signup' ? '#fff' : INK }}>
            حساب جديد
          </button>
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>الاسم (الأول والثاني)</label>
            <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: عبدالعزيز النفيسة" />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>الإيميل</label>
          <input style={{ ...S.input, direction: 'ltr', textAlign: 'left' }} type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={S.label}>كلمة المرور</label>
          <input style={{ ...S.input, direction: 'ltr', textAlign: 'left' }} type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
        </div>

        {err && <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 12 }}>{err}</div>}
        {msg && <div style={{ background: '#DCFCE7', color: '#15803D', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 12 }}>{msg}</div>}

        <button onClick={submit} disabled={busy}
          style={{ ...S.btn, width: '100%', background: GOLD, color: INK, opacity: busy ? 0.7 : 1 }}>
          {busy ? 'لحظة...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
        </button>
      </div>
    </div>
  )
}

/* ============ شارة المرحلة ============ */
function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] || { bg: '#eee', text: '#333' }
  return (
    <span style={{ background: c.bg, color: c.text, padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>
      {stage}
    </span>
  )
}

/* ============ نافذة إضافة/تعديل طلب ============ */
function OrderModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    order_no: initial?.order_no || '',
    brand: initial?.brand || '',
    transfer_date: initial?.transfer_date || '',
    approval_date: initial?.approval_date || '',
    stage: initial?.stage || 'تصميم',
    products: initial?.products && typeof initial.products === 'object' ? { ...initial.products } : {},
    printer: initial?.printer || '',
    delivery_date: initial?.delivery_date || '',
    notes: initial?.notes || '',
  }))
  const [err, setErr] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setQty = (name, qty) => setForm((f) => {
    const p = { ...f.products }
    const n = parseInt(qty, 10)
    if (!n || n <= 0) delete p[name]
    else p[name] = n
    return { ...f, products: p }
  })

  const save = () => {
    if (!form.order_no.trim()) { setErr('اكتب رقم الطلب'); return }
    if (!form.brand.trim()) { setErr('اكتب اسم البراند'); return }
    onSave({
      ...form,
      order_no: form.order_no.trim(),
      brand: form.brand.trim(),
      transfer_date: form.transfer_date || null,
      approval_date: form.approval_date || null,
      delivery_date: form.delivery_date || null,
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(31,58,50,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div style={{ ...S.card, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, color: INK, fontSize: 19 }}>{initial ? 'تعديل الطلب' : 'طلب جديد'}</h2>
          <button onClick={onClose} style={{ ...S.btn, background: 'transparent', padding: 6 }}><X size={20} color={OLIVE} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={S.label}>رقم الطلب *</label>
            <input style={S.input} value={form.order_no} onChange={(e) => set('order_no', e.target.value)} />
          </div>
          <div>
            <label style={S.label}>البراند *</label>
            <input style={S.input} value={form.brand} onChange={(e) => set('brand', e.target.value)} />
          </div>
          <div>
            <label style={S.label}>تاريخ التحويل</label>
            <input style={S.input} type="date" value={form.transfer_date || ''} onChange={(e) => set('transfer_date', e.target.value)} />
          </div>
          <div>
            <label style={S.label}>تاريخ التعميد</label>
            <input style={S.input} type="date" value={form.approval_date || ''} onChange={(e) => set('approval_date', e.target.value)} />
          </div>
          <div>
            <label style={S.label}>المرحلة</label>
            <select style={S.input} value={form.stage} onChange={(e) => set('stage', e.target.value)}>
              {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>المطبعة</label>
            <select style={S.input} value={form.printer} onChange={(e) => set('printer', e.target.value)}>
              {PRINTERS.map((p) => <option key={p} value={p}>{p || '— بدون —'}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>تاريخ التسليم</label>
            <input style={S.input} type="date" value={form.delivery_date || ''} onChange={(e) => set('delivery_date', e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={S.label}>المنتجات والكميات</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PRODUCTS.map((p) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#faf8f1', borderRadius: 10, padding: '6px 10px', border: '1px solid #e9e3d2' }}>
                <span style={{ flex: 1, fontSize: 14, color: INK }}>{p}</span>
                <input type="number" min="0" style={{ ...S.input, width: 70, padding: '6px 8px', textAlign: 'center' }}
                  value={form.products[p] || ''} onChange={(e) => setQty(p, e.target.value)} placeholder="0" />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={S.label}>ملاحظات</label>
          <textarea style={{ ...S.input, minHeight: 70, resize: 'vertical' }} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        {err && <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginTop: 14 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={save} style={{ ...S.btn, flex: 1, background: INK, color: '#fff' }}>حفظ</button>
          <button onClick={onClose} style={{ ...S.btn, background: '#eee8d8', color: INK }}>إلغاء</button>
        </div>
      </div>
    </div>
  )
}

/* ============ التطبيق الرئيسي ============ */
export default function App() {
  const [session, setSession] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [tab, setTab] = useState('dash')
  const [orders, setOrders] = useState([])
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | order object

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthChecked(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userEmail = session?.user?.email || ''
  const admin = isAdmin(userEmail)

  const loadOrders = async () => {
    setErr(null)
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error) setErr('تعذر تحميل الطلبات: ' + error.message)
    else setOrders(data || [])
    setLoading(false)
  }

  const loadLog = async () => {
    const { data, error } = await supabase.from('activity_log').select('*').order('ts', { ascending: false }).limit(300)
    if (!error) setLog(data || [])
  }

  useEffect(() => {
    if (session) { setLoading(true); loadOrders(); if (isAdmin(session.user?.email)) loadLog() }
  }, [session])

  const logAction = async (action, order_no, brand, extra = '') => {
    await supabase.from('activity_log').insert([{ user_name: userEmail, action, order_no, brand, extra }])
    if (admin) loadLog()
  }

  const saveOrder = async (form) => {
    setErr(null)
    if (modal === 'new') {
      const { error } = await supabase.from('orders').insert([{ ...form, created_by: userEmail, updated_by: userEmail }])
      if (error) { setErr('تعذر الحفظ: ' + error.message); return }
      await logAction('أضاف طلب', form.order_no, form.brand)
    } else {
      const before = modal
      const { error } = await supabase.from('orders')
        .update({ ...form, updated_by: userEmail, updated_at: new Date().toISOString() })
        .eq('id', before.id)
      if (error) { setErr('تعذر التعديل: ' + error.message); return }
      const extra = before.stage !== form.stage ? `المرحلة: ${before.stage} ← ${form.stage}` : ''
      await logAction('عدّل طلب', form.order_no, form.brand, extra)
    }
    setModal(null)
    loadOrders()
  }

  const changeStage = async (order, newStage) => {
    if (newStage === order.stage) return
    const { error } = await supabase.from('orders')
      .update({ stage: newStage, updated_by: userEmail, updated_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) { setErr('تعذر تغيير المرحلة: ' + error.message); return }
    await logAction('غيّر المرحلة', order.order_no, order.brand, `${order.stage} ← ${newStage}`)
    loadOrders()
  }

  const deleteOrder = async (order) => {
    if (!window.confirm(`حذف الطلب ${order.order_no} (${order.brand})؟`)) return
    const { error } = await supabase.from('orders').delete().eq('id', order.id)
    if (error) { setErr('تعذر الحذف: ' + error.message); return }
    await logAction('حذف طلب', order.order_no, order.brand)
    loadOrders()
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return orders.filter((o) => {
      if (stageFilter && o.stage !== stageFilter) return false
      if (!t) return true
      return (o.order_no || '').toLowerCase().includes(t) || (o.brand || '').toLowerCase().includes(t)
    })
  }, [orders, q, stageFilter])

  const counts = useMemo(() => {
    const c = {}
    ALL_STAGES.forEach((s) => { c[s] = 0 })
    orders.forEach((o) => { if (c[o.stage] !== undefined) c[o.stage]++ })
    return c
  }, [orders])

  const brands = useMemo(() => {
    const m = {}
    orders.forEach((o) => {
      if (!m[o.brand]) m[o.brand] = { total: 0, active: 0, done: 0 }
      m[o.brand].total++
      if (o.stage === 'تم التسليم') m[o.brand].done++
      else if (o.stage !== 'ملغي') m[o.brand].active++
    })
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total)
  }, [orders])

  if (!authChecked) {
    return <div style={{ minHeight: '100vh', background: APP_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: OLIVE }}>
      <Loader2 size={28} className="spin" /> &nbsp; جاري التحميل...
    </div>
  }
  if (!session) return <AuthScreen />

  const tabs = [
    { id: 'dash', label: 'لوحة المتابعة', icon: LayoutDashboard },
    { id: 'orders', label: 'الطلبات', icon: Package },
    { id: 'brands', label: 'البراندات', icon: Tags },
    ...(admin ? [{ id: 'log', label: 'السجل', icon: History }] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: APP_BG, fontFamily: 'inherit' }}>
      {/* الهيدر */}
      <header style={{ background: INK, color: '#fff', padding: '16px 20px', borderBottom: `3px solid ${GOLD}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: GOLD, fontSize: 24 }}>✳</span>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800 }}>متابعة الطلبات</div>
              <div style={{ fontSize: 12.5, color: '#cfd8d2' }}>مصنع جسر المستقبل</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: GOLD, direction: 'ltr' }}>{userEmail}</span>
            <button onClick={() => supabase.auth.signOut()}
              style={{ ...S.btn, background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      {/* التبويبات */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e3ddcc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 4, padding: '0 12px', overflowX: 'auto' }}>
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  ...S.btn, background: 'transparent', borderRadius: 0,
                  borderBottom: active ? `3px solid ${GOLD}` : '3px solid transparent',
                  color: active ? INK : '#8a8674', display: 'flex', alignItems: 'center', gap: 7, padding: '14px 16px',
                }}>
                <Icon size={17} /> {t.label}
              </button>
            )
          })}
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
        {err && <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 10, padding: '10px 14px', fontSize: 14, marginBottom: 16 }}>{err}</div>}
        {loading && <div style={{ color: OLIVE, padding: 30, textAlign: 'center' }}>جاري تحميل البيانات...</div>}

        {/* لوحة المتابعة */}
        {!loading && tab === 'dash' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {ALL_STAGES.map((s) => {
                const c = STAGE_COLORS[s]
                return (
                  <button key={s} onClick={() => { setStageFilter(s); setTab('orders') }}
                    style={{ ...S.card, cursor: 'pointer', textAlign: 'center', border: `1px solid ${c.bg}`, fontFamily: 'inherit' }}>
                    <div style={{ fontSize: 30, fontWeight: 800, color: c.text }}>{counts[s]}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: INK, marginTop: 4 }}>{s}</div>
                  </button>
                )
              })}
            </div>
            <div style={{ ...S.card, marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ color: OLIVE, fontWeight: 700 }}>إجمالي الطلبات: <span style={{ color: INK }}>{orders.length}</span></div>
              <div style={{ color: OLIVE, fontWeight: 700 }}>قيد العمل: <span style={{ color: INK }}>{orders.filter((o) => o.stage !== 'تم التسليم' && o.stage !== 'ملغي').length}</span></div>
              <div style={{ color: OLIVE, fontWeight: 700 }}>تم التسليم: <span style={{ color: INK }}>{counts['تم التسليم']}</span></div>
            </div>
          </div>
        )}

        {/* الطلبات */}
        {!loading && tab === 'orders' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={17} color={OLIVE} style={{ position: 'absolute', top: 12, right: 12 }} />
                <input style={{ ...S.input, paddingRight: 38 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الطلب أو البراند..." />
              </div>
              <select style={{ ...S.input, width: 'auto' }} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="">كل المراحل</option>
                {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => setModal('new')}
                style={{ ...S.btn, background: GOLD, color: INK, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={17} /> طلب جديد
              </button>
            </div>

            {filtered.length === 0 && <div style={{ ...S.card, textAlign: 'center', color: OLIVE, padding: 36 }}>لا توجد طلبات مطابقة</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((o) => (
                <div key={o.id} style={{ ...S.card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 17, color: INK }}>#{o.order_no}</span>
                        <span style={{ background: '#f3efe2', color: OLIVE, padding: '3px 10px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{o.brand}</span>
                        <StageBadge stage={o.stage} />
                      </div>
                      <div style={{ fontSize: 13.5, color: '#6b6a5c', marginTop: 8 }}>{prodSummary(o.products)}</div>
                      <div style={{ fontSize: 12.5, color: '#9a9786', marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span>التحويل: {fmtDate(o.transfer_date)}</span>
                        <span>التعميد: {fmtDate(o.approval_date)}</span>
                        <span>التسليم: {fmtDate(o.delivery_date)}</span>
                        {o.printer && <span>المطبعة: {o.printer}</span>}
                      </div>
                      {o.notes && <div style={{ fontSize: 13, color: OLIVE, marginTop: 6 }}>📝 {o.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select value={o.stage} onChange={(e) => changeStage(o, e.target.value)}
                        style={{ ...S.input, width: 'auto', padding: '7px 10px', fontSize: 13.5 }}>
                        {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => setModal(o)} style={{ ...S.btn, background: '#eee8d8', padding: 9 }}><Pencil size={16} color={INK} /></button>
                      <button onClick={() => deleteOrder(o)} style={{ ...S.btn, background: '#FEE2E2', padding: 9 }}><Trash2 size={16} color="#B91C1C" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* البراندات */}
        {!loading && tab === 'brands' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {brands.length === 0 && <div style={{ ...S.card, textAlign: 'center', color: OLIVE, padding: 36 }}>لا توجد براندات بعد</div>}
            {brands.map(([name, b]) => (
              <div key={name} style={S.card}>
                <div style={{ fontWeight: 800, fontSize: 17, color: INK, marginBottom: 10 }}>{name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: OLIVE }}>
                  <span>الإجمالي: <b style={{ color: INK }}>{b.total}</b></span>
                  <span>قيد العمل: <b style={{ color: '#B45309' }}>{b.active}</b></span>
                  <span>سُلّم: <b style={{ color: '#15803D' }}>{b.done}</b></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* السجل */}
        {!loading && tab === 'log' && admin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {log.length === 0 && <div style={{ ...S.card, textAlign: 'center', color: OLIVE, padding: 36 }}>السجل فاضي</div>}
            {log.map((l) => (
              <div key={l.id} style={{ ...S.card, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 800, color: INK, direction: 'ltr', display: 'inline-block' }}>{l.user_name}</span>
                  <span style={{ color: OLIVE }}> • {l.action} </span>
                  <span style={{ fontWeight: 700, color: INK }}>#{l.order_no}</span>
                  <span style={{ color: OLIVE }}> ({l.brand})</span>
                  {l.extra && <span style={{ color: '#9a9786' }}> — {l.extra}</span>}
                </div>
                <div style={{ fontSize: 12.5, color: '#9a9786' }}>{fmtTs(l.ts)}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && <OrderModal initial={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={saveOrder} />}
    </div>
  )
}
