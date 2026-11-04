import { useMemo, useState } from "react"

type IconName = "box" | "calendar" | "chevron" | "clock" | "close" | "download" | "filter" | "grid" | "home" | "menu" | "more" | "package" | "plus" | "qr" | "search" | "settings" | "truck" | "users"

function Icon({ name, size = 18 }: { name: IconName size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
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
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a5 5 0 0 1 10 0v2M16 5a3 3 0 0 1 0 6M16 14a5 5 0 0 1 5 5v1" />
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
  {
    id: "DH-2819",
    item: "Máy lạnh Panasonic",
    detail: "1 kiện · 18 kg",
    from: "Sài Gòn",
    to: "Trạm An Phú",
    time: "12:32 · 04/11",
    sender: "Nguyễn Văn Lâm",
    receiver: "Trần Thanh Hà",
    fee: "150.000đ",
    cod: "0đ",
    status: "Chưa chuyển",
    tone: "waiting",
  },
  {
    id: "DH-7182",
    item: "Máy lạnh Daikin",
    detail: "1 kiện · 22 kg",
    from: "508 Kinh Dương Vương",
    to: "Trạm An Giang",
    time: "12:29 · 04/11",
    sender: "Nguyễn Văn Lâm",
    receiver: "Trần Thanh Hà",
    fee: "150.000đ",
    cod: "123.000đ",
    status: "Đã chuyển",
    tone: "moving",
  },
  {
    id: "DH-2631",
    item: "Tiền mặt",
    detail: "5.000.000đ",
    from: "Sài Gòn",
    to: "508 Kinh Dương Vương",
    time: "12:18 · 04/11",
    sender: "Nguyễn Văn Lâm",
    receiver: "Trần Thanh Hà",
    fee: "150.000đ",
    cod: "0đ",
    status: "Chưa chuyển",
    tone: "waiting",
  },
  {
    id: "DH-7699",
    item: "Máy lạnh Toshiba",
    detail: "1 kiện · 16 kg",
    from: "508 Kinh Dương Vương",
    to: "Trạm An Giang",
    time: "12:18 · 04/11",
    sender: "Nguyễn Văn Lâm",
    receiver: "Trần Thanh Hà",
    fee: "120.000đ",
    cod: "0đ",
    status: "Chưa chuyển",
    tone: "waiting",
  },
  {
    id: "DH-4920",
    item: "Hồ sơ tài liệu",
    detail: "1 kiện · 2 kg",
    from: "Trạm An Phú",
    to: "Sài Gòn",
    time: "11:45 · 04/11",
    sender: "Phạm Minh Tú",
    receiver: "Lê Thu Trang",
    fee: "85.000đ",
    cod: "0đ",
    status: "Đã chuyển",
    tone: "moving",
  },
]

const navGroups = [
  { label: "Tổng quan", icon: "grid" as IconName },
  {
    label: "Nhận hàng",
    icon: "package" as IconName,
    children: ["Danh sách hàng hóa", "Tạo đơn nhận", "Danh sách chuyến xe"],
  },
  {
    label: "Giao hàng",
    icon: "truck" as IconName,
    children: ["Danh sách giao hàng", "Hàng chưa giao", "Đối soát COD"],
  },
  { label: "Đối tác", icon: "users" as IconName },
  { label: "Báo cáo", icon: "calendar" as IconName },
]

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState("Tất cả")
  const [selected, setSelected] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [toast, setToast] = useState("")

  const visible = useMemo(
    () =>
      shipments.filter((item) => {
        const matchesSearch =
          `${item.id} ${item.item} ${item.sender} ${item.receiver}`
            .toLowerCase()
            .includes(search.toLowerCase())
        return matchesSearch && (tab === "Tất cả" || item.status === tab)
      }),
    [search, tab],
  )

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(""), 2400)
  }

  function toggleAll() {
    setSelected(
      selected.length === visible.length ? [] : visible.map((item) => item.id),
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Icon name="truck" size={22} />
          </div>
          <div>
            <strong>HUẾ NGHĨA</strong>
            <span>EXPRESS</span>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="workspace">
          <div className="workspace-icon">HN</div>
          <div>
            <small>Không gian làm việc</small>
            <strong>Huế Nghĩa Express</strong>
          </div>
          <Icon name="chevron" size={15} />
        </div>
        <p className="nav-label">Điều hành</p>
        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <button
                className={`nav-item ${
                  group.label === "Nhận hàng" ? "nav-parent-active" : ""
                }`}
              >
                <Icon name={group.icon} />
                <span>{group.label}</span>
                {group.children && <Icon name="chevron" size={14} />}
              </button>
              {group.children && group.label === "Nhận hàng" && (
                <div className="nav-children">
                  {group.children.map((child, index) => (
                    <button key={child} className={index === 0 ? "active" : ""}>
                      {child}
                      {index === 0 && <span>24</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item">
            <Icon name="settings" />
            <span>Cài đặt</span>
          </button>
          <div className="support-card">
            <div className="support-icon">?</div>
            <strong>Cần hỗ trợ?</strong>
            <p>Liên hệ đội ngũ vận hành</p>
            <button onClick={() => notify("Đã mở trung tâm hỗ trợ")}>
              Trung tâm hỗ trợ
            </button>
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng menu"
        />
      )}

      <main>
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumbs">
            <Icon name="home" size={15} />
            <span>Điều hành</span>
            <Icon name="chevron" size={12} />
            <strong>Nhận hàng</strong>
          </div>
          <label className="global-search">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn, tên hàng, người gửi..."
            />
          </label>
          <button className="admin-chip">
            <span className="status-dot" /> Quản trị hệ thống
          </button>
          <button className="profile">
            <span className="avatar">AN</span>
            <span>
              <strong>Admin</strong>
              <small>Quản trị viên</small>
            </span>
            <Icon name="chevron" size={14} />
          </button>
        </header>

        <div className="content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">NHẬN HÀNG</div>
              <h1>Danh sách hàng hóa</h1>
              <p>Quản lý, theo dõi và điều phối các đơn hàng tại một nơi.</p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary"
                onClick={() => notify("Đang mở trình quét QR")}
              >
                <Icon name="qr" /> Quét mã QR
              </button>
              <button
                className="button primary"
                onClick={() => notify("Đã mở biểu mẫu tạo đơn")}
              >
                <Icon name="plus" /> Tạo đơn hàng
              </button>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon red">
                <Icon name="package" />
              </div>
              <div>
                <span>Tổng đơn hôm nay</span>
                <strong>124</strong>
                <small>
                  <b>+12.5%</b> so với hôm qua
                </small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">
                <Icon name="clock" />
              </div>
              <div>
                <span>Chờ chuyển</span>
                <strong>38</strong>
                <small>Cần xử lý trong hôm nay</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">
                <Icon name="truck" />
              </div>
              <div>
                <span>Đang vận chuyển</span>
                <strong>72</strong>
                <small>Trên 8 chuyến xe</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <Icon name="download" />
              </div>
              <div>
                <span>Doanh thu</span>
                <strong>18,6tr</strong>
                <small>
                  <b>+8.2%</b> so với hôm qua
                </small>
              </div>
            </div>
          </section>

          <section className="data-card">
            <div className="card-toolbar">
              <div className="tabs">
                {["Tất cả", "Chưa chuyển", "Đã chuyển"].map((item) => (
                  <button
                    onClick={() => setTab(item)}
                    className={tab === item ? "active" : ""}
                    key={item}
                  >
                    {item}
                    <span>
                      {item === "Tất cả"
                        ? 124
                        : item === "Chưa chuyển"
                          ? 38
                          : 72}
                    </span>
                  </button>
                ))}
              </div>
              <div className="toolbar-actions">
                <button
                  className={`button compact ${
                    filtersOpen ? "filter-active" : "secondary"
                  }`}
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  <Icon name="filter" /> Bộ lọc{" "}
                  <span className="filter-count">2</span>
                </button>
                <button
                  className="icon-button bordered"
                  onClick={() => notify("Đang xuất danh sách...")}
                  aria-label="Xuất danh sách"
                >
                  <Icon name="download" />
                </button>
              </div>
            </div>

            {filtersOpen && (
              <div className="filters">
                <label>
                  <span>Ngày tạo đơn</span>
                  <div className="field">
                    <Icon name="calendar" />
                    <input type="date" />
                  </div>
                </label>
                <label>
                  <span>Hướng đi</span>
                  <select>
                    <option>Tất cả hướng</option>
                    <option>Sài Gòn → An Giang</option>
                  </select>
                </label>
                <label>
                  <span>Trạm gửi</span>
                  <select>
                    <option>Tất cả trạm gửi</option>
                    <option>Trạm An Phú</option>
                    <option>Sài Gòn</option>
                  </select>
                </label>
                <label>
                  <span>Trạm nhận</span>
                  <select>
                    <option>Tất cả trạm nhận</option>
                    <option>Trạm An Giang</option>
                    <option>Kinh Dương Vương</option>
                  </select>
                </label>
                <button
                  className="button primary apply-filter"
                  onClick={() => notify("Đã áp dụng bộ lọc")}
                >
                  <Icon name="search" /> Áp dụng
                </button>
              </div>
            )}

            {selected.length > 0 && (
              <div className="bulk-bar">
                <strong>Đã chọn {selected.length} đơn hàng</strong>
                <span />
                <button onClick={() => setSelected([])}>Bỏ chọn</button>
                <button
                  className="button primary compact"
                  onClick={() =>
                    notify(`Đã chuyển ${selected.length} đơn hàng`)
                  }
                >
                  Chuyển hàng
                </button>
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          visible.length > 0 &&
                          selected.length === visible.length
                        }
                        onChange={toggleAll}
                      />
                    </th>
                    <th>Mã đơn</th>
                    <th>Hàng hóa</th>
                    <th>Tuyến đường & thời gian</th>
                    <th>Người gửi / Người nhận</th>
                    <th>Cước phí & COD</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(row.id)}
                          onChange={() =>
                            setSelected(
                              selected.includes(row.id)
                                ? selected.filter((id) => id !== row.id)
                                : [...selected, row.id],
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="order-id"
                          onClick={() => notify(`Đang mở đơn ${row.id}`)}
                        >
                          {row.id}
                        </button>
                      </td>
                      <td>
                        <div className="item-cell">
                          <div className="item-icon">
                            <Icon
                              name={
                                row.item === "Tiền mặt" ? "download" : "box"
                              }
                            />
                          </div>
                          <div>
                            <strong>{row.item}</strong>
                            <span>{row.detail}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="route">
                          <strong>{row.from}</strong>
                          <span className="route-line">
                            <i />
                            <Icon name="chevron" size={13} />
                            <i />
                          </span>
                          <strong>{row.to}</strong>
                        </div>
                        <small className="muted">{row.time} · NV: Admin</small>
                      </td>
                      <td>
                        <div className="people">
                          <span>
                            <i>G</i>
                            {row.sender}
                          </span>
                          <span>
                            <i>N</i>
                            {row.receiver}
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>{row.fee}</strong>
                        <small className="muted">COD: {row.cod}</small>
                      </td>
                      <td>
                        <span className={`status ${row.tone}`}>
                          <i />
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-button row-more"
                          onClick={() => notify(`Thao tác với ${row.id}`)}
                          aria-label={`Thao tác với ${row.id}`}
                        >
                          <Icon name="more" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visible.length === 0 && (
                <div className="empty">
                  <Icon name="search" size={28} />
                  <strong>Không tìm thấy đơn hàng</strong>
                  <p>Hãy thử từ khóa hoặc bộ lọc khác.</p>
                </div>
              )}
            </div>
            <div className="pagination">
              <span>
                Hiển thị <strong>1–{visible.length}</strong> trong 124 đơn
              </span>
              <div>
                <button disabled>
                  <Icon name="chevron" size={14} />
                </button>
                <button className="active">1</button>
                <button>2</button>
                <button>3</button>
                <span>...</span>
                <button>13</button>
                <button className="next">
                  <Icon name="chevron" size={14} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  )
}
