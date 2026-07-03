"use client";

export default function DataTable({ columns, data = [], onRowClick, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse bg-slate-50/60 border-b border-slate-100 last:border-0"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr
                key={row._id || row.isbn || row.customerRef || i}
                onClick={() => onRowClick?.(row)}
                className={`transition-all duration-150 ${
                  onRowClick ? "cursor-pointer hover:bg-indigo-50/40" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap"
                  >
                    {col.render
                      ? col.render(row)
                      : row[col.key] !== undefined && row[col.key] !== null
                        ? String(row[col.key])
                        : "—"}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-16">
                  <div className="text-slate-400">
                    <div className="text-5xl mb-3">📭</div>
                    <div className="font-semibold text-slate-600">
                      No records found
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Try adjusting your filters or search query
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
