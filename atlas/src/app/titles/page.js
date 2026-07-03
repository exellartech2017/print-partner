"use client";
import { useEffect, useState } from "react";
import { getTitles, retryTitle, updateTitleStatus } from "@/lib/api";
import DataTable from "@/components/DataTable";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import {
  Search,
  BookOpen,
  RefreshCw,
  FileText,
  Package,
  Check,
  AlertCircle,
  Clock,
  Layers,
  Code,
  Shield,
  Calendar,
  Mail,
  Building,
  Ruler,
  Hash,
  Send,
} from "lucide-react";

const HANDSHAKE_CODES = [
  {
    code: 1,
    description: "Title setup complete, title available to order",
    label: "Live / Ready",
    success: true,
  },
  {
    code: 100,
    description: "error download text",
    label: "Text file download error",
    success: false,
  },
  {
    code: 101,
    description: "error download cover",
    label: "Cover file download error",
    success: false,
  },
  {
    code: 102,
    description: "error download plate",
    label: "Plate file download error",
    success: false,
  },
  {
    code: 103,
    description: "VSpecs - invalid booktype",
    label: "Invalid / unmapped booktype",
    success: false,
  },
  {
    code: 106,
    description: "Unknown paperstock requested",
    label: "Unknown / unmapped paperstock",
    success: false,
  },
  {
    code: 999,
    description: "download error other",
    label: "Other error",
    success: false,
  },
];

