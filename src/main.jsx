import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { toBlob } from "html-to-image";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Calculator,
  Check,
  Cloud,
  DoorOpen,
  Download,
  Droplets,
  Edit3,
  FileText,
  FolderOpen,
  House,
  Image as ImageIcon,
  Paperclip,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { hasSupabaseConfig, supabase } from "./supabaseClient";
import embeddedLogoDataUrl from "./assets/nuntika-logo.jpeg?inline";
import "./styles.css";

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const MONTH_SHORTS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const APP_PIN = "115974";
const APP_LOGO_SRC = embeddedLogoDataUrl;
const BRAND_NAME = "Baan Nuntika";
const RESIDENCES_NAME = "Nuntika Residences";
const OLD_RESIDENCES_NAME = "Baan Nuntika";
const OLD_RESERVE_NAME = "Nuntika Reserves";
const RESERVE_NAME = "Nuntika Reserve";
const FLOWSIDE_NAME = "Nuntika Flowside";
const START_YEAR = 2568;
const METER_MAX = 9999;
const METER_RANGE = METER_MAX + 1;
const METER_ROLLOVER_START = 9000;
const DOCUMENT_TEMPLATES = [
  { id: "PNRD", code: "PNRD", title: "ระเบียบการเข้าพักอาคาร Nuntika Residences", building: RESIDENCES_NAME },
  { id: "PNRS", code: "PNRS", title: "ระเบียบการเข้าพักอาคาร Nuntika Reserve", building: RESERVE_NAME },
  { id: "PNFS", code: "PNFS", title: "ระเบียบการเข้าพักอาคาร Nuntika Flowside", building: FLOWSIDE_NAME },
  { id: "RF", code: "RF", title: "ใบจองห้องพัก", building: "ทุกอาคาร" },
  { id: "RHF", code: "RHF", title: "ไฟล์ใบรับมอบห้องพัก", building: RESERVE_NAME },
];
const LEGACY_DOCUMENT_TITLES = {
  PNRD: "ไฟล์กฎการพักอาศัยอาคาร Nuntika Residences",
  PNRS: "ไฟล์กฎการพักอาศัยอาคาร Nuntika Reserve",
  PNFS: "ไฟล์กฎการพักอาศัยอาคาร Nuntika Flowside",
  RF: "ไฟล์ใบจองเข้าอยู่",
};
const TENANT_FILE_SLOTS = [
  { key: "reservation", label: "เอกสารการจอง" },
  { key: "transfer", label: "เอกสารการโอนเงิน" },
  { key: "idCard", label: "บัตรประชาชน" },
  { key: "other", label: "อื่นๆ" },
];
const INITIAL_DATA = {
  buildings: [RESIDENCES_NAME, RESERVE_NAME, FLOWSIDE_NAME],
  documents: DOCUMENT_TEMPLATES.map((item) => ({ ...item, note: "", file: null })),
  tenants: [
    {
      id: "room-202",
      room: "202",
      name: "ผู้พักตัวอย่าง",
      idCard: "",
      phone: "",
      lineId: "",
      deposit: 0,
      moveInDate: "",
      files: {},
      building: RESIDENCES_NAME,
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

function readUploadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result,
        updatedAt: new Date().toISOString(),
      });
    }, { once: true });
    reader.addEventListener("error", () => reject(reader.error), { once: true });
    reader.readAsDataURL(file);
  });
}

function fileKind(file) {
  if (!file?.type && !file?.name) return "empty";
  if (file.type?.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) return "pdf";
  return "file";
}

