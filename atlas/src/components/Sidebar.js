// "use client";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import {
//   LayoutDashboard,
//   BookOpen,
//   ShoppingCart,
//   Truck,
//   FileText,
//   Zap,
// } from "lucide-react";

// const links = [
//   { href: "/", label: "Dashboard", icon: LayoutDashboard },
//   { href: "/titles", label: "Titles", icon: BookOpen },
//   { href: "/orders", label: "Orders", icon: ShoppingCart },
//   { href: "/shipments", label: "Shipments", icon: Truck },
//   { href: "/audit", label: "Audit Logs", icon: FileText },
// ];

// export default function Sidebar() {
//   const path = usePathname();

//   return (
//     <aside className="w-64 h-screen sticky top-0 p-4 bg-white border-r border-slate-200 flex flex-col justify-between">
//       <div>
//         {/* Logo */}
//         <div className="flex items-center gap-3 px-3 py-4 mb-8">
//           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
//             <Zap className="text-white" size={20} fill="white" />
//           </div>
//           <div>
//             <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
//               ATLAS
//             </h1>
//             <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
//               Print Partner Portal
//             </p>
//           </div>
//         </div>

//         {/* Navigation */}
//         <nav className="space-y-1.5">
//           <p className="text-[10px] uppercase tracking-widest text-slate-400 px-3 mb-2 font-bold">
//             Menu
//           </p>
//           {links.map(({ href, label, icon: Icon }) => {
//             const isActive = path === href;
//             return (
//               <Link
//                 key={href}
//                 href={href}
//                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
//                   isActive
//                     ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25"
//                     : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
//                 }`}
//               >
//                 <Icon
//                   size={18}
//                   className={
//                     isActive
//                       ? "text-white"
//                       : "text-slate-400 group-hover:text-indigo-600 transition-colors"
//                   }
//                 />
//                 <span>{label}</span>
//                 {isActive && (
//                   <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
//                 )}
//               </Link>
//             );
//           })}
//         </nav>
//       </div>
//     </aside>
//   );
// }

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Truck,
  FileText,
  Zap,
  Layers3,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/titles", label: "Titles", icon: BookOpen },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/shipments", label: "Shipments", icon: Truck },
  { href: "/audit", label: "Audit Logs", icon: FileText },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-64 h-screen sticky top-0 p-4 bg-white border-r border-slate-200 flex flex-col justify-between">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="text-white" size={20} fill="white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ATLAS
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Print Partner Portal
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 px-3 mb-2 font-bold">
            Menu
          </p>
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = path === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon
                  size={18}
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-indigo-600 transition-colors"
                  }
                />
                <span>{label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
