import { create } from 'zustand';
import { UserRole } from '@medcore/types';
import { fetchApi } from '../lib/api';

export interface UserSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  hospitalId?: string;
  doctorId?: string;
  patientId?: string;
}

interface AuthState {
  user: UserSession | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setSession: (user: UserSession, token: string) => void;
  logout: () => void;
  loginWithCredentials: (email: string, password?: string) => Promise<void>;
  quickLoginAsRole: (role: UserRole) => Promise<void>;
}

export const DEMO_USERS: Record<UserRole, { email: string; pass: string; label: string }> = {
  [UserRole.SUPER_ADMIN]: { email: 'superadmin@medcore.com', pass: 'SuperAdmin@123', label: 'Super Admin' },
  [UserRole.HOSPITAL_ADMIN]: { email: 'admin@citygeneral.com', pass: 'Admin@123', label: 'Hospital Admin' },
  [UserRole.DOCTOR]: { email: 'dr.sharma@citygeneral.com', pass: 'Doctor@123', label: 'Dr. Rajesh Sharma (Cardiology)' },
  [UserRole.NURSE]: { email: 'nurse.sarah@citygeneral.com', pass: 'Admin@123', label: 'Sarah Jenkins (Nurse)' },
  [UserRole.RECEPTIONIST]: { email: 'receptionist@citygeneral.com', pass: 'Admin@123', label: 'Priya Nair (Receptionist)' },
  [UserRole.LAB_TECHNICIAN]: { email: 'labtech@citygeneral.com', pass: 'Admin@123', label: 'Rohan Verma (Lab Tech)' },
  [UserRole.PHARMACIST]: { email: 'pharmacist@citygeneral.com', pass: 'Admin@123', label: 'Meera Patel (Pharmacist)' },
  [UserRole.ACCOUNTANT]: { email: 'accountant@citygeneral.com', pass: 'Admin@123', label: 'Suresh Iyer (Accountant)' },
  [UserRole.PATIENT]: { email: 'patient.john@example.com', pass: 'Patient@123', label: 'John Doe (Patient)' },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  setSession: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('medcore_access_token', token);
      localStorage.setItem('medcore_user', JSON.stringify(user));
    }
    set({ user, token, error: null });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medcore_access_token');
      localStorage.removeItem('medcore_user');
    }
    set({ user: null, token: null });
  },

  loginWithCredentials: async (email: string, password = 'Admin@123') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const { user, accessToken } = res.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('medcore_access_token', accessToken);
        localStorage.setItem('medcore_user', JSON.stringify(user));
      }
      set({ user, token: accessToken, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  quickLoginAsRole: async (role: UserRole) => {
    const creds = DEMO_USERS[role];
    if (creds) {
      await useAuthStore.getState().loginWithCredentials(creds.email, creds.pass);
    }
  },
}));
