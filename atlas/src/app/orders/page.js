"use client";
import { useEffect, useState } from "react";
import { getOrders, sendAck } from "@/lib/api";
import DataTable from "@/components/DataTable";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import {
  ShoppingCart,
  MapPin,
  Package,
  Send,
  Check,
  Building2,
  FileText,
  Clock,
  Truck,
  Code,
  AlertCircle,
  Hash,
  User,
  Phone,
  Mail,
} from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showXml, setShowXml] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getOrders({ status: statusFilter });
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const columns = [
    {
      key: "customerRef",
      label: "Customer Ref",
      render: (r) => (
        <span className="font-mono text-indigo-600 font-bold tracking-tight">
          {r.customerRef}
        </span>
      ),
    },
    {
      key: "companyCode",
      label: "Company",
      render: (r) => r.companyCode || "ARE",
    },
    {
      key: "orderFor",
      label: "For",
      render: (r) => (
        <span className="font-bold text-slate-800">{r.orderFor || "UK"}</span>
      ),
    },
    {
      key: "details",
      label: "Items",
      render: (r) => (
        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 font-mono">
          {r.details?.length || 0} items
        </span>
      ),
    },
    {
      key: "shippingMethod",
      label: "Shipping Method",
      render: (r) => (
        <span className="font-semibold text-slate-700">
          {r.shippingMethod || "Standard"}
        </span>
      ),
    },
    {
      key: "scheduleTypeId",
      label: "Priority",
      render: (r) =>
        r.scheduleTypeId === 1 || r.scheduleTypeId === "1" ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase">
            🔥 Priority (1)
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Standard (0)
          </span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge status={r.status} />,
    },
    {
      key: "ackSent",
      label: "OrderAck",
      render: (r) =>
        r.ackSent ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
            <Check size={14} /> Sent
          </span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Pending</span>
        ),
    },
  ];

  const filters = [
    "",
    "received",
    "waiting_title",
    "released",
    "ack_sent",
    "manufacturing",
    "ready_to_ship",
    "shipped",
    "cancelled",
    "failed",
  ];

  const handleAck = async (id) => {
    try {
      setAckLoading(true);
      await sendAck(id);
      await load();
      setSelected(null);
    } catch (e) {
      alert("Error sending OrderAck: " + e.message);
    } finally {
      setAckLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1.5 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
            <h1 className="text-3xl font-extrabold text-slate-900">Orders</h1>
          </div>
          <p className="text-slate-500 ml-4 text-sm">
            Track and manage customer print orders, shipping addresses, and
            acknowledgments
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex gap-1.5 flex-wrap">
        {filters.map((f) => (
          <button
            key={f || "all"}
            onClick={() => setStatusFilter(f)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all capitalize border ${
              statusFilter === f
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-md shadow-emerald-500/20"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {f ? f.replace(/_/g, " ") : "All Orders"}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={orders}
        onRowClick={(row) => {
          setSelected(row);
          setShowXml(false);
        }}
        loading={loading}
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Order #${selected?.customerRef}`}
        subtitle={`Company: ${selected?.companyCode} · Destination: ${selected?.orderFor} · ${selected?.details?.length || 0} item lines`}
        size="xl"
      >
        {selected && (
          <div className="space-y-6">
            {/* Top Status Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 flex-shrink-0">
                  <ShoppingCart size={26} className="text-white" />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    {selected.customerRef}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    Shipping:{" "}
                    <span className="font-bold text-slate-900">
                      {selected.shippingMethod}
                    </span>{" "}
                    · Priority:{" "}
                    <span className="font-bold text-slate-900">
                      {selected.scheduleTypeId === 1
                        ? "Priority (1)"
                        : "Standard (0)"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end md:self-center">
                <Badge status={selected.status} size="lg" />
                {selected.ackSent && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs shadow-sm">
                    <Check size={14} /> Ack Sent (
                    {selected.ackSentAt
                      ? new Date(selected.ackSentAt).toLocaleTimeString()
                      : "Yes"}
                    )
                  </div>
                )}
              </div>
            </div>

            {/* General Metadata & Identifiers */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Hash size={14} className="text-emerald-600" /> Order Metadata &
                Identifiers
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoCard
                  label="Atlas Order Ref"
                  value={selected.atlasOrderReference || "Pending creation"}
                />
                <InfoCard
                  label="Company Code"
                  value={selected.companyCode || "ARE"}
                />
                <InfoCard
                  label="Order For Country"
                  value={selected.orderFor || "UK"}
                />
                <InfoCard
                  label="Order Source"
                  value={selected.orderSource || "CPI Automated"}
                />
                <InfoCard
                  label="Amazon Reference"
                  value={selected.amazonReference || "None"}
                />
                <InfoCard
                  label="Shipping Account"
                  value={selected.shippingAccount || "Standard partner acct"}
                />
                <InfoCard
                  label="Received At"
                  value={
                    selected.createdAt
                      ? new Date(selected.createdAt).toLocaleString()
                      : "—"
                  }
                />
                <InfoCard
                  label="Last Updated"
                  value={
                    selected.updatedAt
                      ? new Date(selected.updatedAt).toLocaleString()
                      : "—"
                  }
                />
              </div>
            </div>

            {/* Embedded Invoice Alert */}
            {selected.invoiceFile && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    PDF
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-950">
                      Embedded Base64 PDF Invoice Attached
                    </div>
                    <div className="text-xs text-blue-800 font-mono">
                      Payload size:{" "}
                      {Math.round((selected.invoiceFile.length * 0.75) / 1024)}{" "}
                      KB · Ready for auto-printing
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    alert(
                      "Simulation: Downloading decoded invoice file from Base64 string...",
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-blue-300 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-all shadow-sm"
                >
                  Download PDF Invoice
                </button>
              </div>
            )}

            {/* Addresses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping To Address */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                    <MapPin size={16} className="text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Shipping To Address
                    </h3>
                  </div>
                  <div className="text-sm text-slate-800 space-y-1 font-medium">
                    <div className="font-black text-slate-900 text-base">
                      {selected.shippingTo?.companyName ||
                        "No Company Specified"}
                    </div>
                    {selected.shippingTo?.attentionTo && (
                      <div className="text-slate-600 flex items-center gap-1.5 text-xs">
                        <User size={13} className="text-slate-400" /> Attn:{" "}
                        {selected.shippingTo.attentionTo}
                      </div>
                    )}
                    <div className="pt-1">
                      {selected.shippingTo?.address1 || "No address line 1"}
                    </div>
                    {selected.shippingTo?.extendedAddress && (
                      <div>{selected.shippingTo.extendedAddress}</div>
                    )}
                    <div>
                      {selected.shippingTo?.city || ""}
                      {selected.shippingTo?.state
                        ? `, ${selected.shippingTo.state}`
                        : ""}
                      {selected.shippingTo?.postCode
                        ? ` ${selected.shippingTo.postCode}`
                        : ""}
                    </div>
                    {selected.shippingTo?.county && (
                      <div className="text-slate-500 text-xs">
                        County: {selected.shippingTo.county}
                      </div>
                    )}
                    <div className="font-bold text-indigo-700 pt-0.5">
                      Country Code: {selected.shippingTo?.countryCode || "GB"}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap gap-3 text-xs text-slate-600">
                  {selected.shippingTo?.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone size={12} className="text-slate-400" />{" "}
                      {selected.shippingTo.phone}
                    </span>
                  )}
                  {selected.shippingTo?.email && (
                    <span className="flex items-center gap-1 font-mono text-indigo-600">
                      <Mail size={12} className="text-slate-400" />{" "}
                      {selected.shippingTo.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Consolidator Address */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                    <Truck size={16} className="text-purple-600" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Consolidator Address (Freight Hub)
                    </h3>
                  </div>
                  {selected.consolidator &&
                  selected.consolidator.companyName ? (
                    <div className="text-sm text-slate-800 space-y-1 font-medium">
                      <div className="font-black text-slate-900 text-base">
                        {selected.consolidator.companyName}
                      </div>
                      {selected.consolidator.attentionTo && (
                        <div className="text-slate-600 flex items-center gap-1.5 text-xs">
                          <User size={13} className="text-slate-400" /> Attn:{" "}
                          {selected.consolidator.attentionTo}
                        </div>
                      )}
                      <div className="pt-1">
                        {selected.consolidator.address1}
                      </div>
                      {selected.consolidator.extendedAddress && (
                        <div>{selected.consolidator.extendedAddress}</div>
                      )}
                      <div>
                        {selected.consolidator.city || ""}
                        {selected.consolidator.state
                          ? `, ${selected.consolidator.state}`
                          : ""}
                        {selected.consolidator.postCode
                          ? ` ${selected.consolidator.postCode}`
                          : ""}
                      </div>
                      {selected.consolidator.county && (
                        <div className="text-slate-500 text-xs">
                          County: {selected.consolidator.county}
                        </div>
                      )}
                      <div className="font-bold text-purple-700 pt-0.5">
                        Country Code:{" "}
                        {selected.consolidator.countryCode || "GB"}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-sm font-medium">
                      No consolidator handler required for this destination
                    </div>
                  )}
                </div>
                {selected.consolidator && selected.consolidator.companyName && (
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap gap-3 text-xs text-slate-600">
                    {selected.consolidator.phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone size={12} className="text-slate-400" />{" "}
                        {selected.consolidator.phone}
                      </span>
                    )}
                    {selected.consolidator.email && (
                      <span className="flex items-center gap-1 font-mono text-indigo-600">
                        <Mail size={12} className="text-slate-400" />{" "}
                        {selected.consolidator.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Order Details Items Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package size={14} className="text-indigo-600" /> Order Line
                Items ({selected.details?.length || 0})
              </h3>
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-bold">
                        Line ID
                      </th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-bold">
                        ISBN
                      </th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-bold">
                        Title
                      </th>
                      <th className="text-center px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-bold">
                        Qty Ordered
                      </th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-slate-500 font-bold">
                        Title Setup Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selected.details || []).map((item, idx) => (
                      <tr
                        key={item.lineId || idx}
                        className="hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-3 text-slate-500 font-mono font-bold">
                          #{item.lineId}
                        </td>
                        <td className="px-4 py-3 font-mono text-indigo-600 font-bold">
                          {item.isbn}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {item.title || "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-black text-sm border border-indigo-200">
                            {item.qty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge status={item.titleStatus || "received"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Raw XML Inspector */}
            {selected.rawXml && (
              <div>
                <button
                  onClick={() => setShowXml(!showXml)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2"
                >
                  <Code size={14} />{" "}
                  {showXml
                    ? "Hide Raw Order.XML Payload"
                    : "Inspect Raw Order.XML Payload"}
                </button>
                {showXml && (
                  <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-emerald-400 overflow-auto max-h-60 font-mono">
                    {selected.rawXml}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-slate-900 truncate">
        {value !== undefined && value !== null && value !== ""
          ? String(value)
          : "—"}
      </div>
    </div>
  );
}
