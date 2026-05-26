import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ByteCode EMS — Authentication",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo placeholder */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-600/25">
            B
          </div>
          <h1 className="text-xl font-semibold text-slate-800">
            ByteCode EMS
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Employee Management System
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
