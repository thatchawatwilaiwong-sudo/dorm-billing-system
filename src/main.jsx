import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Building2,
  CalendarDays,
  Calculator,
  Check,
  Cloud,
  DoorOpen,
  Download,
  Droplets,
  FileText,
  House,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import "./styles.css";

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const START_YEAR = 2568;
const INITIAL_DATA = {
  buildings: ["Baan Nuntika", "Nuntika Reserves"],
  tenants: [
    {
      id: "room-202",
      room: "202",
      name: "ผู้พักตัวอย่าง",
      building: "Baan Nuntika",
      rent: 3000,
      waterMode: "unit",
      waterRate: 17,
      waterFixed: 0,
      electricMode: "unit",
      electricRate: 7,
      electricFixed: 0,
    },
  ],
  meters: {
    "room-202": {
      water: { "2568-11": 170, "2569-0": 170, "2569-4": 170, "2569-5": 178 },
      electric: { "2568-11": 922, "2569-0": 922, "2569-4": 922, "2569-5": 978 },
    },
  },
};

const money = (value) =>
  new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value || 0);

function usePersistentData() {
  const [data, setData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dorm-billing-data")) || INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  });

  useEffect(() => {
    localStorage.setItem("dorm-billing-data", JSON.stringify(data));
  }, [data]);

  return [data, setData];
}

function previousPeriod(year, month) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

function meterValue(data, tenantId, utility, year, month) {
  return data.meters?.[tenantId]?.[utility]?.[`${year}-${month}`];
}

function utilityCost(data, tenant, utility, year, month) {
  const mode = tenant[`${utility}Mode`];
  if (mode === "fixed") {
    return {
      previous: null,
      current: null,
      units: null,
      rate: null,
      total: Number(tenant[`${utility}Fixed`]) || 0,
      fixed: true,
    };
  }
  const current = meterValue(data, tenant.id, utility, year, month);
  const previous = previousPeriod(year, month);
  const before = meterValue(data, tenant.id, utility, previous.year, previous.month);
  const rate = Number(tenant[`${utility}Rate`]) || 0;
  const units =
    current !== undefined && before !== undefined && Number(current) >= Number(before)
      ? Number(current) - Number(before)
      : null;
  return {
    previous: before,
    current,
    units,
    rate,
    total: units === null ? 0 : units * rate,
    fixed: false,
  };
}

function App() {
  const [data, setData] = usePersistentData();
  const [page, setPage] = useState("tenants");
  const [year, setYear] = useState(2569);
  const [month, setMonth] = useState(0);
  const [building, setBuilding] = useState("ทั้งหมด");

  const filteredTenants = useMemo(
    () => data.tenants.filter((tenant) => building === "ทั้งหมด" || tenant.building === building),
    [data.tenants, building],
  );

  const updateTenant = (id, patch) => {
    setData((current) => ({
      ...current,
      tenants: current.tenants.map((tenant) => tenant.id === id ? { ...tenant, ...patch } : tenant),
    }));
  };

  const deleteTenant = (id) => {
    if (!window.confirm("ลบข้อมูลห้องนี้ใช่หรือไม่?")) return;
    setData((current) => ({
      ...current,
      tenants: current.tenants.filter((tenant) => tenant.id !== id),
      meters: Object.fromEntries(Object.entries(current.meters).filter(([key]) => key !== id)),
    }));
  };

  const addTenant = () => {
    const id = `room-${Date.now()}`;
    const firstBuilding = data.buildings[0] || "Baan Nuntika";
    setData((current) => ({
      ...current,
      tenants: [
        ...current.tenants,
        {
          id,
          room: "",
          name: "",
          building: firstBuilding,
          rent: 0,
          waterMode: "unit",
          waterRate: 17,
          waterFixed: 0,
          electricMode: "unit",
          electricRate: 7,
          electricFixed: 0,
        },
      ],
      meters: { ...current.meters, [id]: { water: {}, electric: {} } },
    }));
  };

  const addBuilding = () => {
    const name = window.prompt("ชื่ออาคารหรือ Tag ใหม่");
    if (!name?.trim() || data.buildings.includes(name.trim())) return;
    setData((current) => ({ ...current, buildings: [...current.buildings, name.trim()] }));
  };

  const updateMeter = (tenantId, utility, value) => {
    const key = `${year}-${month}`;
    setData((current) => ({
      ...current,
      meters: {
        ...current.meters,
        [tenantId]: {
          ...(current.meters[tenantId] || {}),
          [utility]: {
            ...(current.meters[tenantId]?.[utility] || {}),
            [key]: value === "" ? undefined : Number(value),
          },
        },
      },
    }));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Building2 size={21} /></span>
          <span className="brand-copy"><strong>หอพักของฉัน</strong><small>DORM OPERATIONS</small></span>
        </div>
        <nav>
          <NavButton active={page === "tenants"} icon={Users} onClick={() => setPage("tenants")}>
            ผู้พักและห้องพัก
          </NavButton>
          <NavButton active={page === "meters"} icon={Calculator} onClick={() => setPage("meters")}>
            มิเตอร์และค่าใช้จ่าย
          </NavButton>
          <NavButton active={page === "bills"} icon={FileText} onClick={() => setPage("bills")}>
            บิลค่าเช่า
          </NavButton>
        </nav>
        <div className="sidebar-note">
          <Save size={16} />
          ข้อมูลบันทึกอัตโนมัติ
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">ระบบจัดการค่าเช่า น้ำ และไฟ</p>
            <h1>{page === "tenants" ? "ผู้พักและห้องพัก" : page === "meters" ? "มิเตอร์และค่าใช้จ่าย" : "บิลค่าเช่า"}</h1>
          </div>
          <div className="topbar-tools">
            <div className="sync-status"><Cloud size={17} /><span><strong><Check size={12} /> บันทึกแล้ว</strong><small>ข้อมูลล่าสุดอยู่บนอุปกรณ์นี้</small></span></div>
            <div className="filter">
              <label>อาคาร</label>
              <select value={building} onChange={(event) => setBuilding(event.target.value)}>
                <option>ทั้งหมด</option>
                {data.buildings.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>
        </header>

        {page === "tenants" && (
          <TenantPage
            data={data}
            tenants={filteredTenants}
            addTenant={addTenant}
            addBuilding={addBuilding}
            updateTenant={updateTenant}
            deleteTenant={deleteTenant}
          />
        )}
        {page === "meters" && (
          <MeterPage
            data={data}
            tenants={filteredTenants}
            year={year}
            month={month}
            setYear={setYear}
            setMonth={setMonth}
            updateMeter={updateMeter}
          />
        )}
        {page === "bills" && (
          <BillsPage data={data} tenants={filteredTenants} year={year} month={month} setYear={setYear} setMonth={setMonth} />
        )}
      </main>
    </div>
  );
}

function NavButton({ active, icon: Icon, children, onClick }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={19} />
      {children}
    </button>
  );
}

function TenantPage({ data, tenants, addTenant, addBuilding, updateTenant, deleteTenant }) {
  return (
    <section>
      <div className="section-actions">
        <div>
          <h2>ข้อมูลผู้พัก</h2>
          <p>ตั้งค่าอัตราค่าน้ำและค่าไฟแยกแต่ละห้องได้</p>
        </div>
        <div className="button-row">
          <button className="button secondary" onClick={addBuilding}><Building2 size={17} /> เพิ่มอาคาร</button>
          <button className="button primary" onClick={addTenant}><Plus size={17} /> เพิ่มผู้พัก</button>
        </div>
      </div>

      <div className="tenant-list">
        {tenants.map((tenant) => (
          <article className="tenant-card" key={tenant.id}>
            <div className="tenant-heading">
              <div className="room-number">ห้อง {tenant.room || "ใหม่"}</div>
              <button className="icon-button danger" aria-label="ลบห้อง" onClick={() => deleteTenant(tenant.id)}>
                <Trash2 size={17} />
              </button>
            </div>
            <div className="form-grid">
              <Field label="เลขห้อง"><input value={tenant.room} onChange={(e) => updateTenant(tenant.id, { room: e.target.value })} /></Field>
              <Field label="ชื่อผู้พัก"><input value={tenant.name} onChange={(e) => updateTenant(tenant.id, { name: e.target.value })} /></Field>
              <Field label="อาคาร / Tag">
                <select value={tenant.building} onChange={(e) => updateTenant(tenant.id, { building: e.target.value })}>
                  {data.buildings.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="ค่าเช่าต่อเดือน">
                <div className="input-suffix"><input type="number" min="0" value={tenant.rent} onChange={(e) => updateTenant(tenant.id, { rent: Number(e.target.value) })} /><span>บาท</span></div>
              </Field>
            </div>
            <div className="utility-settings">
              <UtilitySetting label="ค่าน้ำ" utility="water" tenant={tenant} defaultRate={17} updateTenant={updateTenant} />
              <UtilitySetting label="ค่าไฟ" utility="electric" tenant={tenant} defaultRate={7} updateTenant={updateTenant} />
            </div>
          </article>
        ))}
        {tenants.length === 0 && <EmptyState text="ยังไม่มีผู้พักในอาคารนี้" />}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function UtilitySetting({ label, utility, tenant, updateTenant }) {
  const modeKey = `${utility}Mode`;
  const rateKey = `${utility}Rate`;
  const fixedKey = `${utility}Fixed`;
  return (
    <div className="utility-box">
      <div className="utility-title">{label}</div>
      <div className="segmented">
        <button className={tenant[modeKey] === "unit" ? "selected" : ""} onClick={() => updateTenant(tenant.id, { [modeKey]: "unit" })}>คิดตามหน่วย</button>
        <button className={tenant[modeKey] === "fixed" ? "selected" : ""} onClick={() => updateTenant(tenant.id, { [modeKey]: "fixed" })}>เหมาจ่าย</button>
      </div>
      <Field label={tenant[modeKey] === "unit" ? "ราคาต่อหน่วย" : "ยอดเหมาจ่าย"}>
        <div className="input-suffix">
          <input
            type="number"
            min="0"
            value={tenant[modeKey] === "unit" ? tenant[rateKey] : tenant[fixedKey]}
            onChange={(e) => updateTenant(tenant.id, { [tenant[modeKey] === "unit" ? rateKey : fixedKey]: Number(e.target.value) })}
          />
          <span>บาท</span>
        </div>
      </Field>
    </div>
  );
}

function PeriodControls({ year, month, setYear, setMonth }) {
  const currentThaiYear = new Date().getFullYear() + 543;
  const years = Array.from({ length: Math.max(4, currentThaiYear - START_YEAR + 3) }, (_, index) => START_YEAR + index);
  return (
    <div className="period-controls">
      <Field label="ปี พ.ศ.">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Field>
      <Field label="เดือนที่ต้องการกรอก">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((item, index) => <option key={item} value={index}>{item}</option>)}
        </select>
      </Field>
    </div>
  );
}

function MeterPage({ data, tenants, year, month, setYear, setMonth, updateMeter }) {
  return (
    <section>
      <div className="section-actions meter-actions">
        <div>
          <h2>บันทึกเลขมิเตอร์</h2>
          <p>แก้ไขได้เฉพาะเดือนที่เลือก เลขมิเตอร์เท่ากับเดือนก่อนได้ แต่ห้ามต่ำกว่า</p>
        </div>
        <PeriodControls year={year} month={month} setYear={setYear} setMonth={setMonth} />
      </div>
      <MeterTable data={data} tenants={tenants} year={year} selectedMonth={month} updateMeter={updateMeter} />
      <div className="summary-title">
        <div>
          <h2>สรุปค่าน้ำและค่าไฟ</h2>
          <p>ตัวเลขในตารางนี้เป็นยอดเงินที่คำนวณแล้ว</p>
        </div>
      </div>
      <CostTable data={data} tenants={tenants} year={year} />
    </section>
  );
}

function MeterTable({ data, tenants, year, selectedMonth, updateMeter }) {
  return (
    <div className="table-wrap">
      <table className="meter-table">
        <thead>
          <tr>
            <th className="sticky-col">ห้อง / รายการ</th>
            {MONTHS.map((item, index) => <th className={selectedMonth === index ? "selected-month" : ""} key={item}>{item.slice(0, 3)}</th>)}
          </tr>
        </thead>
        <tbody>
          {tenants.flatMap((tenant) => ["water", "electric"].map((utility) => {
            const fixed = tenant[`${utility}Mode`] === "fixed";
            return (
              <tr key={`${tenant.id}-${utility}`}>
                <th className="sticky-col">
                  <strong>{tenant.room || "ไม่ระบุ"}</strong>
                  <span className={`utility-dot ${utility}`}>{utility === "water" ? "น้ำ" : "ไฟ"}</span>
                </th>
                {MONTHS.map((_, monthIndex) => {
                  const value = meterValue(data, tenant.id, utility, year, monthIndex);
                  const previous = previousPeriod(year, monthIndex);
                  const before = meterValue(data, tenant.id, utility, previous.year, previous.month);
                  const invalid = value !== undefined && before !== undefined && Number(value) < Number(before);
                  const editable = selectedMonth === monthIndex && !fixed;
                  return (
                    <td className={`${selectedMonth === monthIndex ? "selected-month" : ""} ${fixed ? "fixed-cell" : ""}`} key={monthIndex}>
                      {fixed ? (
                        <span className="locked">เหมาจ่าย</span>
                      ) : editable ? (
                        <div>
                          <input
                            className={invalid ? "invalid" : ""}
                            type="number"
                            min="0"
                            value={value ?? ""}
                            onChange={(event) => updateMeter(tenant.id, utility, event.target.value)}
                            title={invalid ? `ต้องไม่น้อยกว่า ${before}` : ""}
                          />
                          {invalid && <small className="error-text">ต่ำกว่า {before}</small>}
                        </div>
                      ) : (
                        <span className="meter-readonly">{value ?? "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          }))}
        </tbody>
      </table>
    </div>
  );
}

function CostTable({ data, tenants, year }) {
  return (
    <div className="table-wrap">
      <table className="meter-table cost-table">
        <thead>
          <tr>
            <th className="sticky-col">ห้อง / รายการ</th>
            {MONTHS.map((item) => <th key={item}>{item.slice(0, 3)}</th>)}
          </tr>
        </thead>
        <tbody>
          {tenants.flatMap((tenant) => ["water", "electric"].map((utility) => (
            <tr key={`${tenant.id}-${utility}`}>
              <th className="sticky-col">
                <strong>{tenant.room || "ไม่ระบุ"}</strong>
                <span className={`utility-dot ${utility}`}>{utility === "water" ? "น้ำ" : "ไฟ"}</span>
              </th>
              {MONTHS.map((_, monthIndex) => {
                const result = utilityCost(data, tenant, utility, year, monthIndex);
                const hasResult = result.fixed || result.units !== null;
                return <td key={monthIndex}>{hasResult ? `${money(result.total)}` : "—"}</td>;
              })}
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}

function BillsPage({ data, tenants, year, month, setYear, setMonth }) {
  return (
    <section>
      <div className="section-actions">
        <div>
          <h2>บิลค่าเช่ารายห้อง</h2>
          <p>ตรวจสอบยอดแล้วบันทึกเป็นรูป PNG แยกแต่ละห้อง</p>
        </div>
        <PeriodControls year={year} month={month} setYear={setYear} setMonth={setMonth} />
      </div>
      <div className="bill-list">
        {tenants.map((tenant) => (
          <BillCard data={data} tenant={tenant} year={year} month={month} key={tenant.id} />
        ))}
        {tenants.length === 0 && <EmptyState text="ยังไม่มีห้องสำหรับสร้างบิล" />}
      </div>
    </section>
  );
}

function BillCard({ data, tenant, year, month }) {
  const water = utilityCost(data, tenant, "water", year, month);
  const electric = utilityCost(data, tenant, "electric", year, month);
  const total = water.total + electric.total + Number(tenant.rent || 0);
  return (
    <article className="bill-card">
      <div className="bill-document">
        <div className="bill-header">
          <div className="bill-building-icon"><Building2 size={27} /></div>
          <div>
            <h3>บิลค่าเช่าห้อง {tenant.building}</h3>
            <span>{tenant.building}</span>
          </div>
        </div>
        <div className="bill-period">
          <div className="bill-room">
            <DoorOpen size={22} />
            <span>ห้องที่</span>
            <strong>{tenant.room || "—"}</strong>
          </div>
          <div className="bill-month">
            <CalendarDays size={20} />
            <strong>{MONTHS[month]} {year - 543}</strong>
          </div>
        </div>
        <div className="bill-table-wrap">
          <table>
            <thead><tr><th>รายการ</th><th>เลขครั้งก่อน</th><th>เลขครั้งนี้</th><th>จำนวนหน่วยที่ใช้</th><th>หน่วยละ</th><th>รวม</th></tr></thead>
            <tbody>
              <BillRow label="น้ำ" result={water} icon="water" />
              <BillRow label="ไฟ" result={electric} icon="electric" />
              <tr className="rent-row">
                <td><span className="bill-item"><span className="bill-item-icon rent"><House size={16} /></span>ค่าเช่า</span></td>
                <td></td><td></td><td></td><td></td><td>{money(tenant.rent)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bill-total-panel">
          <div><ReceiptText size={21} /><strong>รวม</strong></div>
          <strong>{money(total)} <small>บาท</small></strong>
        </div>
        <div className="bill-tenant">ผู้พัก : {tenant.name || "ไม่ระบุชื่อผู้พัก"}</div>
      </div>
      <div className="bill-actions">
        <div><strong>ยอดรวม {money(total)} บาท</strong><span>{tenant.name || "ไม่ระบุชื่อผู้พัก"}</span></div>
        <button className="button primary" onClick={() => saveBillImage(data, tenant, year, month)}>
          <Download size={17} /> บันทึกเป็นรูป
        </button>
      </div>
    </article>
  );
}

function BillRow({ label, result, icon }) {
  const Icon = icon === "water" ? Droplets : Zap;
  return (
    <tr>
      <td><span className="bill-item"><span className={`bill-item-icon ${icon}`}><Icon size={16} /></span>{label}</span></td>
      {result.fixed ? (
        <><td colSpan="4">เหมาจ่าย</td><td>{money(result.total)}</td></>
      ) : (
        <><td>{result.previous ?? "—"}</td><td>{result.current ?? "—"}</td><td>{result.units ?? "—"}</td><td>{money(result.rate)}</td><td>{result.units === null ? "—" : money(result.total)}</td></>
      )}
    </tr>
  );
}

async function saveBillImage(data, tenant, year, month) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 1680;
  const context = canvas.getContext("2d");
  const water = utilityCost(data, tenant, "water", year, month);
  const electric = utilityCost(data, tenant, "electric", year, month);
  const total = water.total + electric.total + Number(tenant.rent || 0);
  const columns = [70, 300, 510, 710, 940, 1120, 1330];
  const roundRect = (x, y, width, height, radius, fill, stroke) => {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    if (fill) { context.fillStyle = fill; context.fill(); }
    if (stroke) { context.strokeStyle = stroke; context.stroke(); }
  };

  context.fillStyle = "#f2f5fa";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = "rgba(23, 32, 51, 0.12)";
  context.shadowBlur = 30;
  context.shadowOffsetY = 12;
  roundRect(45, 40, 1310, 1580, 30, "#ffffff");
  context.shadowColor = "transparent";
  roundRect(45, 40, 1310, 310, 30, "#0d1a2d");
  context.fillStyle = "#ffffff";
  context.textAlign = "left";
  context.font = "700 58px sans-serif";
  context.fillText(`บิลค่าเช่าห้อง ${tenant.building}`, 190, 165);
  context.fillStyle = "#75dff0";
  context.font = "500 24px sans-serif";
  context.fillText(tenant.building.toUpperCase(), 193, 215);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 6;
  context.strokeRect(92, 111, 62, 82);
  context.beginPath();
  context.moveTo(82, 111); context.lineTo(123, 80); context.lineTo(164, 111); context.stroke();

  roundRect(80, 395, 485, 185, 22, "#edf5ff");
  context.fillStyle = "#2563eb";
  context.font = "600 28px sans-serif";
  context.fillText("ห้องที่", 125, 462);
  context.fillStyle = "#172033";
  context.font = "700 74px sans-serif";
  context.fillText(tenant.room || "—", 125, 545);
  context.strokeStyle = "#d5e1e4";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(620, 420); context.lineTo(620, 555); context.stroke();
  context.fillStyle = "#2563eb";
  context.font = "600 29px sans-serif";
  context.fillText("เดือน", 685, 462);
  context.fillStyle = "#172033";
  context.font = "700 43px sans-serif";
  context.fillText(`${MONTHS[month]} ${year - 543}`, 685, 525);

  roundRect(70, 650, 1260, 82, 15, "#eaf2ff");
  const headers = ["รายการ", "เลขครั้งก่อน", "เลขครั้งนี้", "จำนวนหน่วยที่ใช้", "หน่วยละ", "รวม"];
  context.fillStyle = "#264769";
  context.textAlign = "center";
  context.font = "600 24px sans-serif";
  headers.forEach((text, index) => context.fillText(text, (columns[index] + columns[index + 1]) / 2, 702));

  const rows = [
    ["น้ำ", water.fixed ? "" : water.previous ?? "—", water.fixed ? "" : water.current ?? "—", water.fixed ? "เหมาจ่าย" : water.units ?? "—", water.fixed ? "" : money(water.rate), water.units === null && !water.fixed ? "—" : money(water.total)],
    ["ไฟ", electric.fixed ? "" : electric.previous ?? "—", electric.fixed ? "" : electric.current ?? "—", electric.fixed ? "เหมาจ่าย" : electric.units ?? "—", electric.fixed ? "" : money(electric.rate), electric.units === null && !electric.fixed ? "—" : money(electric.total)],
    ["ค่าเช่า", "", "", "", "", money(tenant.rent)],
  ];
  const rowCenters = [825, 955, 1085];
  context.font = "30px sans-serif";
  rows.forEach((row, rowIndex) => row.forEach((text, columnIndex) => {
    context.fillStyle = columnIndex === 5 ? "#1d4ed8" : "#172033";
    context.textAlign = columnIndex === 0 ? "left" : columnIndex === 5 ? "right" : "center";
    const x = columnIndex === 0 ? columns[columnIndex] + 28 : columnIndex === 5 ? columns[columnIndex + 1] - 28 : (columns[columnIndex] + columns[columnIndex + 1]) / 2;
    context.font = columnIndex === 5 ? "700 32px sans-serif" : "30px sans-serif";
    context.fillText(String(text), x, rowCenters[rowIndex]);
  }));
  [865, 995, 1125].forEach((y) => {
    context.strokeStyle = "#dce4e8";
    context.lineWidth = 2;
    context.setLineDash([5, 7]);
    context.beginPath(); context.moveTo(75, y); context.lineTo(1325, y); context.stroke();
  });
  context.setLineDash([]);

  roundRect(80, 1200, 1240, 215, 24, "#eaf2ff", "#bfd3fb");
  context.fillStyle = "#1d4ed8";
  context.textAlign = "left";
  context.font = "700 48px sans-serif";
  context.fillText("รวม", 145, 1325);
  context.textAlign = "right";
  context.font = "700 82px sans-serif";
  context.fillText(money(total), 1230, 1320);
  context.font = "600 27px sans-serif";
  context.fillText("บาท", 1230, 1360);
  context.textAlign = "center";
  context.fillStyle = "#667085";
  context.font = "25px sans-serif";
  context.fillText(`ผู้พัก : ${tenant.name || "—"}`, 700, 1520);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const filename = `บิล-${tenant.building}-${tenant.room}-${MONTHS[month]}-${year}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function EmptyState({ text }) {
  return <div className="empty-state"><Building2 size={28} /><p>{text}</p></div>;
}

createRoot(document.getElementById("root")).render(<App />);
