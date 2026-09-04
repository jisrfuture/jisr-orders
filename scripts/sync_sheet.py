"""
مزامنة الشيت → Supabase
يقرأ تبويب الطلبات وتبويب العملاء من Google Sheets (كملف CSV)
ويستبدل بيانات القاعدة كاملة عبر الدالة replace_sheet_data.

المتغيرات (تأتي من GitHub Secrets / Variables):
  SHEET_ID        معرّف الشيت (من الرابط بين /d/ و /edit)
  ORDERS_GID      gid تبويب الطلبات (من الرابط بعد #gid=)
  CUSTOMERS_GID   gid تبويب العملاء
  SUPABASE_URL    https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY  مفتاح service_role (سري)
"""
import csv, io, json, os, re, sys, urllib.request, datetime as dt

SHEET_ID      = os.environ["SHEET_ID"]
ORDERS_GID    = os.environ.get("ORDERS_GID", "0")
CUSTOMERS_GID = os.environ.get("CUSTOMERS_GID", "")
SB_URL        = os.environ["SUPABASE_URL"].rstrip("/")
SB_KEY        = os.environ["SUPABASE_SERVICE_KEY"]

# ترتيب أعمدة تبويب الطلبات كما هو في الشيت (لا تغيّره إلا إذا غيّرت الأعمدة)
PRODUCT_COLS = ["عباية", "طرحة", "جلابية", "فستان", "قماش", "روب", "سكارف",
                "تيشيرت", "كاجوال", "توت باق", "سديري", "قميص", "تنورة", "سجادات"]
COL = {
    "invoice_no": 0, "transfer_date": 1, "brand": 2, "file_no": 3, "order_type": 4,
    "approval_date": 5, "products_start": 6,  # 6..19 = 14 منتج
    "total_qty": 20, "status": 21, "days": 22, "delivery_date": 23, "meters": 24,
    "printer": 25, "sewn_qty": 26, "ready_to_ship": 27, "executed": 28,
    "cs_notes": 29, "notes": 30,
}
HEADER_ROWS = 2   # صفّا العناوين في أعلى الشيت


def fetch_csv(gid: str):
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}"
    with urllib.request.urlopen(url, timeout=60) as r:
        data = r.read().decode("utf-8-sig")
    return list(csv.reader(io.StringIO(data)))


def cell(row, i):
    return row[i].strip() if i < len(row) else ""


AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

def parse_date(s: str):
    """يقبل: 2026/01/29 · 29-01-2026 · 29/1/26 · 1\\8\\2026 · 02-26-2026 (شهر-يوم)"""
    s = (s or "").translate(AR_DIGITS).strip()
    if not s or s in ("-", "—", "--", "---"):
        return None
    parts = re.split(r"[-/\\.]", s)
    parts = [p for p in parts if p != ""]
    if len(parts) != 3:
        return None
    try:
        a, b, c = (int(p) for p in parts)
    except ValueError:
        return None
    if len(parts[0]) == 4:          # Y/M/D
        y, m, d = a, b, c
    else:
        y = c if c > 99 else 2000 + c
        if a > 12:                  # D/M/Y
            d, m = a, b
        elif b > 12:                # M/D/Y
            m, d = a, b
        else:                       # الافتراضي عندنا: يوم/شهر
            d, m = a, b
    try:
        v = dt.date(y, m, d)
    except ValueError:
        return None
    if not (2020 <= v.year <= 2040):
        return None
    return v.isoformat()


def parse_qty(s: str):
    """يرجّع رقم لو الخلية رقم صافي، وإلا يرجّع النص كما هو (مثل: '8 + 1 عينة')"""
    s = (s or "").translate(AR_DIGITS).strip()
    if not s:
        return None
    try:
        n = float(s.replace(",", ""))
        return int(n) if n.is_integer() else n
    except ValueError:
        return s


def parse_orders(rows):
    out = []
    for idx, row in enumerate(rows[HEADER_ROWS:], start=HEADER_ROWS + 1):
        invoice = cell(row, COL["invoice_no"])
        brand   = cell(row, COL["brand"])
        if not invoice and not brand:
            continue                       # صف فاضي أو صف المجاميع
        if invoice in ("-", "—", "--", "---"):
            invoice = ""
        products = {}
        for j, name in enumerate(PRODUCT_COLS):
            q = parse_qty(cell(row, COL["products_start"] + j))
            if q not in (None, 0, "0"):
                products[name] = q
        out.append({
            "sheet_row":     idx,
            "invoice_no":    invoice,
            "transfer_date": parse_date(cell(row, COL["transfer_date"])),
            "brand":         brand,
            "file_no":       cell(row, COL["file_no"]),
            "order_type":    cell(row, COL["order_type"]),
            "approval_date": parse_date(cell(row, COL["approval_date"])),
            "products":      products,
            "total_qty":     _num_or_none(cell(row, COL["total_qty"])),
            "status":        _norm_status(cell(row, COL["status"])),
            "delivery_date": parse_date(cell(row, COL["delivery_date"])),
            "meters":        cell(row, COL["meters"]),
            "printer":       cell(row, COL["printer"]),
            "sewn_qty":      cell(row, COL["sewn_qty"]),
            "ready_to_ship": cell(row, COL["ready_to_ship"]),
            "executed":      cell(row, COL["executed"]),
            "cs_notes":      cell(row, COL["cs_notes"]),
            "notes":         cell(row, COL["notes"]),
            "raw":           {str(i): v for i, v in enumerate(row) if v.strip()},
        })
    return out


def _num_or_none(s):
    v = parse_qty(s)
    return v if isinstance(v, (int, float)) else None


def _norm_status(s: str):
    return re.sub(r"\s+", " ", (s or "")).strip()


def parse_customers(rows):
    out = []
    for row in rows[1:]:                   # الصف الأول عناوين: اسم العميل | الجوال
        name  = cell(row, 0)
        phone = cell(row, 1).translate(AR_DIGITS)
        if name and re.sub(r"\D", "", phone):
            out.append({"name": name, "phone": phone})
    return out


def sb_post(path, body):
    req = urllib.request.Request(
        f"{SB_URL}{path}", data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"},
        method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.status


def main():
    try:
        orders = parse_orders(fetch_csv(ORDERS_GID))
        customers = parse_customers(fetch_csv(CUSTOMERS_GID)) if CUSTOMERS_GID else []
        if len(orders) < 5:
            raise RuntimeError(f"عدد الطلبات المقروء صغير جداً ({len(orders)}) — توقفت حتى لا أمسح القاعدة")
        sb_post("/rest/v1/rpc/replace_sheet_data", {"p_orders": orders, "p_customers": customers})
        print(f"✓ تمت المزامنة: {len(orders)} طلب، {len(customers)} عميل")
    except Exception as e:
        msg = str(e)[:500]
        print("✗ فشلت المزامنة:", msg, file=sys.stderr)
        try:
            sb_post("/rest/v1/sync_log", {"ok": False, "message": msg})
        except Exception:
            pass
        sys.exit(1)


if __name__ == "__main__":
    main()
