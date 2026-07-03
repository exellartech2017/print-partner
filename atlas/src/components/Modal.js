"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "lg",
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${sizes[size]} w-full max-h-[92vh] overflow-hidden rounded-2xl bg-white border border-slate-200 flex flex-col shadow-2xl`}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">{children}</div>
      </div>
    </div>
  );
}