function fileSizeLabel(size) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function printStoredFile(file) {
  if (!file?.dataUrl) return;
  const popup = window.open("", "_blank");
  if (!popup) return;
  const isPdf = fileKind(file) === "pdf";
  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${file.name || "document"}</title>
        <style>
          html, body { margin: 0; min-height: 100%; background: #fff; }
          body { display: grid; place-items: center; }
          img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          iframe { width: 100vw; height: 100vh; border: 0; }
        </style>
      </head>
      <body>${isPdf ? `<iframe src="${file.dataUrl}"></iframe>` : `<img src="${file.dataUrl}" alt="">`}</body>
    </html>
  `);
  popup.document.close();
  popup.setTimeout(() => popup.print(), 500);
}

async function downloadStoredFile(file) {
  if (!file?.dataUrl) return;
  const response = await fetch(file.dataUrl);
  const blob = await response.blob();
  downloadBlob(blob, file.name || "document");
}

const STORAGE_KEY = "dorm-billing-data";
const SUPABASE_TABLE = "dorm_app_state";
const CLOUD_SAVE_DELAY_MS = 1000;
const BILL_EXPORT_WIDTH = 860;
const BUILDING_COLORS = ["#111111", "#DCD4C6", "#0891b2", "#ea580c", "#16a34a", "#db2777"];
const DASHBOARD_RANGES = [
  { id: "1y", label: "1 ปี", months: 12 },
  { id: "2y", label: "2 ปี", months: 24 },
  { id: "3y", label: "3 ปี", months: 36 },
  { id: "5y", label: "5 ปี", months: 60 },
  { id: "ytd", label: "YTD" },
  { id: "all", label: "All" },
];
const BILL_THEMES = [
  { accent: "#111111", header: "#000000", soft: "#f7f7f7", text: "#111111", subhead: "#c7c7c7" },
  { accent: "#DCD4C6", header: "#5f574c", soft: "#f7f3ec", text: "#6d6256", subhead: "#e8e1d5" },
  { accent: "#0891b2", header: "#083344", soft: "#e0f7fb", text: "#0e7490", subhead: "#a7f3ff" },
  { accent: "#ea580c", header: "#431407", soft: "#fff1e8", text: "#c2410c", subhead: "#fed7aa" },
  { accent: "#16a34a", header: "#052e16", soft: "#e9fbea", text: "#15803d", subhead: "#bbf7d0" },
  { accent: "#db2777", header: "#500724", soft: "#fce7f3", text: "#be185d", subhead: "#fbcfe8" },
];
let logoDataUrlPromise;

function buildingColor(buildings, building) {
  const index = Math.max(0, buildings.indexOf(building));
  return BUILDING_COLORS[index % BUILDING_COLORS.length];
}

function buildingTheme(buildings, building) {
  const index = Math.max(0, buildings.indexOf(building));
  return BILL_THEMES[index % BILL_THEMES.length];
}

function meterRowStyle(building) {
  const reserve = building === RESERVE_NAME;
  return {
    "--meter-building-bg": reserve ? "#fbf8f1" : "#ffffff",
    "--meter-building-strong-bg": reserve ? "#f3eddf" : "#ffffff",
    "--meter-building-border": reserve ? "#DCD4C6" : "#e6ebf0",
  };
}

function normalizeBuildingName(building) {
  if (building === OLD_RESIDENCES_NAME) return RESIDENCES_NAME;
  if (building === OLD_RESERVE_NAME) return RESERVE_NAME;
  return building;
}

function normalizeData(data) {
  const source = data || INITIAL_DATA;
  const buildings = [...new Set([...(source.buildings || INITIAL_DATA.buildings).map(normalizeBuildingName), ...INITIAL_DATA.buildings])];
  const documentsById = Object.fromEntries((source.documents || []).map((document) => [document.id, document]));
  const documents = DOCUMENT_TEMPLATES.map((template) => {
    const current = documentsById[template.id] || {};
    const title = !current.title || current.title === LEGACY_DOCUMENT_TITLES[template.id]
      ? template.title
      : current.title;
    const building = template.id === "RHF" && (!current.building || current.building === "ทุกอาคาร")
      ? template.building
      : (current.building || template.building);
    return {
      ...template,
      ...current,
      code: template.code,
      title,
      building,
      note: current.note || "",
      file: current.file || null,
    };
  });
  return {
    ...source,
    buildings,
    documents,
    tenants: (source.tenants || []).map((tenant) => ({
      ...tenant,
      idCard: tenant.idCard || "",
      phone: tenant.phone || "",
      lineId: tenant.lineId || "",
      deposit: tenant.deposit || 0,
      moveInDate: tenant.moveInDate || "",
      files: tenant.files || {},
      building: normalizeBuildingName(tenant.building),
    })),
    meters: source.meters || {},
  };
}

function readLocalData() {
  try {
    return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY)) || INITIAL_DATA);
  } catch {
    return normalizeData(INITIAL_DATA);
  }
}

function writeLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
}

function usePersistentData() {
  const [data, setData] = useState(readLocalData);
  const [syncState, setSyncState] = useState(() => ({
    mode: hasSupabaseConfig ? "cloud" : "local",
    status: hasSupabaseConfig ? "loading" : "saved",
    message: hasSupabaseConfig ? "กำลังเชื่อม Supabase" : "ข้อมูลอยู่บนอุปกรณ์นี้",
  }));
  const cloudReadyRef = useRef(!hasSupabaseConfig);
  const latestDataRef = useRef(data);
  const pendingLocalSaveRef = useRef(false);
  const remoteUpdateRef = useRef(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;
    let cancelled = false;

    async function loadCloudData() {
      const localData = readLocalData();
      setSyncState({ mode: "cloud", status: "loading", message: "กำลังโหลดข้อมูลจาก Supabase" });

      const { data: row, error } = await supabase
        .from(SUPABASE_TABLE)
        .select("data")
        .eq("id", 1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Supabase load failed", error);
        cloudReadyRef.current = false;
        setSyncState({ mode: "cloud", status: "error", message: "เชื่อม Supabase ไม่สำเร็จ ใช้ข้อมูลในเครื่องก่อน" });
        return;
      }

      if (row?.data) {
        const normalizedRemoteData = normalizeData(row.data);
        const shouldUpdateRemote = JSON.stringify(row.data) !== JSON.stringify(normalizedRemoteData);
        remoteUpdateRef.current = true;
        writeLocalData(normalizedRemoteData);
        setData(normalizedRemoteData);
        cloudReadyRef.current = true;
        setSyncState({ mode: "cloud", status: "saved", message: "ข้อมูลกลางจาก Supabase" });
        if (shouldUpdateRemote) {
          await supabase
            .from(SUPABASE_TABLE)
            .upsert({ id: 1, data: normalizedRemoteData, updated_at: new Date().toISOString() }, { onConflict: "id" });
        }
        return;
      }

      const { error: seedError } = await supabase
        .from(SUPABASE_TABLE)
        .upsert({ id: 1, data: localData, updated_at: new Date().toISOString() }, { onConflict: "id" });

      if (cancelled) return;

      if (seedError) {
        console.error("Supabase seed failed", seedError);
        cloudReadyRef.current = false;
        setSyncState({ mode: "cloud", status: "error", message: "สร้างข้อมูลกลางไม่สำเร็จ ใช้ข้อมูลในเครื่องก่อน" });
        return;
      }

      cloudReadyRef.current = true;
      setData(localData);
      setSyncState({ mode: "cloud", status: "saved", message: "สร้างข้อมูลกลางบน Supabase แล้ว" });
    }

    loadCloudData();

    const channel = supabase
      .channel("dorm-app-state-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: SUPABASE_TABLE, filter: "id=eq.1" },
        (payload) => {
          if (!payload.new?.data) return;
          const normalizedPayload = normalizeData(payload.new.data);
          const currentDataText = JSON.stringify(latestDataRef.current);
          const payloadText = JSON.stringify(normalizedPayload);
          if (pendingLocalSaveRef.current || saveTimerRef.current) {
            if (payloadText === currentDataText) {
              setSyncState({ mode: "cloud", status: "saved", message: "บันทึกบน Supabase แล้ว" });
            }
            return;
          }
          remoteUpdateRef.current = true;
          writeLocalData(normalizedPayload);
          setData(normalizedPayload);
          setSyncState({ mode: "cloud", status: "saved", message: "อัปเดตจาก Supabase แล้ว" });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    latestDataRef.current = data;
    writeLocalData(data);

    if (!hasSupabaseConfig || !cloudReadyRef.current) return undefined;

    if (remoteUpdateRef.current) {
      remoteUpdateRef.current = false;
      return undefined;
    }

    setSyncState({ mode: "cloud", status: "saving", message: "กำลังบันทึกขึ้น Supabase" });
    pendingLocalSaveRef.current = true;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert({ id: 1, data, updated_at: new Date().toISOString() }, { onConflict: "id" });

      if (error) {
        console.error("Supabase save failed", error);
        pendingLocalSaveRef.current = false;
        setSyncState({ mode: "cloud", status: "error", message: "บันทึก Supabase ไม่สำเร็จ" });
        return;
      }

      pendingLocalSaveRef.current = false;
      saveTimerRef.current = null;
      setSyncState({ mode: "cloud", status: "saved", message: "บันทึกบน Supabase แล้ว" });
    }, CLOUD_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    };
  }, [data]);

  return [data, setData, syncState];
}

function previousPeriod(year, month) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

function meterValue(data, tenantId, utility, year, month) {
  return data.meters?.[tenantId]?.[utility]?.[`${year}-${month}`];
}

function meterUsage(current, previous) {
  if (current === undefined || previous === undefined) return null;
  const currentValue = Number(current);
  const previousValue = Number(previous);
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) return null;
  if (currentValue >= previousValue) return currentValue - previousValue;
  if (previousValue >= METER_ROLLOVER_START && currentValue <= METER_MAX) {
    return (METER_RANGE - previousValue) + currentValue;
  }
  return null;
}

function isMeterInvalid(current, previous) {
  return current !== undefined && previous !== undefined && meterUsage(current, previous) === null;
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
  const units = meterUsage(current, before);
  return {
    previous: before,
    current,
    units,
    rate,
    total: units === null ? 0 : units * rate,
    fixed: false,
  };
}

function monthlyRoomRevenue(data, tenant, year, month) {
  const water = utilityCost(data, tenant, "water", year, month);
  const electric = utilityCost(data, tenant, "electric", year, month);
  const rent = Number(tenant.rent || 0);
  return {
    tenant,
    rent,
    water: water.total,
    electric: electric.total,
    total: rent + water.total + electric.total,
    hasWaterData: water.fixed || water.units !== null,
    hasElectricData: electric.fixed || electric.units !== null,
  };
}

function monthlyRevenueRows(data, tenants, year) {
  return MONTHS.map((monthName, monthIndex) => {
    const rooms = tenants.map((tenant) => monthlyRoomRevenue(data, tenant, year, monthIndex));
    const rent = rooms.reduce((sum, room) => sum + room.rent, 0);
    const water = rooms.reduce((sum, room) => sum + room.water, 0);
    const electric = rooms.reduce((sum, room) => sum + room.electric, 0);
    return {
      month: monthName,
      shortMonth: MONTH_SHORTS[monthIndex],
      label: `${MONTH_SHORTS[monthIndex]} ${String(year - 543).slice(-2)}`,
      year,
      monthIndex,
      rent,
      water,
      electric,
      total: rent + water + electric,
      rooms,
    };
  });
}

function periodIndex(year, month) {
  return year * 12 + month;
}

function periodFromIndex(index) {
  return { year: Math.floor(index / 12), month: index % 12 };
}

function dashboardPeriodRows(data, tenants, endYear, endMonth, rangeId) {
  const endIndex = periodIndex(endYear, endMonth);
  const firstIndex = periodIndex(START_YEAR, 11);
  const selectedRange = DASHBOARD_RANGES.find((item) => item.id === rangeId) || DASHBOARD_RANGES[0];
  let startIndex = endIndex - (selectedRange.months || 12) + 1;

  if (rangeId === "ytd") startIndex = periodIndex(endYear, 0);
  if (rangeId === "all") startIndex = firstIndex;
  startIndex = Math.max(startIndex, firstIndex);

  const rows = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const { year, month } = periodFromIndex(index);
    const monthName = MONTHS[month];
    const rooms = tenants.map((tenant) => monthlyRoomRevenue(data, tenant, year, month));
    const rent = rooms.reduce((sum, room) => sum + room.rent, 0);
    const water = rooms.reduce((sum, room) => sum + room.water, 0);
    const electric = rooms.reduce((sum, room) => sum + room.electric, 0);
    rows.push({
      id: `${year}-${month}`,
      year,
      month,
      monthName,
      label: `${MONTH_SHORTS[month]} ${String(year - 543).slice(-2)}`,
      rent,
      water,
      electric,
      total: rent + water + electric,
      rooms,
    });
  }
  return rows.length ? rows : [monthlyRevenueRows(data, tenants, endYear)[endMonth]];
}

function sumRevenueRows(rows) {
  const rent = rows.reduce((sum, row) => sum + row.rent, 0);
  const water = rows.reduce((sum, row) => sum + row.water, 0);
  const electric = rows.reduce((sum, row) => sum + row.electric, 0);
  return { rent, water, electric, total: rent + water + electric };
}

function dashboardSummary(data, tenants, year, month) {
  const months = monthlyRevenueRows(data, tenants, year);
  const selected = months[month] || months[0];
  const previous = month === 0 ? null : months[month - 1];
  const delta = previous ? selected.total - previous.total : 0;
  const buildingRows = data.buildings
    .map((building) => {
      const buildingTenants = tenants.filter((tenant) => tenant.building === building);
      const rooms = buildingTenants.map((tenant) => monthlyRoomRevenue(data, tenant, year, month));
      const rent = rooms.reduce((sum, room) => sum + room.rent, 0);
      const water = rooms.reduce((sum, room) => sum + room.water, 0);
      const electric = rooms.reduce((sum, room) => sum + room.electric, 0);
      return { building, roomCount: buildingTenants.length, rent, water, electric, total: rent + water + electric };
    })
    .filter((row) => row.roomCount > 0 || row.total > 0);
  const topRooms = selected.rooms
    .slice()
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const missingReadings = selected.rooms.filter((room) => !room.hasWaterData || !room.hasElectricData).length;
  return { months, selected, previous, delta, buildingRows, topRooms, missingReadings };
}

function App() {
  const [data, setData, syncState] = usePersistentData();
  const [page, setPage] = useState("dashboard");
  const [year, setYear] = useState(2569);
  const [month, setMonth] = useState(0);
  const [building, setBuilding] = useState("ทั้งหมด");

  const filteredTenants = useMemo(
    () => data.tenants.filter((tenant) => building === "ทั้งหมด" || tenant.building === building),
    [data.tenants, building],
  );
  const pageTitle =
    page === "dashboard" ? "Dashboard รายได้" :
    page === "tenants" ? "ผู้พักและห้องพัก" :
    page === "meters" ? "มิเตอร์และค่าใช้จ่าย" :
    page === "documents" ? "คลังเอกสารออนไลน์" :
    "บิลค่าเช่า";

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
    const firstBuilding = data.buildings[0] || RESIDENCES_NAME;
    setData((current) => ({
      ...current,
      tenants: [
        ...current.tenants,
        {
          id,
          room: "",
          name: "",
          idCard: "",
          phone: "",
          lineId: "",
          deposit: 0,
          moveInDate: "",
          files: {},
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
    return id;
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

  const updateDocument = (id, patch) => {
    setData((current) => ({
      ...current,
      documents: current.documents.map((document) => document.id === id ? { ...document, ...patch } : document),
    }));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <AppLogo className="brand-mark" />
          <span className="brand-copy"><strong>{BRAND_NAME}</strong><small>DORM OPERATIONS</small></span>
        </div>
        <nav>
          <NavButton active={page === "dashboard"} icon={BarChart3} onClick={() => setPage("dashboard")}>
            Dashboard
          </NavButton>
          <NavButton active={page === "tenants"} icon={Users} onClick={() => setPage("tenants")}>
            ผู้พักและห้องพัก
          </NavButton>
          <NavButton active={page === "meters"} icon={Calculator} onClick={() => setPage("meters")}>
            มิเตอร์และค่าใช้จ่าย
          </NavButton>
          <NavButton active={page === "bills"} icon={FileText} onClick={() => setPage("bills")}>
            บิลค่าเช่า
          </NavButton>
          <NavButton active={page === "documents"} icon={FolderOpen} onClick={() => setPage("documents")}>
            คลังเอกสาร
          </NavButton>
        </nav>
        <div className="sidebar-note">
          <Save size={16} />
          {syncState.mode === "cloud" ? "ซิงก์ข้อมูลอัตโนมัติ" : "ข้อมูลบันทึกในเครื่อง"}
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">ระบบจัดการค่าเช่า น้ำ และไฟ</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="topbar-tools">
            <div className={`sync-status ${syncState.status}`}>
              <Cloud size={17} />
              <span>
                <strong><Check size={12} /> {syncState.status === "saving" ? "กำลังบันทึก" : syncState.status === "loading" ? "กำลังโหลด" : syncState.status === "error" ? "มีปัญหา Sync" : "บันทึกแล้ว"}</strong>
                <small>{syncState.message}</small>
              </span>
            </div>
            <div className="filter">
              <label>อาคาร</label>
              <select value={building} onChange={(event) => setBuilding(event.target.value)}>
                <option>ทั้งหมด</option>
                {data.buildings.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>
        </header>

        {page === "dashboard" && (
          <DashboardPage data={data} tenants={filteredTenants} year={year} month={month} setYear={setYear} setMonth={setMonth} />
        )}
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
        {page === "documents" && (
          <DocumentLibraryPage documents={data.documents} updateDocument={updateDocument} />
        )}
      </main>
    </div>
  );
}

function AuthGate({ children }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("dorm-app-unlocked") === "true");

  const submitPin = (event) => {
    event.preventDefault();
    if (pin === APP_PIN) {
      sessionStorage.setItem("dorm-app-unlocked", "true");
      setUnlocked(true);
      return;
    }
    setPin("");
    setError("รหัสผ่านไม่ถูกต้อง");
  };

  if (unlocked) return children;

  return (
    <main className="pin-screen">
      <form className="pin-card" onSubmit={submitPin}>
        <AppLogo className="pin-logo" />
        <p className="eyebrow">SECURE ACCESS</p>
        <h1>{BRAND_NAME}</h1>
        <p className="pin-copy">กรอกรหัส PIN 6 หลักเพื่อเข้าสู่ระบบจัดการหอพัก</p>
        <label className="pin-field">
          <span>PIN CODE</span>
          <input
            autoFocus
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]*"
            type="password"
            value={pin}
            onChange={(event) => {
              setError("");
              setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
            }}
            aria-label="กรอกรหัส PIN 6 หลัก"
          />
        </label>
        {error && <div className="pin-error">{error}</div>}
        <button className="button primary pin-submit" type="submit" disabled={pin.length !== 6}>
          เข้าสู่แอพ
        </button>
      </form>
    </main>
  );
}

function AppLogo({ className = "" }) {
  return (
    <span className={`app-logo ${className}`} aria-label={RESIDENCES_NAME}>
      <img src={APP_LOGO_SRC} alt={RESIDENCES_NAME} />
    </span>
  );
}

function NavButton({ active, icon: Icon, children, onClick }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={19} />
      <span className="nav-label">{children}</span>
    </button>
  );
}

function DashboardPage({ data, tenants, year, month, setYear, setMonth }) {
  const [range, setRange] = useState("1y");
  const rows = useMemo(() => dashboardPeriodRows(data, tenants, year, month, range), [data, tenants, year, month, range]);
  const totals = useMemo(() => sumRevenueRows(rows), [rows]);
  const maxMonthlyTotal = Math.max(...rows.map((item) => item.total), 1);
  const averageMonthlyTotal = rows.length ? totals.total / rows.length : 0;
  const rangeLabel = range === "all"
    ? "ทุกเดือนตั้งแต่ ธ.ค. 2568"
    : `${DASHBOARD_RANGES.find((item) => item.id === range)?.label || "1 ปี"} ล่าสุด`;

  return (
    <section className="dashboard-page">
      <div className="section-actions">
        <div>
          <h2>Dashboard รายรับหอพัก</h2>
          <p>กราฟแท่งรวมรายได้ค่าเช่า ค่าน้ำ และค่าไฟ ตามช่วงเวลาที่เลือก</p>
        </div>
        <PeriodControls year={year} month={month} setYear={setYear} setMonth={setMonth} />
      </div>

      <div className="dashboard-kpis">
        <KpiCard icon={Wallet} label="รายรับทั้งหมด" value={`${money(totals.total)} บาท`} meta={rangeLabel} tone="blue" />
        <KpiCard icon={House} label="รายได้ค่าเช่า" value={`${money(totals.rent)} บาท`} meta={`${percentOf(totals.rent, totals.total)}% ของทั้งหมด`} tone="indigo" />
        <KpiCard icon={Droplets} label="รายได้ค่าน้ำ" value={`${money(totals.water)} บาท`} meta={`${percentOf(totals.water, totals.total)}% ของทั้งหมด`} tone="cyan" />
        <KpiCard icon={Zap} label="รายได้ค่าไฟ" value={`${money(totals.electric)} บาท`} meta={`${percentOf(totals.electric, totals.total)}% ของทั้งหมด`} tone="amber" />
      </div>

      <article className="dashboard-panel revenue-dashboard-panel">
        <div className="panel-heading dashboard-chart-heading">
          <div>
            <h3>รายรับรวมรายเดือน</h3>
            <p>แต่ละแท่งแบ่งสีตามรายได้ค่าเช่า ค่าน้ำ และค่าไฟ</p>
          </div>
          <div className="range-controls" role="group" aria-label="เลือกช่วงเวลาย้อนหลัง">
            {DASHBOARD_RANGES.map((item) => (
              <button className={range === item.id ? "selected" : ""} key={item.id} onClick={() => setRange(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="revenue-chart-meta">
          <div><strong>{rows.length}</strong><span>เดือนในช่วงที่เลือก</span></div>
          <div><strong>{money(averageMonthlyTotal)}</strong><span>รายรับเฉลี่ยต่อเดือน</span></div>
          <div><strong>{money(maxMonthlyTotal)}</strong><span>เดือนที่รายรับสูงสุด</span></div>
        </div>
        <StackedRevenueBars rows={rows} maxValue={maxMonthlyTotal} />
        <div className="chart-legend">
          <span><i className="rent" />ค่าเช่า</span>
          <span><i className="water" />ค่าน้ำ</span>
          <span><i className="electric" />ค่าไฟ</span>
        </div>
      </article>

      <div className="dashboard-breakdown-grid">
        <article className="dashboard-panel">
          <div className="panel-heading compact">
            <div>
              <h3>สรุปองค์ประกอบรายรับ</h3>
              <p>รวมทั้งช่วงเวลาที่เลือก</p>
            </div>
          </div>
          <RevenueBreakdown totals={totals} />
        </article>
        <article className="dashboard-panel">
          <div className="panel-heading compact">
            <div>
              <h3>เดือนล่าสุดในกราฟ</h3>
              <p>ใช้เทียบกับยอดสะสมของช่วงที่เลือก</p>
            </div>
          </div>
          <LatestMonthCard row={rows[rows.length - 1]} />
        </article>
      </div>
    </section>
  );
}

function percentOf(value, total) {
  return total ? ((value / total) * 100).toFixed(1) : "0.0";
}

function KpiCard({ icon: Icon, label, value, meta, tone }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <span><Icon size={20} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {meta && <small>{meta}</small>}
      </div>
    </article>
  );
}

function LineTrend({ rows, maxValue }) {
  const width = 720;
  const height = 210;
  const pad = 24;
  const points = rows.map((row, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(rows.length - 1, 1);
    const y = height - pad - (row.total / maxValue) * (height - pad * 2);
    return { x, y, row };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="กราฟแนวโน้มรายได้รวมรายเดือน">
        <path className="grid-line" d={`M ${pad} ${height - pad} H ${width - pad}`} />
        <path className="trend-area" d={`${path} L ${width - pad} ${height - pad} L ${pad} ${height - pad} Z`} />
        <path className="trend-line" d={path} />
        {points.map((point) => (
          <g key={point.row.month}>
            <circle cx={point.x} cy={point.y} r="4" />
            <text x={point.x} y={height - 6}>{point.row.shortMonth}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StackedRevenueBars({ rows, maxValue }) {
  if (rows.length === 0) return <EmptyState text="ยังไม่มีข้อมูลสำหรับทำกราฟ" />;
  return (
    <div className="stacked-bars">
      {rows.map((row) => {
        const totalHeight = Math.max(row.total ? 18 : 6, (row.total / maxValue) * 220);
        const rentPct = row.total ? (row.rent / row.total) * 100 : 0;
        const waterPct = row.total ? (row.water / row.total) * 100 : 0;
        const electricPct = row.total ? (row.electric / row.total) * 100 : 0;
        return (
          <div className="stacked-bar-item" key={row.id || `${row.year}-${row.monthIndex}`}>
            <small>{money(row.total)}</small>
            <div className="stacked-bar" style={{ height: totalHeight }}>
              <span className="rent" style={{ height: `${rentPct}%` }} />
              <span className="water" style={{ height: `${waterPct}%` }} />
              <span className="electric" style={{ height: `${electricPct}%` }} />
            </div>
            <strong>{row.label || row.shortMonth}</strong>
          </div>
        );
      })}
    </div>
  );
}

function RevenueBreakdown({ totals }) {
  const rows = [
    { label: "รายได้ค่าเช่า", value: totals.rent, className: "rent" },
    { label: "รายได้ค่าน้ำ", value: totals.water, className: "water" },
    { label: "รายได้ค่าไฟ", value: totals.electric, className: "electric" },
  ];
  return (
    <div className="revenue-breakdown">
      {rows.map((row) => {
        const percent = percentOf(row.value, totals.total);
        return (
          <div className="breakdown-row" key={row.label}>
            <div>
              <span><i className={row.className} />{row.label}</span>
              <strong>{money(row.value)} บาท</strong>
            </div>
            <div className="breakdown-track"><span className={row.className} style={{ width: `${percent}%` }} /></div>
            <small>{percent}%</small>
          </div>
        );
      })}
    </div>
  );
}

function LatestMonthCard({ row }) {
  if (!row) return <EmptyState text="ยังไม่มีข้อมูลเดือนล่าสุด" />;
  return (
    <div className="latest-month-card">
      <div>
        <span>{row.monthName} {row.year - 543}</span>
        <strong>{money(row.total)} บาท</strong>
      </div>
      <dl>
        <div><dt>ค่าเช่า</dt><dd>{money(row.rent)}</dd></div>
        <div><dt>ค่าน้ำ</dt><dd>{money(row.water)}</dd></div>
        <div><dt>ค่าไฟ</dt><dd>{money(row.electric)}</dd></div>
      </dl>
    </div>
  );
}

function RevenueMix({ rows, total }) {
  return (
    <div className="revenue-mix">
      {rows.map((row) => {
        const percent = total ? (row.value / total) * 100 : 0;
        return (
          <div className="mix-row" key={row.label}>
            <div>
              <strong>{row.label}</strong>
              <span>{money(row.value)} บาท</span>
            </div>
            <div className="mix-track">
              <span style={{ width: `${percent}%`, background: row.color }} />
            </div>
            <small>{percent.toFixed(1)}%</small>
          </div>
        );
      })}
    </div>
  );
}

function BuildingRevenueList({ data, rows, total }) {
  if (rows.length === 0) return <EmptyState text="ยังไม่มีข้อมูลรายได้ตามตึก" />;
  return (
    <div className="building-revenue-list">
      {rows.map((row) => {
        const theme = buildingTheme(data.buildings, row.building);
        const pct = total ? (row.total / total) * 100 : 0;
        return (
          <div className="building-revenue-row" key={row.building} style={{ "--row-accent": theme.accent }}>
            <div>
              <strong>{row.building}</strong>
              <span>{row.roomCount} ห้อง · {money(row.total)} บาท</span>
            </div>
            <div className="building-revenue-track"><span style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function TopRoomList({ rows }) {
  if (rows.length === 0) return <EmptyState text="ยังไม่มีห้องสำหรับจัดอันดับ" />;
  return (
    <div className="top-room-list">
      {rows.map((row, index) => (
        <div className="top-room-row" key={row.tenant.id}>
          <span>{index + 1}</span>
          <div><strong>ห้อง {row.tenant.room || "—"}</strong><small>{row.tenant.building}</small></div>
          <b>{money(row.total)} บาท</b>
        </div>
      ))}
    </div>
  );
}

function DocumentLibraryPage({ documents, updateDocument }) {
  const handleFile = async (id, file) => {
    if (!file) return;
    updateDocument(id, { file: await readUploadFile(file) });
  };

  return (
    <section>
      <div className="section-actions">
        <div>
          <h2>คลังเอกสารออนไลน์</h2>
          <p>อัปโหลดเอกสารเก็บไว้ในระบบ ดาวน์โหลดกลับเป็นไฟล์รูปแบบเดิม หรือพิมพ์ไฟล์ภาพ/PDF ได้</p>
        </div>
      </div>

      <div className="document-grid">
        {documents.map((document) => (
          <article className="document-card" key={document.id}>
            <div className="document-card-head">
              <span className="document-code">{document.code}</span>
              <div>
                <input
                  className="document-title-input"
                  value={document.title}
                  onChange={(event) => updateDocument(document.id, { title: event.target.value })}
                />
                <small>{document.building}</small>
              </div>
            </div>
            <FilePreview file={document.file} emptyText="ยังไม่ได้แปะไฟล์" />
            <label className="file-dropzone">
              <Paperclip size={18} />
              <span>{document.file ? "เปลี่ยนเอกสาร" : "อัปโหลดเอกสาร"}</span>
              <input type="file" onChange={(event) => handleFile(document.id, event.target.files?.[0])} />
            </label>
            <textarea
              className="document-note"
              placeholder="หมายเหตุ เช่น เวอร์ชันเอกสาร วันที่อัปเดต หรือวิธีใช้"
              value={document.note || ""}
              onChange={(event) => updateDocument(document.id, { note: event.target.value })}
            />
            <div className="document-actions">
              <button className="button secondary" disabled={!document.file} onClick={() => downloadStoredFile(document.file)}>
                <Download size={16} /> ดาวน์โหลด
              </button>
              <button className="button secondary" disabled={!document.file || fileKind(document.file) === "file"} onClick={() => printStoredFile(document.file)}>
                <Printer size={16} /> พิมพ์
              </button>
              <button className="button secondary" disabled={!document.file} onClick={() => updateDocument(document.id, { file: null })}>
                <Trash2 size={16} /> ลบไฟล์
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FilePreview({ file, emptyText = "ยังไม่มีไฟล์" }) {
  if (!file?.dataUrl) {
    return (
      <div className="file-preview empty">
        <ImageIcon size={24} />
        <span>{emptyText}</span>
      </div>
    );
  }
  const kind = fileKind(file);
  return (
    <div className={`file-preview ${kind}`}>
      {kind === "image" && <img src={file.dataUrl} alt={file.name || "uploaded file"} />}
      {kind === "pdf" && <iframe title={file.name || "PDF"} src={file.dataUrl} />}
      {kind === "file" && <FileText size={30} />}
      <div className="file-meta">
        <strong>{file.name}</strong>
        <span>{file.type || "ไฟล์"} {fileSizeLabel(file.size) && `· ${fileSizeLabel(file.size)}`}</span>
      </div>
    </div>
  );
}

function TenantPage({ data, tenants, addTenant, addBuilding, updateTenant, deleteTenant }) {
  const [editingIds, setEditingIds] = useState(() => new Set());
  const setEditing = (id, editing) => {
    setEditingIds((current) => {
      const next = new Set(current);
      if (editing) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const handleAddTenant = () => {
    const id = addTenant();
    setEditing(id, true);
  };
  const handleTenantFile = async (tenant, slotKey, file) => {
    if (!file) return;
    updateTenant(tenant.id, {
      files: {
        ...(tenant.files || {}),
        [slotKey]: await readUploadFile(file),
      },
    });
  };
  const removeTenantFile = (tenant, slotKey) => {
    const nextFiles = { ...(tenant.files || {}) };
    delete nextFiles[slotKey];
    updateTenant(tenant.id, { files: nextFiles });
  };

  return (
    <section>
      <div className="section-actions">
        <div>
          <h2>ข้อมูลผู้พัก</h2>
          <p>ตั้งค่าอัตราค่าน้ำและค่าไฟแยกแต่ละห้องได้</p>
        </div>
        <div className="button-row">
          <button className="button secondary" onClick={addBuilding}><Building2 size={17} /> เพิ่มอาคาร</button>
          <button className="button primary" onClick={handleAddTenant}><Plus size={17} /> เพิ่มผู้พัก</button>
        </div>
      </div>

      <div className="tenant-list">
        {tenants.map((tenant) => {
          const editing = editingIds.has(tenant.id);
          const accent = buildingColor(data.buildings, tenant.building);
          return (
            <article className={`tenant-card ${editing ? "editing" : "compact"}`} style={{ "--building-accent": accent }} key={tenant.id}>
              {editing ? (
                <>
                  <div className="tenant-heading">
                    <div className="room-number">ห้อง {tenant.room || "ใหม่"}</div>
                    <div className="tenant-card-actions">
                      <button className="button primary compact-action" onClick={() => setEditing(tenant.id, false)}><Save size={16} /> Save</button>
                      <button className="icon-button danger" aria-label="ลบห้อง" onClick={() => deleteTenant(tenant.id)}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="form-grid">
                    <Field label="เลขห้อง"><input value={tenant.room} onChange={(e) => updateTenant(tenant.id, { room: e.target.value })} /></Field>
                    <Field label="ชื่อจริง-นามสกุล-ชื่อเล่น"><input value={tenant.name} onChange={(e) => updateTenant(tenant.id, { name: e.target.value })} /></Field>
                    <Field label="เบอร์โทรศัพท์">
                      <input
                        inputMode="tel"
                        value={tenant.phone || ""}
                        onChange={(e) => updateTenant(tenant.id, { phone: e.target.value })}
                      />
                    </Field>
                    <Field label="LINE ID"><input value={tenant.lineId || ""} onChange={(e) => updateTenant(tenant.id, { lineId: e.target.value })} /></Field>
                    <Field label="เลขบัตรประชาชน">
                      <input
                        inputMode="numeric"
                        maxLength={13}
                        value={tenant.idCard || ""}
                        onChange={(e) => updateTenant(tenant.id, { idCard: e.target.value.replace(/\D/g, "").slice(0, 13) })}
                      />
                    </Field>
                    <Field label="วันที่เข้าอยู่"><input type="date" value={tenant.moveInDate || ""} onChange={(e) => updateTenant(tenant.id, { moveInDate: e.target.value })} /></Field>
                    <Field label="อาคาร / Tag">
                      <select value={tenant.building} onChange={(e) => updateTenant(tenant.id, { building: e.target.value })}>
                        {data.buildings.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </Field>
                    <Field label="ค่าเช่าต่อเดือน">
                      <div className="input-suffix"><input type="number" min="0" value={tenant.rent} onChange={(e) => updateTenant(tenant.id, { rent: Number(e.target.value) })} /><span>บาท</span></div>
                    </Field>
                    <Field label="เงินประกัน">
                      <div className="input-suffix"><input type="number" min="0" value={tenant.deposit || 0} onChange={(e) => updateTenant(tenant.id, { deposit: Number(e.target.value) })} /><span>บาท</span></div>
                    </Field>
                  </div>
                  <div className="tenant-files-panel">
                    <div className="tenant-files-heading">
                      <strong>เอกสารผู้พัก</strong>
                      <span>รองรับรูปภาพและ PDF ข้อมูลจะบันทึกอัตโนมัติ</span>
                    </div>
                    <div className="tenant-file-grid">
                      {TENANT_FILE_SLOTS.map((slot) => (
                        <TenantFileField
                          key={slot.key}
                          label={slot.label}
                          file={tenant.files?.[slot.key]}
                          onUpload={(file) => handleTenantFile(tenant, slot.key, file)}
                          onRemove={() => removeTenantFile(tenant, slot.key)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="utility-settings">
                    <UtilitySetting label="ค่าน้ำ" utility="water" tenant={tenant} defaultRate={17} updateTenant={updateTenant} />
                    <UtilitySetting label="ค่าไฟ" utility="electric" tenant={tenant} defaultRate={7} updateTenant={updateTenant} />
                  </div>
                </>
              ) : (
                <div className="tenant-compact-card">
                  <div>
                    <div className="tenant-building-chip">{tenant.building || "ไม่ระบุอาคาร"}</div>
                    <div className="tenant-compact-room">{tenant.room || "ห้องใหม่"}</div>
                    <div className="tenant-compact-name">{tenant.name || "ยังไม่ระบุชื่อผู้พัก"}</div>
                    <div className="tenant-compact-contact">
                      {tenant.phone ? `โทร ${tenant.phone}` : "ยังไม่ระบุเบอร์"} · {tenant.lineId ? `LINE ${tenant.lineId}` : "ยังไม่ระบุ LINE"}
                    </div>
                    <div className="tenant-compact-rent">ค่าเช่า {money(tenant.rent)} บาท/เดือน · ประกัน {money(tenant.deposit)} บาท</div>
                  </div>
                  <div className="tenant-card-actions">
                    <button className="button secondary compact-action" onClick={() => setEditing(tenant.id, true)}><Edit3 size={16} /> Edit</button>
                    <button className="icon-button danger" aria-label="ลบห้อง" onClick={() => deleteTenant(tenant.id)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {tenants.length === 0 && <EmptyState text="ยังไม่มีผู้พักในอาคารนี้" />}
      </div>
    </section>
  );
}

function TenantFileField({ label, file, onUpload, onRemove }) {
  return (
    <div className="tenant-file-card">
      <div className="tenant-file-title">
        <strong>{label}</strong>
        {file && <span>{fileSizeLabel(file.size)}</span>}
      </div>
      <FilePreview file={file} emptyText="ยังไม่มีไฟล์" />
      <div className="tenant-file-actions">
        <label className="mini-upload-button">
          <Paperclip size={15} />
          <span>{file ? "เปลี่ยนไฟล์" : "อัปโหลด"}</span>
          <input type="file" accept="image/*,application/pdf" onChange={(event) => onUpload(event.target.files?.[0])} />
        </label>
        <button className="button secondary" type="button" disabled={!file} onClick={() => printStoredFile(file)}>
          <Printer size={15} /> พิมพ์
        </button>
        <button className="button secondary" type="button" disabled={!file} onClick={onRemove}>
          <Trash2 size={15} /> ลบ
        </button>
      </div>
    </div>
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
        <input
          type="number"
          list="thai-year-options"
          min={START_YEAR - 1}
          value={year}
          onChange={(e) => setYear(Number(e.target.value) || START_YEAR)}
        />
        <datalist id="thai-year-options">
          {years.map((item) => <option key={item} value={item} />)}
        </datalist>
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
          <p>แก้ไขได้เฉพาะเดือนที่เลือก รองรับเลขมิเตอร์วนจาก 9999 กลับไป 0000</p>
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
              <tr key={`${tenant.id}-${utility}`} style={meterRowStyle(tenant.building)}>
                <th className="sticky-col">
                  <strong>{tenant.room || "ไม่ระบุ"}</strong>
                  <span className={`utility-dot ${utility}`}>{utility === "water" ? "น้ำ" : "ไฟ"}</span>
                </th>
                {MONTHS.map((_, monthIndex) => {
                  const value = meterValue(data, tenant.id, utility, year, monthIndex);
                  const previous = previousPeriod(year, monthIndex);
                  const before = meterValue(data, tenant.id, utility, previous.year, previous.month);
                  const invalid = isMeterInvalid(value, before);
                  const editable = selectedMonth === monthIndex && !fixed;
                  return (
                    <td className={`${selectedMonth === monthIndex ? "selected-month" : ""} ${fixed ? "fixed-cell" : ""}`} key={monthIndex}>
                      {fixed ? (
                        <span className="locked">เหมาจ่าย</span>
                      ) : editable ? (
                        <div>
                          <input
                            className={invalid ? "invalid" : ""}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={value ?? ""}
                            onChange={(event) => {
                              const nextValue = event.target.value.replace(/\D/g, "");
                              if (nextValue !== "" && Number(nextValue) > METER_MAX) return;
                              updateMeter(tenant.id, utility, nextValue);
                            }}
                            title={invalid ? `เลขต่ำกว่า ${before} ได้เฉพาะกรณีเลขก่อนหน้าใกล้ ${METER_MAX} และมิเตอร์วนกลับ` : ""}
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
            <tr key={`${tenant.id}-${utility}`} style={meterRowStyle(tenant.building)}>
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
          <p>ตรวจสอบยอดแล้วบันทึกเป็นรูป PNG แยกแต่ละห้อง หรือบันทึกทุกห้องพร้อมกัน</p>
        </div>
        <div className="bill-toolbar">
          <PeriodControls year={year} month={month} setYear={setYear} setMonth={setMonth} />
          <button className="button secondary" disabled={tenants.length === 0} onClick={() => saveAllBillImages(tenants, year, month)}>
            <Download size={17} /> บันทึกบิลทั้งหมด
          </button>
        </div>
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
  const theme = buildingTheme(data.buildings, tenant.building);
  return (
    <article
      className="bill-card"
      style={{
        "--bill-accent": theme.accent,
        "--bill-header": theme.header,
        "--bill-soft": theme.soft,
        "--bill-text": theme.text,
        "--bill-subhead": theme.subhead,
      }}
    >
      <div className="bill-document" data-bill-id={tenant.id}>
        <div className="bill-header">
          <div className="bill-building-icon"><img src={APP_LOGO_SRC} alt="" /></div>
          <div>
            <h3>บิลค่าเช่าห้อง {tenant.building}</h3>
            <span>{tenant.building}</span>
          </div>
        </div>
        <div className="bill-period">
          <div className="bill-room">
            <DoorOpen size={22} />
            <span>ห้อง</span>
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
      </div>
      <div className="bill-actions">
        <div><strong>ยอดรวม {money(total)} บาท</strong><span>ห้อง {tenant.room || "—"} · {tenant.building}</span></div>
        <button className="button primary" onClick={() => saveBillImage(tenant, year, month)}>
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

function downloadBlob(blob, filename, delay = 0) {
  window.setTimeout(() => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, delay);
}

function billImageFilename(tenant, year, month) {
  const filename = `บิล-${tenant.building}-${tenant.room}-${MONTHS[month]}-${year}.png`;
  return filename.replace(/[\\/:*?"<>|]/g, "-");
}

function getLogoDataUrl() {
  logoDataUrlPromise ||= Promise.resolve(APP_LOGO_SRC);
  return logoDataUrlPromise;
}

async function waitForImages(element) {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(images.map((image) => {
    const loaded = image.complete && image.naturalWidth > 0;
    const waitForLoad = loaded ? Promise.resolve() : new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", () => reject(new Error(`โหลดโลโก้บิลไม่สำเร็จ: ${image.currentSrc || image.src}`)), { once: true });
    });
    return waitForLoad.then(() => image.decode?.().catch(() => undefined));
  }));
}

async function preloadImageSrc(src) {
  await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error("โหลดโลโก้สำหรับบิลไม่สำเร็จ"));
    image.src = src;
  });
}

async function prepareBillExportElement(element) {
  const logoDataUrl = await getLogoDataUrl();
  await preloadImageSrc(logoDataUrl);
  const clone = element.cloneNode(true);
  clone.classList.add("bill-export-document");
  clone.querySelectorAll(".bill-building-icon").forEach((icon) => {
    icon.style.backgroundImage = `url("${logoDataUrl}")`;
    icon.style.backgroundRepeat = "no-repeat";
    icon.style.backgroundPosition = "center";
    icon.style.backgroundSize = "contain";
  });
  clone.querySelectorAll(".bill-building-icon img, .app-logo img").forEach((image) => {
    image.setAttribute("src", logoDataUrl);
    image.removeAttribute("crossorigin");
    image.style.opacity = "1";
  });

  const host = document.createElement("div");
  host.className = "bill-export-host";
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${BILL_EXPORT_WIDTH}px`;
  host.style.background = "#ffffff";
  host.appendChild(clone);
  document.body.appendChild(host);

  await waitForImages(clone);
  await document.fonts?.ready;
  return { host, clone };
}

async function createBillImageFile(tenant, year, month) {
  await document.fonts?.ready;
  const element = document.querySelector(`[data-bill-id="${CSS.escape(tenant.id)}"]`);
  if (!element) throw new Error(`ไม่พบหน้าบิลของห้อง ${tenant.room || tenant.id}`);
  const { host, clone } = await prepareBillExportElement(element);
  try {
    const blob = await toBlob(clone, {
      cacheBust: false,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: BILL_EXPORT_WIDTH,
      style: {
        width: `${BILL_EXPORT_WIDTH}px`,
        maxWidth: `${BILL_EXPORT_WIDTH}px`,
      },
    });
    if (!blob) throw new Error(`สร้างรูปบิลห้อง ${tenant.room || tenant.id} ไม่สำเร็จ`);
    const filename = billImageFilename(tenant, year, month);
    const file = new File([blob], filename, { type: "image/png" });
    return { blob, filename, file };
  } finally {
    host.remove();
  }
}

async function saveBillImage(tenant, year, month) {
  const { blob, filename, file } = await createBillImageFile(tenant, year, month);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  downloadBlob(blob, filename);
}

async function saveAllBillImages(tenants, year, month) {
  const images = await Promise.all(tenants.map((tenant) => createBillImageFile(tenant, year, month)));
  const files = images.map((image) => image.file);
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title: `บิลค่าเช่า-${MONTHS[month]}-${year}` });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  images.forEach((image, index) => downloadBlob(image.blob, image.filename, index * 180));
}

function EmptyState({ text }) {
  return <div className="empty-state"><Building2 size={28} /><p>{text}</p></div>;
}

createRoot(document.getElementById("root")).render(
  <AuthGate>
    <App />
  </AuthGate>,
);
