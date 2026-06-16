import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api, { firebaseLogin, setTokens, clearTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const syncBackendUser = useCallback(async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken();
    const loginData = await firebaseLogin(idToken, {
      name:
        firebaseUser.displayName && firebaseUser.displayName.trim().length >= 2
          ? firebaseUser.displayName.trim()
          : undefined,
    });
    setTokens(loginData.accessToken, loginData.refreshToken);

    const { data: meData } = await api.get('/auth/me');
    const profile = meData.user || loginData.user;
    setUser({
      uid: firebaseUser.uid,
      email: profile.email || firebaseUser.email,
      displayName: profile.name || firebaseUser.displayName,
      photoURL: profile.profile_pic_url || firebaseUser.photoURL,
      role: profile.role,
      tenantId: profile.tenant_id,
      id: profile.id,
      flatNumber: profile.flat_number,
      block: profile.block,
      tenantName: profile.tenant_name,
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await syncBackendUser(firebaseUser);
        } else {
          clearTokens();
          setUser(null);
        }
      } catch (err) {
        console.error('Backend auth error:', err);
        clearTokens();
        setUser(null);
        setError(err.response?.data?.message || err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [syncBackendUser]);

  const loginWithEmail = async (email, password) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // proceed even if backend logout fails
    }
    clearTokens();
    await signOut(auth);
    setUser(null);
  };

  const refreshProfile = async () => {
    const { data } = await api.get('/auth/me');
    const profile = data.user;
    setUser((prev) => ({
      ...prev,
      displayName: profile.name,
      role: profile.role,
      tenantId: profile.tenant_id,
      flatNumber: profile.flat_number,
      block: profile.block,
      tenantName: profile.tenant_name,
    }));
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, loginWithEmail, loginWithGoogle, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
