"use client";
import { useEffect, useState } from "react";
import {
  getStats,
  getOrders,
  getTitles,
  seedDatabase,
  resetDatabase,
} from "@/lib/api";
import {
  BookOpen,
  ShoppingCart,
  Truck,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  Database,
} from "lucide-react";
import Badge from "@/components/Badge";

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentTitles, setRecentTitles] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [s, o, t] = await Promise.all([
        getStats(),
        getOrders(),
        getTitles(),
      ]);
      setStats(s || {});
      setRecentOrders((o || []).slice(0, 5));
      setRecentTitles((t || []).slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSeed = async () => {
    if (confirm("Seed test data from JSON import files?")) {
      setLoading(true);
      await seedDatabase();
      loadAll();
    }
  };

  const handleReset = async () => {
    if (confirm("Reset database and reload default test JSON files?")) {
      setLoading(true);
      await resetDatabase();
      loadAll();
    }
  };

  const cards = [
    {
      label: "Total Titles",
      value: stats.titles,
      icon: BookOpen,
      gradient: "from-blue-500 to-cyan-500",
      bg: "from-blue-50 to-cyan-50",
      trend: "+12%",
    },
    {
      label: "Total Orders",
      value: stats.orders,
      icon: ShoppingCart,
      gradient: "from-emerald-500 to-teal-500",
      bg: "from-emerald-50 to-teal-50",
      trend: "+8%",
    },
    {
      label: "Shipments",
      value: stats.shipments,
      icon: Truck,
      gradient: "from-purple-500 to-pink-500",
      bg: "from-purple-50 to-pink-50",
      trend: "+23%",
    },
    {
      label: "Pending Titles",
      value: stats.pendingTitles,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bg: "from-amber-50 to-orange-50",
      trend: "Active",
    },
    {
      label: "Waiting Orders",
      value: stats.onHoldOrders,
      icon: AlertCircle,
      gradient: "from-red-500 to-pink-500",
      bg: "from-red-50 to-pink-50",
      trend: "Action Req",
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1.5 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full" />
            <h1 className="text-3xl font-extrabold text-slate-900">
              Dashboard
            </h1>
          </div>
          <p className="text-slate-500 ml-4 text-sm">
            Welcome back — Real-time overview of CPI Global Printing Services
            sync
          </p>
        </div>
        {/* <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs flex items-center gap-1.5 transition-all border border-indigo-200/60"
          >
            <Database size={14} /> Import JSON Test Data
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all border border-slate-300"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
            Reset DB
          </button>
        </div> */}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.bg} opacity-30`}
            />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg shadow-black/5`}
                >
                  <card.icon size={20} className="text-white" />
                </div>
                <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 font-bold text-slate-600">
                  <TrendingUp size={11} className="text-emerald-600" />
                  <span>{card.trend}</span>
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                {card.value ?? 0}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <ShoppingCart className="text-white" size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recent Orders
                </h2>
                <p className="text-xs text-slate-400">
                  Latest orders received from CPI
                </p>
              </div>
            </div>
            <a
              href="/orders"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 group"
            >
              View all{" "}
              <ArrowUpRight
                size={12}
                className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </a>
          </div>

          <div className="space-y-2.5 flex-1">
            {recentOrders.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm font-medium">
                No orders yet
              </div>
            )}
            {recentOrders.map((order) => (
              <div
                key={order._id || order.customerRef}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 transition-all border border-slate-200/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center border border-slate-200 font-mono text-xs font-bold text-indigo-600 shadow-sm">
                    ORD
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate font-mono">
                      {order.customerRef}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {order.details?.length || 0} items · {order.companyCode} ·{" "}
                      {order.shippingMethod}
                    </div>
                  </div>
                </div>
                <Badge status={order.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Titles */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                <BookOpen className="text-white" size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recent Titles
                </h2>
                <p className="text-xs text-slate-400">
                  Title setups & PDF ingest status
                </p>
              </div>
            </div>
            <a
              href="/titles"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 group"
            >
              View all{" "}
              <ArrowUpRight
                size={12}
                className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </a>
          </div>
          <div className="space-y-2.5 flex-1">
            {recentTitles.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm font-medium">
                No titles yet
              </div>
            )}
            {recentTitles.map((title) => (
              <div
                key={title._id || title.isbn}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 transition-all border border-slate-200/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center border border-slate-200 font-mono text-xs font-bold text-emerald-600 shadow-sm">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {title.title || title.isbn}
                    </div>
                    <div className="text-xs text-slate-500 font-mono truncate">
                      ISBN: {title.isbn} · {title.bookType} ·{" "}
                      {title.text?.pages || 0} p
                    </div>
                  </div>
                </div>
                <Badge status={title.setupStatus} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
