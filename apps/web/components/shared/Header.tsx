'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore, DEMO_USERS } from '../../store/authStore';
import { UserRole } from '@medcore/types';
import { fetchApi } from '../../lib/api';
import {
  Bell,
  Search,
  Activity,
  LogOut,
  ChevronDown,
  ShieldCheck,
  User,
  CheckCircle2,
  X,
  Stethoscope,
} from 'lucide-react';

export function Header() {
  const { user, logout, quickLoginAsRole } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ patients: any[]; doctors: any[]; medicines: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);

  // Load notifications
  useEffect(() => {
    if (!user) return;
    const loadNotifs = async () => {
      try {
        const res = await fetchApi('/notifications/me');
        if (res.data) {
          setNotifications(res.data);
          setUnreadCount(res.data.filter((n: any) => !n.read).length);
        }
      } catch {
        // quiet failure
      }
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Global search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetchApi(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data);
      } catch {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const markAllRead = async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // quiet
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-xs">
      {/* Brand & Hospital context */}
      <div className="flex items-center space-x-3">
        <div className="bg-sky-600 text-white p-2 rounded-xl flex items-center justify-center shadow-sm shadow-sky-200">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-slate-900 tracking-tight">MedCore</span>
            <span className="text-xs bg-sky-100 text-sky-700 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              HMS
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">City General Hospital • Multi-Tenant</p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative w-80 lg:w-96" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients (MRN), doctors, drugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm pl-10 pr-8 py-2 rounded-lg border border-transparent focus:border-sky-500 focus:outline-hidden transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-3 max-h-96 overflow-y-auto z-50">
            {searchResults.patients.length === 0 &&
              searchResults.doctors.length === 0 &&
              searchResults.medicines.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No matching records found.</p>
              )}

            {searchResults.patients.length > 0 && (
              <div className="mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Patients</span>
                <div className="mt-1 space-y-1">
                  {searchResults.patients.map((p) => (
                    <div key={p.id} className="p-2 hover:bg-sky-50 rounded-lg cursor-pointer text-xs flex justify-between">
                      <span className="font-semibold text-slate-800">{p.name}</span>
                      <span className="text-sky-600 font-mono">{p.mrn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.doctors.length > 0 && (
              <div className="mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Doctors</span>
                <div className="mt-1 space-y-1">
                  {searchResults.doctors.map((d) => (
                    <div key={d.id} className="p-2 hover:bg-emerald-50 rounded-lg cursor-pointer text-xs flex justify-between">
                      <span className="font-semibold text-slate-800">{d.name}</span>
                      <span className="text-emerald-600">{d.specialization}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.medicines.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Pharmacy</span>
                <div className="mt-1 space-y-1">
                  {searchResults.medicines.map((m) => (
                    <div key={m.id} className="p-2 hover:bg-amber-50 rounded-lg cursor-pointer text-xs flex justify-between">
                      <span className="font-semibold text-slate-800">{m.name}</span>
                      <span className="text-amber-600 font-mono">{m.stock} units in stock</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Role Switcher, Notifications, User */}
      <div className="flex items-center space-x-4">
        {/* Quick Role Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-sky-600" />
            <span>Role: <strong className="text-sky-700">{user?.role?.replace('_', ' ')}</strong></span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Switch Demo Role (9 Roles)
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {Object.entries(DEMO_USERS).map(([roleKey, info]) => {
                  const isActive = user?.role === roleKey;
                  return (
                    <button
                      key={roleKey}
                      onClick={async () => {
                        setShowRoleMenu(false);
                        await quickLoginAsRole(roleKey as UserRole);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-sky-50 transition-colors ${
                        isActive ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <span>{info.label}</span>
                      {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-semibold text-sm text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-sky-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 mt-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id || n.id} className={`py-2 text-xs ${n.read ? 'opacity-60' : 'bg-sky-50/50 rounded-sm px-1'}`}>
                      <div className="font-semibold text-slate-800">{n.title}</div>
                      <div className="text-slate-600 text-[11px] mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge & Logout */}
        <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">
              {user ? `${user.firstName} ${user.lastName}` : 'Guest User'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
