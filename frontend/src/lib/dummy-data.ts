export const BRANCHES = ["Harare", "Karoi", "Mvurwi", "Rusape"];

export const GROWERS = [
  { number: "GR-2024-0142", name: "Tendai Moyo", region: "Mashonaland Central" },
  { number: "GR-2024-0287", name: "Chipo Mukasa", region: "Mashonaland West" },
  { number: "GR-2024-0391", name: "Farai Ncube", region: "Manicaland" },
  { number: "GR-2024-0455", name: "Rumbidzai Sibanda", region: "Mashonaland East" },
  { number: "GR-2024-0512", name: "Tafadzwa Chirwa", region: "Mashonaland Central" },
  { number: "GR-2024-0633", name: "Memory Dube", region: "Manicaland" },
  { number: "GR-2024-0701", name: "Wellington Banda", region: "Mashonaland West" },
];

export const TRANSPORTERS = [
  { name: "Highway Logistics", id: "TR-091" },
  { name: "Sable Haulage", id: "TR-114" },
  { name: "Kariba Movers", id: "TR-203" },
  { name: "Zambezi Freight", id: "TR-318" },
];

export const DELIVERY_NOTES = [
  { dn: "DN-2410-00231", grower: "GR-2024-0142", growerName: "Tendai Moyo", transporter: "Highway Logistics", bales: 42, date: "2024-10-21", branch: "Harare", status: "weighed" },
  { dn: "DN-2410-00232", grower: "GR-2024-0287", growerName: "Chipo Mukasa", transporter: "Sable Haulage", bales: 28, date: "2024-10-21", branch: "Karoi", status: "pending" },
  { dn: "DN-2410-00233", grower: "GR-2024-0391", growerName: "Farai Ncube", transporter: "Kariba Movers", bales: 56, date: "2024-10-21", branch: "Rusape", status: "processed" },
  { dn: "DN-2410-00234", grower: "GR-2024-0455", growerName: "Rumbidzai Sibanda", transporter: "Highway Logistics", bales: 19, date: "2024-10-22", branch: "Marondera", status: "weighed" },
  { dn: "DN-2410-00235", grower: "GR-2024-0512", growerName: "Tafadzwa Chirwa", transporter: "Zambezi Freight", bales: 73, date: "2024-10-22", branch: "Bindura", status: "dispatched" },
  { dn: "DN-2410-00236", grower: "GR-2024-0633", growerName: "Memory Dube", transporter: "Sable Haulage", bales: 34, date: "2024-10-22", branch: "Mvurwi", status: "pending" },
];

export const BALES = Array.from({ length: 18 }).map((_, i) => ({
  barcode: `BC${(8801234500 + i).toString()}`,
  dn: i < 6 ? "DN-2410-00231" : i < 11 ? "DN-2410-00233" : "DN-2410-00235",
  grower: i < 6 ? "GR-2024-0142" : i < 11 ? "GR-2024-0391" : "GR-2024-0512",
  group: `G${String((i % 4) + 1).padStart(2, "0")}`,
  lot: `L${String(120 + i)}`,
  hessian: `HS-${(450 + i).toString()}`,
  mass: 78 + (i % 7) * 3.5,
  timbGrade: ["L1G", "L2L", "X3K", "C2L", "B1L"][i % 5],
  buyerGrade: ["L1G", "L2L", "X3K", "C3L", "B1L"][i % 5],
  pricePerKg: 3.85 - (i % 5) * 0.25,
  preProcessed: i < 14,
  processed: i < 11,
  verified: i < 9,
}));

export const KPI = {
  growersToday: 47,
  balesReceived: 1284,
  balesWeighed: 1156,
  salesheets: 38,
  dispatches: 12,
  pendingVerification: 23,
  pendingSalesheet: 7,
  valueToday: 184650,
};

export const INTAKE_DAILY = [
  { day: "Mon", bales: 820 }, { day: "Tue", bales: 945 }, { day: "Wed", bales: 1102 },
  { day: "Thu", bales: 980 }, { day: "Fri", bales: 1284 }, { day: "Sat", bales: 760 }, { day: "Sun", bales: 410 },
];

export const BRANCH_PERF = BRANCHES.map((b, i) => ({ branch: b, value: 45000 + i * 12500 + (i % 2) * 8000 }));

export const MONTHLY_SALES = [
  { month: "May", current: 410000, previous: 380000 },
  { month: "Jun", current: 520000, previous: 460000 },
  { month: "Jul", current: 680000, previous: 590000 },
  { month: "Aug", current: 845000, previous: 720000 },
  { month: "Sep", current: 920000, previous: 810000 },
  { month: "Oct", current: 1080000, previous: 880000 },
];

export const USERS = [
  { id: "U-001", username: "tmoyo", name: "Tatenda Moyo", role: "Admin", branch: "Harare", status: "active" },
  { id: "U-002", username: "rchirwa", name: "Rudo Chirwa", role: "Branch Manager", branch: "Karoi", status: "active" },
  { id: "U-003", username: "pndlovu", name: "Peter Ndlovu", role: "Weighing Clerk", branch: "Rusape", status: "active" },
  { id: "U-004", username: "mzimba", name: "Mavis Zimba", role: "Sales Clerk", branch: "Marondera", status: "active" },
  { id: "U-005", username: "kbanda", name: "Kudzai Banda", role: "Dispatch Clerk", branch: "Bindura", status: "inactive" },
  { id: "U-006", username: "fchideya", name: "Faith Chideya", role: "Finance Officer", branch: "Harare", status: "active" },
  { id: "U-007", username: "smatemba", name: "Samuel Matemba", role: "Auditor", branch: "Harare", status: "active" },
];

export const ROLES = ["Admin", "Branch Manager", "Weighing Clerk", "Sales Clerk", "Dispatch Clerk", "Finance Officer", "Auditor"];

export const EXCHANGE_RATE = 26.85;
export const SALE_DATE = "2024-10-22";

export const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
export const formatNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
