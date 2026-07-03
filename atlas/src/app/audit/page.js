"use client";
import { useEffect, useState } from "react";
import { getAudit } from "@/lib/api";
import Badge from "@/components/Badge";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  FileText,
  Code,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getAudit();
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = logs.filter((l) =>
    filter === "all"
      ? true
      : filter === "incoming"
        ? l.direction === "incoming" || l.direction === "from_cpi"
        : l.direction === "outgoing" || l.direction === "to_cpi",
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1.5 h-8 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />
          <h1 className="text-3xl font-extrabold text-slate-900">Audit Logs</h1>
        </div>
        <p className="text-slate-500 ml-4 text-sm">
          Complete SOAP XML audit trail for inbound orders, title setups,
          acknowledgments, and ASNs
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex gap-2 flex-wrap">
        {[
          { id: "all", label: "All SOAP Traffic", count: logs.length },
          {
            id: "incoming",
            label: "Incoming ← CPI",
            count: logs.filter(
              (l) => l.direction === "incoming" || l.direction === "from_cpi",
            ).length,
          },
          {
            id: "outgoing",
            label: "Outgoing → CPI",
            count: logs.filter(
              (l) => l.direction === "outgoing" || l.direction === "to_cpi",
            ).length,
          },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
              filter === f.id
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-md shadow-amber-500/20"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {f.label}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                filter === f.id
                  ? "bg-white/25 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse bg-slate-50 rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log, idx) => {
            const isExpanded = expanded === (log._id || idx);
            const isIncoming =
              log.direction === "incoming" || log.direction === "from_cpi";

            return (
              <div
                key={log._id || idx}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
              >
                <button
                  onClick={() =>
                    setExpanded(isExpanded ? null : log._id || idx)
                  }
                  className="w-full p-4 flex items-center gap-4 hover:bg-slate-50/70 transition-all text-left"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                      isIncoming
                        ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/10"
                        : "bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/10"
                    }`}
                  >
                    {isIncoming ? (
                      <ArrowDownLeft size={20} className="text-white" />
                    ) : (
                      <ArrowUpRight size={20} className="text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900 font-mono">
                        {log.operation}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isIncoming
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {isIncoming ? "INBOUND" : "OUTBOUND"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                      <span>HTTP {log.httpStatus || 200}</span>
                      <span>·</span>
                      <span className="truncate max-w-md font-mono">
                        {log.error
                          ? `Error: ${log.error}`
                          : log.response
                            ? "Completed successfully"
                            : "No response body"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <Badge status={log.success} />
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-700">
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleDateString()
                          : "Today"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleTimeString()
                          : "—"}
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-slate-700" : ""
                      }`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 space-y-4 bg-slate-50/50 animate-fade-in">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-white border border-slate-200/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Direction
                        </div>
                        <div className="text-sm font-black text-slate-800 capitalize">
                          {log.direction}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          HTTP Status
                        </div>
                        <div className="text-sm font-black text-slate-800">
                          {log.httpStatus || 200}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          SOAP Operation
                        </div>
                        <div className="text-sm font-black text-slate-800 font-mono">
                          {log.operation}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Timestamp
                        </div>
                        <div className="text-xs font-bold text-slate-800 font-mono">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString()
                            : "—"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5 font-bold">
                        <Code size={14} className="text-amber-600" /> SOAP XML
                        Payload (
                        {log.direction === "incoming"
                          ? "Received from CPI"
                          : "Sent to CPI"}
                        )
                      </div>
                      <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-emerald-400 overflow-auto max-h-64 font-mono shadow-inner">
                        {log.payload || "Empty payload"}
                      </pre>
                    </div>

                    {log.response && (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5 font-bold">
                          <CheckCircle2 size={14} className="text-blue-600" />{" "}
                          SOAP Response Body (
                          {log.direction === "incoming"
                            ? "Returned to CPI"
                            : "Received from CPI"}
                          )
                        </div>
                        <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-blue-400 overflow-auto max-h-48 font-mono shadow-inner">
                          {log.response}
                        </pre>
                      </div>
                    )}

                    {log.error && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                        <AlertTriangle
                          size={18}
                          className="text-red-600 flex-shrink-0 mt-0.5"
                        />
                        <div>
                          <div className="text-xs text-red-800 font-bold uppercase tracking-wider mb-0.5">
                            SOAP Transaction Error / Exception
                          </div>
                          <div className="text-sm text-red-900 font-mono font-medium">
                            {log.error}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200">
              <div className="text-6xl mb-4">📋</div>
              <div className="text-slate-600 font-bold text-lg">
                No audit logs match your filter
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Select a different tab to inspect SOAP traffic
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
