"use client";
import { useEffect, useState } from "react";
import { getShipments, createShipment, getOrders } from "@/lib/api";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import {
  Truck,
  Plus,
  Send,
  Check,
  Hash,
  Calendar,
  DollarSign,
  Scale,
  Box,
} from "lucide-react";

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    orderId: "",
    carrier: "DHL Express",
    tracking: "",
    bookingRef: "",
    deliveryCost: 25.0,
    currency: "GBP",
    deliveryWeight: 4.5,
    weightUnit: "kg",
  });

  const load = async () => {
    try {
      setLoading(true);
      const [s, o] = await Promise.all([getShipments(), getOrders()]);
      setShipments(s || []);
      // Filter for orders that can be shipped
      const shippable = (o || []).filter(
        (ord) =>
          ord.status === "manufacturing" ||
          ord.status === "ready_to_ship" ||
          ord.status === "released" ||
          ord.status === "received",
      );
      setOrders(shippable);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.orderId) return alert("Please select an order");
    try {
      setSubmitting(true);
      await createShipment(form);
      setOpen(false);
      setForm({
        orderId: "",
        carrier: "DHL Express",
        tracking: "",
        bookingRef: "",
        deliveryCost: 25.0,
        currency: "GBP",
        deliveryWeight: 4.5,
        weightUnit: "kg",
      });
      load();
    } catch (err) {
      alert("Error creating shipment: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
      key: "atlasOrderReference",
      label: "Atlas Ref",
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-600">
          {r.atlasOrderReference || "—"}
        </span>
      ),
    },
    {
      key: "carrier",
      label: "Carrier",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
            <Truck size={13} className="text-white" />
          </div>
          <span className="font-bold text-slate-800">{r.carrier}</span>
        </div>
      ),
    },
    {
      key: "tracking",
      label: "Tracking / Waybill",
      render: (r) => (
        <span className="font-mono text-xs text-slate-700 font-semibold">
          {r.tracking || r.trackingNumber || "—"}
        </span>
      ),
    },
    {
      key: "deliveryCost",
      label: "Cost",
      render: (r) => (
        <span className="font-black text-slate-900 font-mono">
          {r.currency || "GBP"} {Number(r.deliveryCost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "deliveryWeight",
      label: "Weight",
      render: (r) => (
        <span className="font-mono text-xs text-slate-600 font-bold">
          {r.deliveryWeight || 0} {r.weightUnit || "kg"}
        </span>
      ),
    },
    {
      key: "dispatchDate",
      label: "Dispatch Date",
      render: (r) => (
        <span className="text-slate-500 text-xs font-medium">
          {r.dispatchDate
            ? new Date(r.dispatchDate).toLocaleDateString()
            : r.shipDate
              ? new Date(r.shipDate).toLocaleDateString()
              : "—"}
        </span>
      ),
    },
    {
      key: "asnSent",
      label: "ASN Status",
      render: (r) =>
        r.asnSent ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-sm">
            <Check size={12} /> ASN Sent
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            ⏳ Pending
          </span>
        ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1.5 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
            <h1 className="text-3xl font-extrabold text-slate-900">
              Shipments
            </h1>
          </div>
          <p className="text-slate-500 ml-4 text-sm">
            Manage dispatch manifests, tracking waybills, and automated ASN
            notifications to CPI
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 flex items-center gap-2 hover:opacity-95 transition-all self-start md:self-center"
        >
          <Plus size={16} /> Create Shipment & Send ASN
        </button>
      </div>

      <DataTable
        columns={columns}
        data={shipments}
        onRowClick={setSelected}
        loading={loading}
      />

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Shipment Dispatch Manifest"
        subtitle={`Customer Ref: ${selected?.customerRef} · Atlas Ref: ${selected?.atlasOrderReference || "N/A"}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Truck size={22} className="text-white" />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    {selected.tracking || "No Tracking Number"}
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    Carrier:{" "}
                    <span className="font-bold text-purple-900">
                      {selected.carrier}
                    </span>{" "}
                    · Booking Ref: {selected.bookingRef || "None"}
                  </div>
                </div>
              </div>
              <div>
                {selected.asnSent ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-sm">
                    <Check size={14} /> ASN Sent (
                    {selected.asnSentAt
                      ? new Date(selected.asnSentAt).toLocaleTimeString()
                      : "Yes"}
                    )
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
                    ⏳ ASN Pending
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoCard
                label="Customer Ref"
                value={selected.customerRef}
                icon={Box}
              />
              <InfoCard
                label="Atlas Order Ref"
                value={selected.atlasOrderReference}
                icon={Hash}
              />
              <InfoCard label="Carrier" value={selected.carrier} icon={Truck} />
              <InfoCard label="Tracking / Waybill" value={selected.tracking} />
              <InfoCard
                label="Booking Reference"
                value={selected.bookingRef || "None"}
              />
              <InfoCard
                label="Delivery Cost"
                value={`${selected.currency || "GBP"} ${Number(selected.deliveryCost || 0).toFixed(2)}`}
                icon={DollarSign}
              />
              <InfoCard
                label="Delivery Weight"
                value={`${selected.deliveryWeight || 0} ${selected.weightUnit || "kg"}`}
                icon={Scale}
              />
              <InfoCard
                label="Dispatch Date"
                value={
                  selected.dispatchDate
                    ? new Date(selected.dispatchDate).toLocaleDateString()
                    : "—"
                }
                icon={Calendar}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Create Shipment Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Shipment & Dispatch ASN"
        subtitle="Generate shipping manifest and trigger automated GPSSubmitASN XML to CPI"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-500 mb-1.5 block font-bold">
              Select Order Ready for Dispatch
            </label>
            <select
              value={form.orderId}
              onChange={(e) => {
                const ord = orders.find((o) => o._id === e.target.value);
                setForm({
                  ...form,
                  orderId: e.target.value,
                  tracking: ord
                    ? `TRK-${ord.customerRef}-${Date.now().toString().slice(-4)}`
                    : "",
                  bookingRef: ord?.amazonReference
                    ? `ARN-${ord.amazonReference}`
                    : "",
                });
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select an order...</option>
              {orders.map((o) => (
                <option key={o._id || o.customerRef} value={o._id}>
                  {o.customerRef} ({o.companyCode}) — {o.details?.length || 0}{" "}
                  items — {o.shippingMethod}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-1.5 block font-bold">
                Carrier Name
              </label>
              <input
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. DHL Express, UPS"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-1.5 block font-bold">
                Tracking Number
              </label>
              <input
                value={form.tracking}
                onChange={(e) => setForm({ ...form, tracking: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="JD0146000039..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-slate-500 mb-1.5 block font-bold">
              Booking Ref / Amazon ARN (Optional)
            </label>
            <input
              value={form.bookingRef}
              onChange={(e) => setForm({ ...form, bookingRef: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="BOOK-XXX / ARN-123"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-1.5 block font-bold">
                Delivery Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={form.deliveryCost}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deliveryCost: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-1.5 block font-bold">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option>GBP</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-1.5 block font-bold">
                Total Weight
              </label>
              <input
                type="number"
                step="0.1"
                value={form.deliveryWeight}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deliveryWeight: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-1.5 block font-bold">
                Weight Unit
              </label>
              <select
                value={form.weightUnit}
                onChange={(e) =>
                  setForm({ ...form, weightUnit: e.target.value })
                }
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option>kg</option>
                <option>lb</option>
              </select>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!form.orderId || submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 hover:opacity-95 transition-all mt-4 disabled:opacity-50"
          >
            <Send size={16} />{" "}
            {submitting
              ? "Transmitting ASN..."
              : "Create Shipment & Dispatch ASN (GPSSubmitASN)"}
          </button>
        </div>
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
