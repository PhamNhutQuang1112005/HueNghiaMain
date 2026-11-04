import { useMemo, useState } from "react"

type PageId =
  | "overview"
  | "cargo"
  | "manifests"
  | "incoming"
  | "delivery"
  | "unreceived"
  | "cod"
  | "returns"
  | "shifts"

type IconName =
  | "alert"
  | "arrow"
  | "banknote"
  | "box"
  | "calendar"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "download"
  | "filter"
  | "grid"
  | "home"
  | "map"
  | "menu"
  | "more"
  | "package"
  | "plus"
  | "qr"
  | "receipt"
  | "rotate"
  | "search"
  | "settings"
  | "truck"
  | "user"
  | "wallet"

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    alert: (
      <>
        <path d="M10.3 3.8 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    banknote: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 9h.01M18 15h.01" />
      </>
    ),
    box: (
      <>
        <path d="m21 8-9 5-9-5" />
        <path d="m3.3 7 8.7-5 8.7 5v10L12 22l-8.7-5Z" />
        <path d="M12 13v9" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    download: (
      <>
        <path d="M12 3v12m0 0 5-5m-5 5-5-5" />
        <path d="M5 21h14" />
      </>
    ),
    filter: <path d="M4 5h16l-6 7v5l-4 2v-7Z" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10M9 21v-7h6v7" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    package: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" />
        <path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v9" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    qr: (
      <>
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="15" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <path d="M15 15h2v2h-2zM19 15h2v6h-2M15 19h2v2h-2" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </>
    ),
    rotate: (
      <>
        <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
        <path d="M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16" />
        <path d="M3 21v-5h5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6.2L14.7 3h-4L10.4 6A7 7 0 0 0 8.8 7L6.4 6 4.5 9.5 6.5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1A7 7 0 0 0 10.4 18l.3 3h4l.3-3a7 7 0 0 0 1.6-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 0-1Z" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    wallet: (
      <>
        <path d="M3 6a3 3 0 0 1 3-3h12v18H6a3 3 0 0 1-3-3Z" />
        <path d="M3 7h15M14 11h7v6h-7a3 3 0 0 1 0-6Z" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

const shipments = [
  { id: "DH-2819", item: "Máy lạnh Panasonic", kind: "Hàng hóa", detail: "1 kiện · 18 kg", from: "Sài Gòn", to: "An Phú", time: "12:32 · 04/11", sender: "Nguyễn Văn Lâm", receiver: "Trần Thanh Hà", fee: "150.000đ", cod: "—", status: "Chờ chuyển", tone: "warning" },
  { id: "DH-7182", item: "Máy lạnh Daikin", kind: "Hàng hóa", detail: "1 kiện · 22 kg", from: "Kinh Dương Vương", to: "Châu Đốc", time: "12:29 · 04/11", sender: "Lê Minh Tuấn", receiver: "Nguyễn Mỹ Duyên", fee: "150.000đ", cod: "1.230.000đ", status: "Đã vào phơi", tone: "info" },
  { id: "DH-2631", item: "Tiền mặt", kind: "Tiền thường", detail: "5.000.000đ", from: "Sài Gòn", to: "Kinh Dương Vương", time: "12:18 · 04/11", sender: "Trần Văn Hải", receiver: "Phạm Ngọc An", fee: "50.000đ", cod: "—", status: "Chờ chuyển", tone: "warning" },
  { id: "DH-7699", item: "Máy lạnh Toshiba", kind: "Hàng hóa", detail: "1 kiện · 16 kg", from: "Kinh Dương Vương", to: "Long Xuyên", time: "12:08 · 04/11", sender: "Võ Thanh Tùng", receiver: "Lê Thu Trang", fee: "120.000đ", cod: "—", status: "Chờ chuyển", tone: "warning" },
  { id: "DH-4920", item: "Hồ sơ tài liệu", kind: "Hàng hóa", detail: "1 túi · 2 kg", from: "An Phú", to: "Sài Gòn", time: "11:45 · 04/11", sender: "Phạm Minh Tú", receiver: "Lê Thu Trang", fee: "85.000đ", cod: "—", status: "Đã vào phơi", tone: "info" },
  { id: "DH-1084", item: "Baga xe khách", kind: "Baga", detail: "2 kiện · 34 kg", from: "Châu Đốc", to: "Bến xe Miền Tây", time: "10:52 · 04/11", sender: "Nhà xe HN", receiver: "Trạm Sài Gòn", fee: "220.000đ", cod: "—", status: "Quá hạn", tone: "danger" },
]

const manifests = [
  { id: "PH-241104-08", plate: "67B-018.62", route: "Sài Gòn → Châu Đốc", driver: "Trần Quốc Dũng", helper: "Võ Hoàng Nam", departure: "14:30 hôm nay", count: 18, status: "Đang xếp hàng", tone: "warning" },
  { id: "PH-241104-07", plate: "67B-014.28", route: "Châu Đốc → Sài Gòn", driver: "Nguyễn Văn Hậu", helper: "Lê Minh Khang", departure: "13:00 hôm nay", count: 24, status: "Đã xuất bến", tone: "info" },
  { id: "PH-241104-06", plate: "51B-312.09", route: "Sài Gòn → Tân Châu", driver: "Phạm Thanh Bình", helper: "Trần Hoài An", departure: "11:45 hôm nay", count: 12, status: "Đã xuất bến", tone: "info" },
  { id: "PH-241104-05", plate: "67B-022.16", route: "Long Xuyên → Sài Gòn", driver: "Lý Minh Trí", helper: "Ngô Quốc Vinh", departure: "09:30 hôm nay", count: 31, status: "Đã nhận xe", tone: "success" },
]

const deliveryRows = [
  { id: "DH-8312", item: "Thùng linh kiện", trip: "67B-022.16", receiver: "Hoàng Thanh Phúc", phone: "0908 234 118", station: "Long Xuyên", amount: "780.000đ", status: "Chờ giao", tone: "warning" },
  { id: "DH-6208", item: "Máy lọc nước", trip: "67B-022.16", receiver: "Nguyễn Kim Anh", phone: "0939 112 801", station: "Châu Đốc", amount: "1.250.000đ", status: "Đang giao", tone: "info" },
  { id: "DH-5914", item: "Hồ sơ", trip: "51B-312.09", receiver: "Trần Quang Minh", phone: "0917 440 621", station: "Tân Châu", amount: "0đ", status: "Đã giao", tone: "success" },
  { id: "DH-4721", item: "Phụ tùng xe", trip: "67B-014.28", receiver: "Lâm Hoàng Phát", phone: "0982 008 115", station: "An Phú", amount: "2.400.000đ", status: "Hẹn giao lại", tone: "purple" },
  { id: "DH-3077", item: "2 kiện hàng mẫu", trip: "67B-014.28", receiver: "Võ Minh Thư", phone: "0907 662 410", station: "Tri Tôn", amount: "350.000đ", status: "Giao thất bại", tone: "danger" },
]

const codRows = [
  { id: "COD-1104-18", route: "Châu Đốc → Sài Gòn", station: "Châu Đốc", orders: 12, required: "18.450.000đ", transferred: "18.450.000đ", status: "Đã đối soát", tone: "success" },
  { id: "COD-1104-17", route: "Long Xuyên → Sài Gòn", station: "Long Xuyên", orders: 8, required: "12.800.000đ", transferred: "10.000.000đ", status: "Chuyển thiếu", tone: "danger" },
  { id: "COD-1104-16", route: "Sài Gòn → An Giang", station: "Sài Gòn", orders: 17, required: "24.320.000đ", transferred: "—", status: "Chờ chuyển tiền", tone: "warning" },
  { id: "COD-1104-15", route: "Tân Châu → Sài Gòn", station: "Tân Châu", orders: 6, required: "7.690.000đ", transferred: "7.690.000đ", status: "Chờ đối soát", tone: "info" },
]

const returns = [
  { id: "DH-3077", item: "2 kiện hàng mẫu", route: "Sài Gòn → Tri Tôn", person: "Võ Minh Thư", reason: "Khách từ chối nhận", time: "10:24 · 04/11", trip: "67B-014.28" },
  { id: "DH-1885", item: "Máy bơm nước", route: "Châu Đốc → Sài Gòn", person: "Nguyễn Đức Toàn", reason: "Sai thông tin người nhận", time: "16:40 · 03/11", trip: "67B-018.62" },
  { id: "DH-0924", item: "Thùng thực phẩm khô", route: "Long Xuyên → Sài Gòn", person: "Lê Hoài An", reason: "Quá 3 lần giao không thành công", time: "09:12 · 03/11", trip: "51B-312.09" },
]

const shifts = [
  { id: "CA-1104-01", staff: "Nguyễn Thị Linh", code: "NV-0933", station: "Sài Gòn", time: "06:00 — 14:00", orders: 48, collected: "12.850.000đ", submitted: "12.850.000đ", status: "Đã giao ca", tone: "success" },
  { id: "CA-1104-02", staff: "Trần Minh Quang", code: "NV-0883", station: "Châu Đốc", time: "06:00 — Đang mở", orders: 31, collected: "8.420.000đ", submitted: "—", status: "Chưa giao ca", tone: "warning" },
  { id: "CA-1104-03", staff: "Lê Quốc Bảo", code: "NV-0712", station: "Long Xuyên", time: "05:30 — 13:30", orders: 27, collected: "7.980.000đ", submitted: "7.980.000đ", status: "Đã kiểm tra", tone: "info" },
]

const navSections: { label: string; items: { id: PageId; label: string; icon: IconName; badge?: string }[] }[] = [
  { label: "Tổng quan", items: [{ id: "overview", label: "Trung tâm điều hành", icon: "grid" }] },
  { label: "Nhận hàng", items: [
    { id: "cargo", label: "Danh sách hàng hóa", icon: "package", badge: "124" },
    { id: "manifests", label: "Phơi xe đi", icon: "truck", badge: "8" },
  ] },
  { label: "Giao hàng", items: [
    { id: "incoming", label: "Chuyến xe đến", icon: "download", badge: "4" },
    { id: "delivery", label: "Danh sách giao hàng", icon: "map", badge: "29" },
    { id: "unreceived", label: "Hàng chưa giao", icon: "alert", badge: "5" },
    { id: "returns", label: "Hàng trả về", icon: "rotate", badge: "3" },
  ] },
  { label: "Tài chính & báo cáo", items: [
    { id: "cod", label: "Đối soát COD", icon: "wallet", badge: "2" },
    { id: "shifts", label: "Kết ca", icon: "receipt" },
  ] },
]

const pageMeta: Record<PageId, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Tổng quan vận hành", title: "Trung tâm điều hành", description: "Theo dõi luồng hàng, chuyến xe và tài chính trong ngày." },
  cargo: { eyebrow: "Nhận hàng", title: "Danh sách hàng hóa", description: "Quản lý đơn nhận, phân loại và chuyển hàng vào phơi xe." },
  manifests: { eyebrow: "Nhận hàng", title: "Phơi xe đi", description: "Tổ chức hàng hóa theo chuyến và kiểm soát xe xuất bến." },
  incoming: { eyebrow: "Giao hàng", title: "Chuyến xe đến", description: "Kiểm nhận phơi xe đến và bàn giao hàng cho trạm." },
  delivery: { eyebrow: "Giao hàng", title: "Danh sách giao hàng", description: "Phân công, cập nhật và theo dõi kết quả giao hàng." },
  unreceived: { eyebrow: "Giao hàng", title: "Hàng chưa giao", description: "Xử lý các đơn tồn, hẹn lại hoặc giao không thành công." },
  cod: { eyebrow: "Tài chính", title: "Đối soát COD", description: "Kiểm soát tiền thu hộ và luồng chuyển tiền giữa các trạm." },
  returns: { eyebrow: "Ngoại lệ", title: "Hàng trả về", description: "Theo dõi lý do trả và chuyển hàng sang phơi phù hợp." },
  shifts: { eyebrow: "Báo cáo", title: "Kết ca", description: "Đối chiếu tiền thu và bàn giao ca của nhân viên." },
}

function Status({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`status status-${tone}`}><i />{children}</span>
}

function StatCard({ icon, label, value, detail, tone = "red" }: { icon: IconName; label: string; value: string; detail: string; tone?: string }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon name={icon} /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("cargo")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState("Tất cả")
  const [selected, setSelected] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [modal, setModal] = useState<"create" | "detail" | null>(null)
  const [detailId, setDetailId] = useState("")
  const [toast, setToast] = useState("")
  const [shiftType, setShiftType] = useState<"receive" | "delivery">("receive")

  const visibleShipments = useMemo(() => shipments.filter((item) => {
    const haystack = `${item.id} ${item.item} ${item.kind} ${item.sender} ${item.receiver} ${item.from} ${item.to}`.toLowerCase()
    const matchesSearch = haystack.includes(search.toLowerCase())
    const matchesTab = tab === "Tất cả" || (tab === "Chờ chuyển" ? item.status === "Chờ chuyển" : item.status !== "Chờ chuyển")
    return matchesSearch && matchesTab
  }), [search, tab])

  const meta = pageMeta[activePage]
  const allNavItems = navSections.flatMap((section) => section.items)
  const activeLabel = allNavItems.find((item) => item.id === activePage)?.label

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(""), 2600)
  }

  function goTo(page: PageId) {
    setActivePage(page)
    setSearch("")
    setSelected([])
    setSidebarOpen(false)
  }

  function openDetail(id: string) {
    setDetailId(id)
    setModal("detail")
  }

  function matchesSearch(row: object) {
    if (!search.trim()) return true
    return Object.values(row).join(" ").toLowerCase().includes(search.trim().toLowerCase())
  }

  function renderCargoTable() {
    return (
      <>
        <div className="list-toolbar">
          <div className="tabs">
            {["Tất cả", "Chờ chuyển", "Đã chuyển"].map((item) => (
              <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
                {item}<span>{item === "Tất cả" ? 124 : item === "Chờ chuyển" ? 38 : 86}</span>
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <button className={`button compact ${filtersOpen ? "primary-soft" : "secondary"}`} onClick={() => setFiltersOpen(!filtersOpen)}>
              <Icon name="filter" /> Bộ lọc <b className="filter-count">2</b>
            </button>
            <button className="icon-button bordered" onClick={() => notify("Đang xuất danh sách hàng hóa")} aria-label="Xuất danh sách"><Icon name="download" /></button>
          </div>
        </div>
        {filtersOpen && <FilterPanel onApply={() => notify("Đã áp dụng bộ lọc")} />}
        {selected.length > 0 && (
          <div className="bulk-bar">
            <span className="bulk-check"><Icon name="check" size={14} /></span>
            <strong>Đã chọn {selected.length} đơn</strong>
            <span className="bulk-spacer" />
            <button onClick={() => setSelected([])}>Bỏ chọn</button>
            <button className="button primary compact" onClick={() => notify(`Đã chuyển ${selected.length} đơn vào phơi`)}>Chuyển vào phơi</button>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th><input type="checkbox" checked={visibleShipments.length > 0 && selected.length === visibleShipments.length} onChange={() => setSelected(selected.length === visibleShipments.length ? [] : visibleShipments.map((x) => x.id))} /></th>
              <th>Mã đơn & hàng hóa</th><th>Tuyến đường</th><th>Người gửi / nhận</th><th>Cước & COD</th><th>Trạng thái</th><th />
            </tr></thead>
            <tbody>
              {visibleShipments.map((row) => (
                <tr key={row.id}>
                  <td><input type="checkbox" checked={selected.includes(row.id)} onChange={() => setSelected(selected.includes(row.id) ? selected.filter((id) => id !== row.id) : [...selected, row.id])} /></td>
                  <td><div className="item-cell"><div className="item-icon"><Icon name={row.kind.includes("Tiền") ? "banknote" : "box"} /></div><div><button className="text-link" onClick={() => openDetail(row.id)}>{row.id}</button><strong>{row.item}</strong><small>{row.kind} · {row.detail}</small></div></div></td>
                  <td><div className="route"><strong>{row.from}</strong><span><i /><Icon name="chevron" size={12} /><i /></span><strong>{row.to}</strong></div><small className="muted">{row.time} · NV Linh</small></td>
                  <td><div className="people"><span><i>G</i>{row.sender}</span><span><i>N</i>{row.receiver}</span></div></td>
                  <td><strong className="money">{row.fee}</strong><small className="muted">COD: {row.cod}</small></td>
                  <td><Status tone={row.tone}>{row.status}</Status></td>
                  <td><button className="icon-button row-more" onClick={() => openDetail(row.id)} aria-label={`Mở ${row.id}`}><Icon name="more" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleShipments.length && <div className="empty"><Icon name="search" size={28} /><strong>Không tìm thấy đơn hàng</strong><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
        </div>
        <Pagination count="124 đơn hàng" />
      </>
    )
  }

  function renderManifestTable(incoming = false) {
    return (
      <div className="data-card">
        <div className="list-toolbar">
          <div className="segmented">
            <button className="active">{incoming ? "Xe chờ kiểm nhận" : "Phơi hôm nay"}</button>
            <button>{incoming ? "Đã nhận xe" : "Sắp xuất bến"}</button>
          </div>
          <button className="button secondary compact" onClick={() => notify("Đã cập nhật dữ liệu")}><Icon name="rotate" /> Làm mới</button>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th><input type="checkbox" /></th><th>Biển số & phơi</th><th>Tuyến đường</th><th>Tài xế / phụ xe</th><th>{incoming ? "Giờ đến" : "Giờ xuất bến"}</th><th>Hàng hóa</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{manifests.filter(matchesSearch).map((row, index) => (
            <tr key={row.id}>
              <td><input type="checkbox" /></td>
              <td><div className="plate"><Icon name="truck" /><div><strong>{row.plate}</strong><button onClick={() => openDetail(row.id)}>{row.id}</button></div></div></td>
              <td><strong>{row.route}</strong><small className="muted">{incoming ? "Bến nhận: Sài Gòn" : "Dự kiến đúng giờ"}</small></td>
              <td><div className="people"><span><i>TX</i>{row.driver}</span><span><i>PX</i>{row.helper}</span></div></td>
              <td><strong>{incoming ? `${8 + index}:15 hôm nay` : row.departure}</strong></td>
              <td><span className="count-chip">{row.count} đơn</span></td>
              <td><Status tone={incoming && index < 2 ? "warning" : row.tone}>{incoming && index < 2 ? "Chờ kiểm nhận" : row.status}</Status></td>
              <td><button className="button secondary compact" onClick={() => notify(incoming ? `Đang kiểm nhận ${row.id}` : `Đang mở ${row.id}`)}>{incoming ? "Kiểm nhận" : "Chi tiết"}</button></td>
            </tr>
          ))}</tbody>
        </table></div>
        <Pagination count="8 phơi hàng" />
      </div>
    )
  }

  function renderDeliveryTable(unreceived = false) {
    const sourceRows = unreceived ? deliveryRows.filter((x) => x.tone === "purple" || x.tone === "danger") : deliveryRows
    const rows = sourceRows.filter(matchesSearch)
    return (
      <div className="data-card">
        <div className="list-toolbar">
          <div className="tabs">
            {["Tất cả", "Chờ giao", "Đang giao", "Đã giao"].map((x, i) => <button key={x} className={i === 0 ? "active" : ""}>{x}<span>{[29, 11, 8, 10][i]}</span></button>)}
          </div>
          <button className="button secondary compact" onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" /> Lọc danh sách</button>
        </div>
        {filtersOpen && <FilterPanel onApply={() => notify("Đã lọc danh sách giao hàng")} />}
        <div className="table-wrap"><table>
          <thead><tr><th><input type="checkbox" /></th><th>Mã đơn & hàng hóa</th><th>Chuyến xe</th><th>Người nhận</th><th>Trạm giao</th><th>COD cần thu</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id}>
              <td><input type="checkbox" /></td>
              <td><div className="item-cell"><div className="item-icon blue"><Icon name="box" /></div><div><button className="text-link" onClick={() => openDetail(row.id)}>{row.id}</button><strong>{row.item}</strong></div></div></td>
              <td><span className="plate-tag">{row.trip}</span></td>
              <td><strong>{row.receiver}</strong><small className="muted">{row.phone}</small></td>
              <td><strong>{row.station}</strong></td>
              <td><strong className="money">{row.amount}</strong></td>
              <td><Status tone={row.tone}>{row.status}</Status></td>
              <td><button className="button secondary compact" onClick={() => notify(`Cập nhật giao hàng ${row.id}`)}>Cập nhật</button></td>
            </tr>
          ))}</tbody>
        </table></div>
        <Pagination count={`${rows.length} đơn hiển thị`} />
      </div>
    )
  }

  function renderCod() {
    return (
      <>
        <div className="stats-grid">
          <StatCard icon="banknote" label="COD cần đối soát" value="63,26tr" detail="43 đơn hàng" tone="blue" />
          <StatCard icon="check" label="Đã chuyển" value="36,14tr" detail="57,1% tổng tiền" tone="green" />
          <StatCard icon="alert" label="Còn phải chuyển" value="27,12tr" detail="2 trạm cần xử lý" tone="red" />
          <StatCard icon="clock" label="Chờ xác nhận" value="4 phiên" detail="Cập nhật 5 phút trước" tone="amber" />
        </div>
        <div className="data-card">
          <div className="list-toolbar"><div className="segmented"><button className="active">Đối soát COD</button><button>Cấn trừ công nợ</button></div><button className="button secondary compact" onClick={() => notify("Đang xuất báo cáo COD")}><Icon name="download" /> Xuất báo cáo</button></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Mã phiên</th><th>Tuyến / trạm</th><th>Số đơn</th><th>Phải chuyển</th><th>Đã chuyển</th><th>Còn lại</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{codRows.filter(matchesSearch).map((row) => {
              const remaining = row.transferred === "—" ? row.required : row.status === "Chuyển thiếu" ? "2.800.000đ" : "0đ"
              return <tr key={row.id}><td><button className="text-link" onClick={() => openDetail(row.id)}>{row.id}</button></td><td><strong>{row.route}</strong><small className="muted">Trạm {row.station}</small></td><td><span className="count-chip">{row.orders} đơn</span></td><td><strong className="money">{row.required}</strong></td><td><strong className="money positive">{row.transferred}</strong></td><td><strong className={remaining !== "0đ" ? "money negative" : "money muted-money"}>{remaining}</strong></td><td><Status tone={row.tone}>{row.status}</Status></td><td><button className="button secondary compact" onClick={() => notify(`Đang xử lý ${row.id}`)}>Xử lý</button></td></tr>
            })}</tbody>
          </table></div>
          <Pagination count="4 phiên đối soát" />
        </div>
      </>
    )
  }

  function renderReturns() {
    return (
      <div className="data-card">
        <div className="list-toolbar"><div><strong className="list-title">Đơn hàng cần xử lý</strong><small className="list-subtitle">Chuyển lại phơi hoặc xác nhận hoàn về người gửi</small></div><button className="button secondary compact" onClick={() => notify("Đã làm mới dữ liệu")}><Icon name="rotate" /> Làm mới</button></div>
        <div className="table-wrap"><table>
          <thead><tr><th><input type="checkbox" /></th><th>Mã đơn & hàng hóa</th><th>Tuyến đường</th><th>Người nhận</th><th>Lý do trả</th><th>Phơi trả về</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{returns.filter(matchesSearch).map((row) => <tr key={row.id}>
            <td><input type="checkbox" /></td><td><div className="item-cell"><div className="item-icon danger"><Icon name="rotate" /></div><div><button className="text-link" onClick={() => openDetail(row.id)}>{row.id}</button><strong>{row.item}</strong></div></div></td>
            <td><strong>{row.route}</strong><small className="muted">{row.time}</small></td><td><strong>{row.person}</strong></td><td><div className="reason"><Icon name="alert" size={15} /><span>{row.reason}</span></div></td><td><span className="plate-tag">{row.trip}</span></td><td><Status tone="danger">Hàng trả về</Status></td><td><button className="button secondary compact" onClick={() => notify(`Chọn phơi mới cho ${row.id}`)}>Chuyển phơi</button></td>
          </tr>)}</tbody>
        </table></div>
      </div>
    )
  }

  function renderShifts() {
    return (
      <>
        <div className="shift-switch">
          <button className={shiftType === "receive" ? "active" : ""} onClick={() => setShiftType("receive")}><Icon name="download" /> Kết ca nhận hàng</button>
          <button className={shiftType === "delivery" ? "active" : ""} onClick={() => setShiftType("delivery")}><Icon name="truck" /> Kết ca giao hàng</button>
        </div>
        <div className="stats-grid three">
          <StatCard icon="banknote" label={shiftType === "receive" ? "Tổng cước đã thu" : "Tiền giao hàng đã thu"} value={shiftType === "receive" ? "29,25tr" : "41,80tr"} detail="Trong các ca hôm nay" tone="green" />
          <StatCard icon="calendar" label="Tổng số ca" value="3 ca" detail="1 ca đang mở" tone="blue" />
          <StatCard icon="check" label="Đã bàn giao" value="2 / 3" detail="Còn 1 ca cần xử lý" tone="amber" />
        </div>
        <div className="data-card">
          <div className="list-toolbar"><div><strong className="list-title">{shiftType === "receive" ? "Ca thu ngân nhận hàng" : "Ca nhân viên giao hàng"}</strong><small className="list-subtitle">Đối chiếu số tiền hệ thống và số tiền thực nộp</small></div><button className="button primary compact" onClick={() => notify("Đã mở ca làm việc mới")}><Icon name="plus" /> Mở ca mới</button></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Nhân viên & mã ca</th><th>Trạm</th><th>Thời gian ca</th><th>Đơn xử lý</th><th>Hệ thống ghi nhận</th><th>Thực nộp</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{shifts.filter(matchesSearch).map((row) => <tr key={row.id}><td><div className="person-main"><span>{row.staff.split(" ").slice(-2).map(x => x[0]).join("")}</span><div><strong>{row.staff}</strong><small>{row.code} · {row.id}</small></div></div></td><td><strong>{row.station}</strong></td><td><strong>{row.time}</strong></td><td><span className="count-chip">{row.orders} đơn</span></td><td><strong className="money">{row.collected}</strong></td><td><strong className="money positive">{row.submitted}</strong></td><td><Status tone={row.tone}>{row.status}</Status></td><td><button className="button secondary compact" onClick={() => openDetail(row.id)}>Chi tiết</button></td></tr>)}</tbody>
          </table></div>
        </div>
      </>
    )
  }

  function renderOverview() {
    return (
      <>
        <div className="overview-banner">
          <div><span className="live-dot" /> Vận hành hôm nay</div>
          <strong>Thứ Hai, 04 tháng 11</strong>
          <p>Hệ thống đang theo dõi 124 đơn hàng trên 8 chuyến xe.</p>
        </div>
        <div className="stats-grid">
          <StatCard icon="package" label="Đơn nhận hôm nay" value="124" detail="+12,5% so với hôm qua" tone="red" />
          <StatCard icon="truck" label="Chuyến đang chạy" value="8" detail="4 xe sắp vào bến" tone="blue" />
          <StatCard icon="map" label="Đơn chờ giao" value="29" detail="5 đơn cần chú ý" tone="amber" />
          <StatCard icon="banknote" label="COD đang giữ" value="63,26tr" detail="2 phiên cần xử lý" tone="green" />
        </div>
        <div className="overview-grid">
          <section className="panel">
            <div className="panel-head"><div><strong>Luồng vận hành</strong><small>Tình hình xử lý theo từng công đoạn</small></div><button onClick={() => goTo("cargo")}>Xem tất cả <Icon name="arrow" size={14} /></button></div>
            <div className="flow-list">
              {[
                ["package", "Chờ xếp phơi", "38", "12 đơn cần xử lý trước 14:00", "red"],
                ["truck", "Đang vận chuyển", "72", "Trên 8 chuyến xe", "blue"],
                ["download", "Chờ kiểm nhận", "18", "4 xe sắp vào bến", "amber"],
                ["map", "Đang giao hàng", "29", "10 đơn đã giao thành công", "green"],
              ].map(([icon, label, value, detail, tone]) => <button key={label} className="flow-item" onClick={() => goTo(label === "Chờ xếp phơi" ? "cargo" : label === "Đang giao hàng" ? "delivery" : "manifests")}><span className={`flow-icon ${tone}`}><Icon name={icon as IconName} /></span><span><strong>{label}</strong><small>{detail}</small></span><b>{value}</b><Icon name="chevron" size={14} /></button>)}
            </div>
          </section>
          <section className="panel">
            <div className="panel-head"><div><strong>Cần xử lý</strong><small>Các việc ưu tiên trong ca</small></div><span className="attention-count">7 việc</span></div>
            <div className="task-list">
              <button onClick={() => goTo("cargo")}><span className="task-level high" /><div><strong>6 đơn quá 3 ngày chưa xếp phơi</strong><small>Cần nhập lý do hoặc chuyển phơi</small></div><Icon name="chevron" /></button>
              <button onClick={() => goTo("cod")}><span className="task-level medium" /><div><strong>2 phiên COD chưa đủ tiền</strong><small>Còn thiếu 2.800.000đ</small></div><Icon name="chevron" /></button>
              <button onClick={() => goTo("returns")}><span className="task-level low" /><div><strong>3 đơn hàng trả về</strong><small>Chưa chọn phương án xử lý</small></div><Icon name="chevron" /></button>
            </div>
          </section>
        </div>
        <section className="panel recent-panel">
          <div className="panel-head"><div><strong>Hoạt động gần đây</strong><small>Cập nhật trực tiếp từ các trạm</small></div><button onClick={() => notify("Đã cập nhật hoạt động")}><Icon name="rotate" size={14} /> Làm mới</button></div>
          <div className="activity-row"><span className="activity-icon success"><Icon name="check" /></span><div><strong>DH-5914 đã giao thành công</strong><small>NV Lê Quốc Bảo · Trạm Tân Châu</small></div><time>2 phút trước</time></div>
          <div className="activity-row"><span className="activity-icon blue"><Icon name="truck" /></span><div><strong>Phơi PH-241104-07 đã xuất bến</strong><small>67B-014.28 · Châu Đốc → Sài Gòn</small></div><time>18 phút trước</time></div>
          <div className="activity-row"><span className="activity-icon red"><Icon name="banknote" /></span><div><strong>Đã tạo phiên COD COD-1104-18</strong><small>12 đơn · 18.450.000đ</small></div><time>31 phút trước</time></div>
        </section>
      </>
    )
  }

  function renderContent() {
    if (activePage === "overview") return renderOverview()
    if (activePage === "cargo") return <><div className="stats-grid"><StatCard icon="package" label="Tổng đơn hôm nay" value="124" detail="+12,5% so với hôm qua" /><StatCard icon="clock" label="Chờ chuyển" value="38" detail="6 đơn đang quá hạn" tone="amber" /><StatCard icon="truck" label="Đã vào phơi" value="86" detail="Trên 8 chuyến xe" tone="blue" /><StatCard icon="banknote" label="Cước đã thu" value="18,6tr" detail="+8,2% so với hôm qua" tone="green" /></div><div className="data-card">{renderCargoTable()}</div></>
    if (activePage === "manifests") return <><div className="stats-grid three"><StatCard icon="truck" label="Phơi hôm nay" value="8" detail="4 phơi sắp xuất bến" /><StatCard icon="package" label="Đơn đã xếp" value="86" detail="72,4% công suất" tone="blue" /><StatCard icon="clock" label="Chờ xếp phơi" value="38" detail="Cần xử lý trước 14:00" tone="amber" /></div>{renderManifestTable()}</>
    if (activePage === "incoming") return <><div className="stats-grid three"><StatCard icon="download" label="Xe đến hôm nay" value="6" detail="4 xe đang chờ nhận" tone="blue" /><StatCard icon="package" label="Hàng cần kiểm" value="74" detail="18 đơn chưa quét" tone="amber" /><StatCard icon="check" label="Đã kiểm nhận" value="56" detail="Không có chênh lệch" tone="green" /></div>{renderManifestTable(true)}</>
    if (activePage === "delivery") return <><div className="stats-grid"><StatCard icon="map" label="Tổng đơn giao" value="29" detail="Trong ngày hôm nay" /><StatCard icon="clock" label="Chờ giao" value="11" detail="4 đơn ưu tiên" tone="amber" /><StatCard icon="truck" label="Đang giao" value="8" detail="3 nhân viên đang chạy" tone="blue" /><StatCard icon="check" label="Đã giao" value="10" detail="Tỷ lệ thành công 83%" tone="green" /></div>{renderDeliveryTable()}</>
    if (activePage === "unreceived") return <><div className="notice danger-notice"><Icon name="alert" /><div><strong>5 đơn hàng cần phương án xử lý</strong><span>Kiểm tra lý do, hẹn lại ngày giao hoặc chuyển hoàn.</span></div><button onClick={() => notify("Đã mở quy trình xử lý hàng tồn")}>Xử lý hàng loạt</button></div>{renderDeliveryTable(true)}</>
    if (activePage === "cod") return renderCod()
    if (activePage === "returns") return <><div className="stats-grid three"><StatCard icon="rotate" label="Tổng hàng trả về" value="3" detail="Trong 48 giờ gần nhất" /><StatCard icon="clock" label="Chờ xử lý" value="3" detail="Cần chọn phơi mới" tone="amber" /><StatCard icon="banknote" label="COD liên quan" value="2,75tr" detail="Đang tạm giữ" tone="blue" /></div>{renderReturns()}</>
    return renderShifts()
  }

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Icon name="truck" size={22} /></div>
          <div className="brand-copy"><strong>HUỆ NGHĨA</strong><span>CARGO OPERATIONS</span></div>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu"><Icon name="close" /></button>
        </div>
        <div className="station-card">
          <div className="station-avatar">SG</div>
          <div><small>Trạm đang làm việc</small><strong>Sài Gòn</strong></div>
          <Icon name="chevron" size={14} />
        </div>
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div className="nav-section" key={section.label}>
              <p>{section.label}</p>
              {section.items.map((item) => <button key={item.id} title={item.label} className={activePage === item.id ? "active" : ""} onClick={() => goTo(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.badge && <b>{item.badge}</b>}</button>)}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => notify("Đã mở cài đặt")}><Icon name="settings" /><span>Cài đặt hệ thống</span></button>
          <div className="sidebar-user"><span>AN</span><div><strong>Nguyễn Hoàng An</strong><small>Quản trị viên</small></div><Icon name="more" /></div>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu" />}

      <main>
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Mở menu"><Icon name="menu" /></button>
          <button className="icon-button collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Thu gọn menu"><Icon name="menu" /></button>
          <div className="breadcrumbs"><Icon name="home" size={14} /><span>Điều hành hàng hóa</span><Icon name="chevron" size={11} /><strong>{activeLabel}</strong></div>
          <label className={`global-search ${activePage === "overview" ? "is-disabled" : ""}`}><Icon name="search" /><input disabled={activePage === "overview"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={activePage === "overview" ? "Chọn một nghiệp vụ để tìm kiếm" : activePage === "cargo" ? "Tìm mã đơn, hàng hóa, người gửi..." : `Tìm trong ${activeLabel?.toLowerCase()}...`} /><kbd>⌘ K</kbd></label>
          <button className="quick-scan" onClick={() => notify("Đã bật chế độ quét mã")}><Icon name="qr" /><span>Quét mã</span></button>
          <button className="notification-button" onClick={() => notify("Bạn có 3 thông báo mới")} aria-label="Thông báo"><Icon name="alert" /><i>3</i></button>
          <button className="top-profile"><span>AN</span><div><strong>Admin</strong><small>Ca sáng</small></div><Icon name="chevron" size={13} /></button>
        </header>

        <div className="content">
          <section className="page-heading">
            <div><div className="eyebrow">{meta.eyebrow}</div><h1>{meta.title}</h1><p>{meta.description}</p></div>
            <div className="heading-actions">
              {activePage === "cargo" && <><button className="button secondary" onClick={() => notify("Đã bật chế độ quét chuyển phơi")}><Icon name="qr" /> Quét chuyển phơi</button><button className="button primary" onClick={() => setModal("create")}><Icon name="plus" /> Tạo đơn hàng</button></>}
              {activePage === "manifests" && <button className="button primary" onClick={() => notify("Đã mở biểu mẫu tạo phơi")}><Icon name="plus" /> Tạo phơi mới</button>}
              {activePage === "incoming" && <button className="button primary" onClick={() => notify("Đã bật quét kiểm nhận")}><Icon name="qr" /> Quét kiểm nhận</button>}
              {activePage === "delivery" && <button className="button primary" onClick={() => notify("Đã bật quét giao hàng")}><Icon name="qr" /> Quét giao hàng</button>}
              {["cod", "shifts"].includes(activePage) && <button className="button secondary" onClick={() => notify("Đang xuất báo cáo")}><Icon name="download" /> Xuất báo cáo</button>}
            </div>
          </section>
          {renderContent()}
        </div>
      </main>

      {modal === "create" && <CreateOrderModal onClose={() => setModal(null)} onSave={() => { setModal(null); notify("Đã tạo đơn hàng DH-8351") }} />}
      {modal === "detail" && <DetailDrawer id={detailId} onClose={() => setModal(null)} onAction={(message) => notify(message)} />}
      {toast && <div className="toast"><span><Icon name="check" size={14} /></span>{toast}</div>}
    </div>
  )
}

function FilterPanel({ onApply }: { onApply: () => void }) {
  return <div className="filters">
    <label><span>Ngày tạo đơn</span><div className="field"><Icon name="calendar" /><input type="date" defaultValue="2026-11-04" /></div></label>
    <label><span>Hướng đi</span><select><option>Tất cả hướng</option><option>Sài Gòn → An Giang</option><option>An Giang → Sài Gòn</option><option>An Giang → Bình Dương</option></select></label>
    <label><span>Trạm gửi</span><select><option>Tất cả trạm gửi</option><option>Sài Gòn</option><option>Châu Đốc</option><option>Long Xuyên</option></select></label>
    <label><span>Trạm nhận</span><select><option>Tất cả trạm nhận</option><option>Châu Đốc</option><option>An Phú</option><option>Tân Châu</option></select></label>
    <button className="button primary apply-filter" onClick={onApply}><Icon name="search" /> Áp dụng</button>
  </div>
}

function Pagination({ count }: { count: string }) {
  return <div className="pagination"><span>Đang hiển thị 1–10 trong {count}</span><div><button disabled><Icon name="chevron" size={13} /></button><button className="active">1</button><button>2</button><button>3</button><button><Icon name="chevron" size={13} /></button></div></div>
}

function CreateOrderModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [category, setCategory] = useState("Hàng hóa")
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal-card create-modal">
      <header><div><span className="modal-eyebrow">ĐƠN NHẬN HÀNG MỚI</span><h2>Tạo đơn hàng</h2><p>Nhập thông tin hàng hóa, lộ trình và người liên hệ.</p></div><button className="icon-button" onClick={onClose}><Icon name="close" /></button></header>
      <div className="category-tabs">{["Hàng hóa", "Tiền thường", "Bạn hàng", "Tiền nóng", "Baga"].map((x) => <button key={x} className={category === x ? "active" : ""} onClick={() => setCategory(x)}>{x}</button>)}</div>
      <div className="modal-body">
        <div className="form-section"><div className="form-section-title"><span>1</span><div><strong>Hàng hóa & lộ trình</strong><small>Thông tin kiện hàng và điểm giao nhận</small></div></div>
          <div className="form-grid three-col"><label className="span-2"><span>Tên hàng hóa</span><input placeholder="Ví dụ: Máy lạnh Panasonic 2HP" /></label><label><span>Số lượng</span><div className="joined-fields"><input type="number" defaultValue="1" /><select><option>Kiện</option><option>Thùng</option><option>Kg</option></select></div></label><label><span>Hướng đi</span><select><option>Sài Gòn → An Giang</option><option>An Giang → Sài Gòn</option></select></label><label><span>Trạm gửi</span><select><option>Sài Gòn</option><option>Bến xe Miền Tây</option></select></label><label><span>Trạm nhận</span><select><option>Châu Đốc</option><option>An Phú</option><option>Long Xuyên</option></select></label><label><span>Cước phí</span><div className="money-input"><input defaultValue="150.000" /><b>VNĐ</b></div></label><label className="span-2"><span>Ghi chú hàng hóa</span><input placeholder="Thông tin cần lưu ý khi vận chuyển..." /></label></div>
        </div>
        <div className="form-section"><div className="form-section-title"><span>2</span><div><strong>Người gửi & người nhận</strong><small>Thông tin liên hệ hai đầu</small></div></div>
          <div className="form-grid four-col"><label><span>Tên người gửi</span><input placeholder="Nguyễn Văn A" /></label><label><span>Số điện thoại</span><input placeholder="0901 234 567" /></label><label><span>Tên người nhận</span><input placeholder="Trần Thị B" /></label><label><span>Số điện thoại</span><input placeholder="0909 876 543" /></label></div>
        </div>
        <div className="form-section"><div className="form-section-title"><span>3</span><div><strong>Thanh toán & dịch vụ</strong><small>Trạng thái cước và dịch vụ đi kèm</small></div></div>
          <div className="form-grid three-col"><label><span>Trạng thái cước</span><select><option>Đã thu cước</option><option>Chưa thu cước</option><option>Không thu phí</option></select></label><label><span>Hình thức thanh toán</span><select><option>Tiền mặt</option><option>Chuyển khoản</option></select></label><label><span>Thu hộ COD</span><div className="money-input"><input placeholder="0" /><b>VNĐ</b></div></label></div>
          <div className="service-row"><label><input type="checkbox" /> Lấy hàng tận nơi</label><label><input type="checkbox" /> Giao hàng tận nơi</label><label><input type="checkbox" /> Hàng dễ vỡ</label></div>
        </div>
      </div>
      <footer><button className="button secondary" onClick={onClose}>Hủy bỏ</button><button className="button primary" onClick={onSave}><Icon name="check" /> Tạo đơn hàng</button></footer>
    </section>
  </div>
}

function DetailDrawer({ id, onClose, onAction }: { id: string; onClose: () => void; onAction: (message: string) => void }) {
  const shipment = shipments.find((x) => x.id === id)
  return <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <aside className="detail-drawer">
      <header><div><span className="modal-eyebrow">CHI TIẾT HỒ SƠ</span><h2>{id}</h2></div><button className="icon-button" onClick={onClose}><Icon name="close" /></button></header>
      <div className="drawer-body">
        <div className="detail-hero"><div className="detail-hero-icon"><Icon name={id.startsWith("PH") ? "truck" : id.startsWith("COD") ? "banknote" : "box"} size={25} /></div><div><strong>{shipment?.item || (id.startsWith("PH") ? "Phơi vận chuyển hàng hóa" : id.startsWith("CA") ? "Báo cáo kết ca" : "Phiên đối soát COD")}</strong><span>{shipment?.detail || "Cập nhật gần nhất hôm nay"}</span></div><Status tone={shipment?.tone || "info"}>{shipment?.status || "Đang xử lý"}</Status></div>
        <section className="detail-section"><h3>Thông tin chung</h3><div className="detail-grid"><div><span>Mã hồ sơ</span><strong>{id}</strong></div><div><span>Ngày tạo</span><strong>04/11/2026 · 12:32</strong></div><div><span>Nhân viên phụ trách</span><strong>Nguyễn Thị Linh</strong></div><div><span>Trạm xử lý</span><strong>Sài Gòn</strong></div></div></section>
        <section className="detail-section"><h3>Lộ trình</h3><div className="route-card"><span className="route-point start" /><div><small>Điểm gửi</small><strong>{shipment?.from || "Sài Gòn"}</strong><span>04/11 · 12:32</span></div><i /><span className="route-point end" /><div><small>Điểm nhận</small><strong>{shipment?.to || "Châu Đốc"}</strong><span>Dự kiến 18:30</span></div></div></section>
        <section className="detail-section"><h3>Người gửi & người nhận</h3><div className="contact-card"><div className="contact-avatar">G</div><div><small>Người gửi</small><strong>{shipment?.sender || "Nguyễn Văn Lâm"}</strong><span>0901 234 567</span></div></div><div className="contact-card"><div className="contact-avatar receiver">N</div><div><small>Người nhận</small><strong>{shipment?.receiver || "Trần Thanh Hà"}</strong><span>0909 876 543</span></div></div></section>
        <section className="detail-section"><h3>Thanh toán</h3><div className="payment-summary"><div><span>Cước vận chuyển</span><strong>{shipment?.fee || "150.000đ"}</strong></div><div><span>Thu hộ COD</span><strong>{shipment?.cod || "0đ"}</strong></div><div className="total"><span>Tổng cần thu</span><strong>{shipment?.cod !== "—" ? shipment?.cod : shipment?.fee || "150.000đ"}</strong></div></div></section>
      </div>
      <footer><button className="button secondary" onClick={() => onAction(`Đang in ${id}`)}><Icon name="download" /> In chứng từ</button><button className="button primary" onClick={() => onAction(`Đã mở chỉnh sửa ${id}`)}>Chỉnh sửa</button></footer>
    </aside>
  </div>
}
