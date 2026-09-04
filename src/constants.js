/* ============ هوية جسر المستقبل ============ */
export const INK = '#1F3A32'
export const APP_BG = '#F1EEE4'
export const GOLD = '#C6A45A'
export const OLIVE = '#687351'
export const PAPER = '#FBFAF6'
export const LINE = '#DDD6C4'

/* ============ مراحل الطلب (تسلسل التنفيذ) ============
   الترتيب هنا هو ترتيب الظهور في شريط المراحل. أي حالة غير موجودة
   في القائمتين تظهر كما هي باللون الرمادي بدون كسر الصفحة. */
export const FLOW = ['تصميم', 'تم اعتماد التصميم', 'طباعة', 'قص', 'تطريز', 'خياطة', 'جودة وتغليف', 'تم الشحن']
export const HOLD = ['معلق بانتظار التعميد', 'معلق لحين توفر اقمشة', 'رصيد', 'ملغي']

/* مرادفات في الشيت → المرحلة المعتمدة */
const ALIAS = {
  'تم': 'تم الشحن',
  'تم الشحن ': 'تم الشحن',
  'قص وتطريز': 'تطريز',
  'قص و تطريز': 'تطريز',
  'امر تشغيل': 'طباعة',
  'تعميد': 'معلق بانتظار التعميد',
  'معلق': 'معلق بانتظار التعميد',
  'معلق لحين توفر اقماش': 'معلق لحين توفر اقمشة',
  'معلق لحين توفر أقمشة': 'معلق لحين توفر اقمشة',
}
export const canon = (s) => {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  if (!t || t === '-' || t === '—') return ''
  if (ALIAS[t]) return ALIAS[t]
  if (t.startsWith('معلق')) return t.includes('قماش') || t.includes('قمشة') ? 'معلق لحين توفر اقمشة' : 'معلق بانتظار التعميد'
  return t
}

export const STAGE_COLORS = {
  'تصميم':                 { bg: '#EDE9FE', text: '#6D28D9' },
  'تم اعتماد التصميم':     { bg: '#E0E7FF', text: '#3730A3' },
  'طباعة':                 { bg: '#DBEAFE', text: '#1D4ED8' },
  'قص':                    { bg: '#CFFAFE', text: '#0E7490' },
  'تطريز':                 { bg: '#FCE7F3', text: '#BE185D' },
  'خياطة':                 { bg: '#FEF3C7', text: '#B45309' },
  'جودة وتغليف':           { bg: '#CCFBF1', text: '#0F766E' },
  'تم الشحن':              { bg: '#DCFCE7', text: '#15803D' },
  'معلق بانتظار التعميد':  { bg: '#F3F4F6', text: '#4B5563' },
  'معلق لحين توفر اقمشة':  { bg: '#F3F4F6', text: '#4B5563' },
  'رصيد':                  { bg: '#F5F5F4', text: '#57534E' },
  'ملغي':                  { bg: '#FEE2E2', text: '#B91C1C' },
}
export const stageColor = (s) => STAGE_COLORS[canon(s)] || { bg: '#ECEAE3', text: '#5B5A50' }
export const isDone = (s) => canon(s) === 'تم الشحن'
export const isActive = (s) => { const c = canon(s); return c && c !== 'تم الشحن' && c !== 'ملغي' && c !== 'رصيد' }

/* ============ تواريخ ============ */
export const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}
export const fmtTs = (ts) => {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString('ar-SA-u-ca-gregory', { dateStyle: 'medium', timeStyle: 'short' }) }
  catch { return ts }
}
/* الأيام من التعميد: إن كان الطلب مشحوناً نحسب حتى تاريخ التسليم، وإلا حتى اليوم */
export const daysSince = (o) => {
  if (!o.approval_date) return null
  const a = new Date(o.approval_date + 'T00:00:00')
  const end = isDone(o.status) && o.delivery_date ? new Date(o.delivery_date + 'T00:00:00') : new Date()
  const n = Math.round((end - a) / 86400000)
  return Number.isFinite(n) ? n : null
}

export const prodSummary = (p) => {
  if (!p || typeof p !== 'object') return '—'
  const parts = Object.entries(p).map(([n, q]) => `${n} ×${q}`)
  return parts.length ? parts.join('، ') : '—'
}

export const fmtPhone = (p) => (p || '').replace(/\D/g, '').replace(/^966/, '0').replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')
