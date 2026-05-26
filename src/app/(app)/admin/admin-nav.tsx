'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { UsersIcon, Building2Icon } from 'lucide-react'

interface AdminNavProps {
  role: string
}

const tabs = [
  {
    href: '/admin/users',
    label: 'Users',
    icon: UsersIcon,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/admin/departments',
    label: 'Departments',
    icon: Building2Icon,
    roles: ['super_admin'],
  },
]

export function AdminNav({ role }: AdminNavProps) {
  const pathname = usePathname()

  const visibleTabs = tabs.filter((t) => t.roles.includes(role))

  return (
    <nav className="flex gap-1 border-b border-slate-200 pb-0">
      {visibleTabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
              isActive
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