export default function TitlesPage() {
  const [titles, setTitles] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showXml, setShowXml] = useState(false);
  const [handshakeCode, setHandshakeCode] = useState(1);
  const [sendingHandshake, setSendingHandshake] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getTitles({ search, status: statusFilter });
      setTitles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, statusFilter]);

  const columns = [
    {
      key: "isbn",
      label: "ISBN",
      render: (r) => (
        <span className="font-mono text-indigo-600 font-bold tracking-tight">
          {r.isbn}
        </span>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (r) => (
        <div className="max-w-xs truncate">
          <span className="font-bold text-slate-900">{r.title || "—"}</span>
          {r.sets && r.sets.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">
              Set ({r.sets.length})
            </span>
          )}
        </div>
      ),
    },
    { key: "author", label: "Author", render: (r) => r.author || "—" },
    {
      key: "bookType",
      label: "Type",
      render: (r) => (
        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs text-slate-700 border border-slate-200 font-bold">
          {r.bookType || r.booktype || "—"}
        </span>
      ),
    },
    {
      key: "trimSize",
      label: "Trim Size",
      render: (r) => (
        <span className="font-mono text-xs text-slate-600">
          {r.trimSize
            ? `${r.trimSize.width}×${r.trimSize.height} ${r.trimSize.unit}`
            : "—"}
        </span>
      ),
    },
    {
      key: "setupStatus",
      label: "Setup Status",
      render: (r) => <Badge status={r.setupStatus || r.status} />,
    },
    {
      key: "createdAt",
      label: "Received",
      render: (r) => (
        <span className="text-slate-400 text-xs font-medium">
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
  ];

  const filters = [
    "",
    "received",
    "validating",
    "downloading",
    "waiting",
    "ready",
    "live",
    "failed",
  ];

  const sendHandshake = async () => {
    const entry = HANDSHAKE_CODES.find((h) => h.code === handshakeCode);
    if (!entry) return;
    if (
      !confirm(
        `Send TitleSetupHandshake to CPI?\n\nCode: ${entry.code}\nDescription: "${entry.description}"\nSuccess: ${entry.success}`,
      )
    )
      return;
    try {
      setSendingHandshake(true);
      await updateTitleStatus(selected._id, {
        status: entry.success ? "live" : "failed",
        code: entry.code,
        description: entry.description,
        success: entry.success,
      });
      await load();
      setSelected(null);
    } catch (err) {
      alert("Error sending handshake: " + err.message);
    } finally {
      setSendingHandshake(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
          <h1 className="text-3xl font-extrabold text-slate-900">Titles</h1>
        </div>
        <p className="text-slate-500 ml-4 text-sm">
          Manage book title setups, component PDF ingest, and CPI handshake
          verifications
        </p>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ISBN, title, or author..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f || "all"}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all capitalize border ${
                statusFilter === f
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-transparent shadow-md shadow-blue-500/20"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {f || "All Statuses"}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={titles}
        onRowClick={(row) => {
          setSelected(row);
          setShowXml(false);
          setHandshakeCode(1);
        }}
        loading={loading}
      />

      {/* Complete Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || "Title Setup Details"}
        subtitle={`ISBN: ${selected?.isbn} · Publisher Code: ${selected?.publisherCode || "ARE"}`}
        size="xl"
      >
        {selected && (
          <div className="space-y-6">
            {/* Top Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200/60 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
                  <BookOpen size={26} className="text-white" />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900">
                    {selected.title}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    By {selected.author || "Unknown"} · Route:{" "}
                    <span className="font-bold text-indigo-700">
                      {selected.route || "Live"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-center">
                <Badge
                  status={selected.setupStatus || selected.status}
                  size="lg"
                />
              </div>
            </div>

            {/* Multivolume Set Alert */}
            {selected.sets && selected.sets.length > 0 && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-800 mb-2">
                  <Layers size={16} /> Multivolume Set Parent Title
                </div>
                <div className="text-sm text-purple-900 mb-2 font-medium">
                  This title links {selected.sets.length} child ISBNs together
                  as a physical set:
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.sets.map((childIsbn) => (
                    <span
                      key={childIsbn}
                      className="px-2.5 py-1 rounded-lg bg-white border border-purple-300 text-purple-700 font-mono font-bold text-xs shadow-sm"
                    >
                      📚 {childIsbn}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* General Metadata & Authentication */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Shield size={14} className="text-indigo-600" /> Title Metadata
                & CPI Credentials
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoCard
                  label="Identity"
                  value={selected.identity || "ARE"}
                  icon={Shield}
                />
                <InfoCard
                  label="Company Code"
                  value={selected.companyCode || "ARE"}
                  icon={Building}
                />
                <InfoCard
                  label="Publisher Code"
                  value={selected.publisherCode || "ARE"}
                />
                <InfoCard
                  label="Sent Date"
                  value={
                    selected.sentDate
                      ? new Date(selected.sentDate).toLocaleDateString()
                      : "—"
                  }
                  icon={Calendar}
                />
                <InfoCard
                  label="Book Type (mapped)"
                  value={selected.bookType || "SQB"}
                />
                <InfoCard
                  label="Trim Size"
                  value={
                    selected.trimSize
                      ? `${selected.trimSize.width}×${selected.trimSize.height} ${selected.trimSize.unit}`
                      : "—"
                  }
                  icon={Ruler}
                />
                <InfoCard
                  label="Workflow Title"
                  value={selected.batchWorkflowTitle || "Standard"}
                />
                <InfoCard
                  label="Notification Email"
                  value={selected.email || "production@partner.co.uk"}
                  icon={Mail}
                />
              </div>
            </div>

            {/* Text Specification */}
            {selected.text && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-600" /> Text
                  Component Specifications
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <InfoCard label="Pages" value={selected.text.pages} />
                  <InfoCard
                    label="Paper Stock (mapped)"
                    value={selected.text.paperStock || "—"}
                  />
                  <InfoCard
                    label="Color Pages"
                    value={selected.text.colorPages || 0}
                  />
                  <InfoCard
                    label="Half-tone Images"
                    value={selected.text.halfToneImages ? "Yes (Active)" : "No"}
                  />
                  <InfoCard
                    label="Origin"
                    value={selected.text.origin || "Electronic"}
                  />
                  <InfoCard
                    label="Source"
                    value={selected.text.source || "Web"}
                  />
                  <InfoCard
                    label="Pin Code Required"
                    value={selected.text.pinCode ? "Yes" : "No"}
                  />
                  <InfoCard
                    label="Pin Coordinates"
                    value={
                      selected.text.pinCode && selected.text.pinCoordinates
                        ? `L:${selected.text.pinCoordinates.left}, B:${selected.text.pinCoordinates.bottom} ${selected.text.pinCoordinates.unit}`
                        : "N/A"
                    }
                  />
                </div>
              </div>
            )}

            {/* Cover Specification */}
            {selected.cover && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Package size={14} className="text-purple-600" /> Cover
                  Component Specifications
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <InfoCard
                    label="Lamination"
                    value={selected.cover.lamination || "Gloss"}
                  />
                  <InfoCard
                    label="Double Sided Print"
                    value={
                      selected.cover.doubleSided
                        ? "Yes (Inside Print)"
                        : "No (Single Sided)"
                    }
                  />
                  <InfoCard
                    label="Origin"
                    value={selected.cover.origin || "Electronic"}
                  />
                  <InfoCard
                    label="Source"
                    value={selected.cover.source || "Web"}
                  />
                </div>
              </div>
            )}

            {/* Plate Specification (if any) */}
            {selected.plate && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers size={14} className="text-emerald-600" /> Plate
                  Section Specifications
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <InfoCard
                    label="Plate Number"
                    value={selected.plate.number || 0}
                  />
                  <InfoCard
                    label="Color Pages"
                    value={selected.plate.colorPages || 0}
                  />
                  <InfoCard
                    label="Origin"
                    value={selected.plate.origin || "Electronic"}
                  />
                  <InfoCard
                    label="Instructions"
                    value={selected.plate.instructions || "None"}
                  />
                </div>
                {selected.plate.instructions && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700">
                    <span className="font-bold text-slate-900">
                      Binding Rule:
                    </span>{" "}
                    {selected.plate.instructions}
                  </div>
                )}
              </div>
            )}

            {/* Component PDF Files Store */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-600" /> Component PDF
                Files (Downloaded & MD5-Verified)
              </h3>
              <div className="space-y-2.5">
                {selected.text?.file?.url && (
                  <FileRow
                    label="Text PDF File"
                    file={selected.text.file}
                    gradient="from-blue-500 to-cyan-500"
                    icon={FileText}
                  />
                )}
                {selected.cover?.file?.url && (
                  <FileRow
                    label="Cover PDF File"
                    file={selected.cover.file}
                    gradient="from-purple-500 to-pink-500"
                    icon={Package}
                  />
                )}
                {selected.plate?.file?.url && (
                  <FileRow
                    label="Plate PDF File"
                    file={selected.plate.file}
                    gradient="from-emerald-500 to-teal-500"
                    icon={Layers}
                  />
                )}
              </div>
            </div>

            {/* Handshake Status & CPI Communication */}
            {selected.handshake && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Check size={14} className="text-teal-600" /> CPI
                  TitleSetupHandshake Status
                </h3>
                <div
                  className={`p-4 rounded-xl border ${selected.handshake.success ? "bg-emerald-50/70 border-emerald-200" : "bg-red-50/70 border-red-200"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${selected.handshake.success ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
                      >
                        Code: {selected.handshake.code ?? 0}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {selected.handshake.success
                          ? "Setup Successful & Verified"
                          : "Setup Failed / Action Required"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      Sent:{" "}
                      {selected.handshake.sent
                        ? selected.handshake.sentAt
                          ? new Date(
                              selected.handshake.sentAt,
                            ).toLocaleTimeString()
                          : "Yes"
                        : "Not sent yet"}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-700">
                    {selected.handshake.description ||
                      "No description provided."}
                  </div>
                </div>
              </div>
            )}

            {/* Raw XML Inspector */}
            {selected.rawXml && (
              <div>
                <button
                  onClick={() => setShowXml(!showXml)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2"
                >
                  <Code size={14} />{" "}
                  {showXml
                    ? "Hide Raw Title.XML Payload"
                    : "Inspect Raw Title.XML Payload"}
                </button>
                {showXml && (
                  <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-emerald-400 overflow-auto max-h-60 font-mono">
                    {selected.rawXml}
                  </pre>
                )}
              </div>
            )}

            {/* CPI Handshake Override — only documented titleStatusCode values */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 shadow-lg">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  ⚡ CPI TitleSetupHandshake Override
                </div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">
                  Manually send a handshake to CPI. Only the codes documented in
                  the GPS workflow spec are available — an operator cannot
                  invent an undocumented status.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <select
                  value={handshakeCode}
                  onChange={(e) => setHandshakeCode(Number(e.target.value))}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {HANDSHAKE_CODES.map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} — {h.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={sendHandshake}
                  disabled={sendingHandshake}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 ${
                    HANDSHAKE_CODES.find((h) => h.code === handshakeCode)
                      ?.success
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  <Send size={14} />
                  {sendingHandshake ? "Sending..." : "Send Handshake"}
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono px-0.5">
                description: "
                {
                  HANDSHAKE_CODES.find((h) => h.code === handshakeCode)
                    ?.description
                }
                "
              </div>

              {(selected.setupStatus === "failed" ||
                (selected.handshake && !selected.handshake.success)) && (
                <button
                  onClick={async () => {
                    await retryTitle(selected._id);
                    load();
                    setSelected(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all mt-2"
                >
                  <RefreshCw size={14} /> Re-validate & Retry Automated Setup
                  (re-downloads &amp; re-checks MD5)
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className="text-sm font-bold text-slate-900 truncate">
        {value !== undefined && value !== null && value !== ""
          ? String(value)
          : "—"}
      </div>
    </div>
  );
}

function FileRow({ icon: Icon, label, file, gradient }) {
  const sizeKb = file.size ? (file.size / 1024).toFixed(1) : "0";
  const sizeMb = file.size ? (file.size / (1024 * 1024)).toFixed(2) : "0";
  const displaySize = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md flex-shrink-0`}
        >
          <Icon size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>{label}</span>
            {file.downloaded ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ✓ Downloaded & Verified
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                ⏳ Pending Download
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-mono truncate">
            {file.url || "No external URL"}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0 text-xs font-mono">
        <div className="font-bold text-slate-700">{displaySize}</div>
        <div
          className="text-slate-400 text-[10px] truncate max-w-[150px]"
          title={file.md5}
        >
          MD5: {file.md5 || "N/A"}
        </div>
      </div>
    </div>
  );
}
