import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase/config";
import { api } from "../api";
import { UserProfile } from "../types";

export type AuthState = "authenticated" | "unauthenticated" | "loading";

export interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  authState: AuthState;
  isConfigured: boolean;
  isOnline: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  signup: (email: string, password: string, displayName?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseError(err: any): string {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email address or password. Please check your credentials.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please sign in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please choose a password with at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address format.";
    case "auth/network-request-failed":
      return "Network connection unavailable. Please check your internet connectivity.";
    case "auth/too-many-requests":
      return "Too many failed login attempts. Access temporarily disabled for security.";
    case "auth/user-disabled":
      return "This account has been disabled by security administrators.";
    default:
      return err?.message || "Authentication failed. Please try again.";
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const isConfigured = isFirebaseConfigured() && Boolean(auth);

  // Monitor connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Session restoration via onAuthStateChanged or local token
  useEffect(() => {
    let isMounted = true;

    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (!isMounted) return;

        if (fbUser) {
          setFirebaseUser(fbUser);
          try {
            // Get Firebase ID token and store for API headers
            const token = await fbUser.getIdToken();
            localStorage.setItem("nc_token", token);

            // Fetch profile from Firestore if available
            let profile: UserProfile | null = null;
            if (db) {
              const userRef = doc(db, "users", fbUser.uid);
              const snap = await getDoc(userRef);
              if (snap.exists()) {
                const d = snap.data();
                profile = {
                  id: fbUser.uid,
                  email: fbUser.email || "",
                  display_name: d.displayName || fbUser.displayName || "",
                  role: d.role || "user",
                  created_at: d.createdAt || new Date().toISOString(),
                  updated_at: d.updatedAt || new Date().toISOString(),
                };
              }
            }

            if (!profile) {
              profile = {
                id: fbUser.uid,
                email: fbUser.email || "",
                display_name: fbUser.displayName || fbUser.email?.split("@")[0] || "Security Analyst",
                role: "user",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
            }

            setUser(profile);
            setAuthState("authenticated");
          } catch (err) {
            console.error("[NeuroCraft] Error restoring Firebase session:", err);
            setAuthState("unauthenticated");
          }
        } else {
          setFirebaseUser(null);
          // If Firebase is active and says logged out, clean up
          localStorage.removeItem("nc_token");
          setUser(null);
          setAuthState("unauthenticated");
        }
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } else {
      // Local SQLite development mode fallback
      api.getMe().then((profile) => {
        if (!isMounted) return;
        if (profile) {
          setUser(profile);
          setAuthState("authenticated");
        } else {
          setUser(null);
          setAuthState("unauthenticated");
        }
      }).catch(() => {
        if (isMounted) {
          setUser(null);
          setAuthState("unauthenticated");
        }
      });
    }
  }, [isConfigured]);

  const login = useCallback(
    async (email: string, password: string): Promise<UserProfile> => {
      setError(null);
      setAuthState("loading");

      if (isConfigured && auth) {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          const fbUser = cred.user;
          const token = await fbUser.getIdToken();
          localStorage.setItem("nc_token", token);
          setFirebaseUser(fbUser);

          // Retrieve or construct profile
          let profile: UserProfile | null = null;
          if (db) {
            const userRef = doc(db, "users", fbUser.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              const d = snap.data();
              profile = {
                id: fbUser.uid,
                email: fbUser.email || "",
                display_name: d.displayName || fbUser.displayName || "",
                role: d.role || "user",
                created_at: d.createdAt || new Date().toISOString(),
                updated_at: d.updatedAt || new Date().toISOString(),
              };
            }
          }

          if (!profile) {
            profile = {
              id: fbUser.uid,
              email: fbUser.email || "",
              display_name: fbUser.displayName || fbUser.email?.split("@")[0] || "Security Analyst",
              role: "user",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }

          setUser(profile);
          setAuthState("authenticated");
          return profile;
        } catch (err: any) {
          const friendlyMsg = mapFirebaseError(err);
          setError(friendlyMsg);
          setAuthState("unauthenticated");
          throw new Error(friendlyMsg);
        }
      } else {
        // Local SQLite / FastAPI fallback
        try {
          const res = await api.login(email, password);
          setUser(res.user);
          setAuthState("authenticated");
          return res.user;
        } catch (err: any) {
          const msg = err.message || "Authentication failed.";
          setError(msg);
          setAuthState("unauthenticated");
          throw new Error(msg);
        }
      }
    },
    [isConfigured]
  );

  const signup = useCallback(
    async (email: string, password: string, displayName?: string): Promise<UserProfile> => {
      setError(null);
      setAuthState("loading");

      const effectiveName = displayName?.trim() || email.split("@")[0] || "Security Analyst";

      if (isConfigured && auth) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          const fbUser = cred.user;

          // Update user display name in Firebase Auth
          await updateProfile(fbUser, { displayName: effectiveName });

          const token = await fbUser.getIdToken();
          localStorage.setItem("nc_token", token);
          setFirebaseUser(fbUser);

          const now = new Date().toISOString();
          const profile: UserProfile = {
            id: fbUser.uid,
            email: fbUser.email || email,
            display_name: effectiveName,
            role: "user",
            created_at: now,
            updated_at: now,
          };

          // Provision user profile in Cloud Firestore: users/{uid}
          if (db) {
            await setDoc(doc(db, "users", fbUser.uid), {
              uid: fbUser.uid,
              email: fbUser.email || email,
              displayName: effectiveName,
              role: "user",
              createdAt: now,
              updatedAt: now,
            });
          }

          setUser(profile);
          setAuthState("authenticated");
          return profile;
        } catch (err: any) {
          const friendlyMsg = mapFirebaseError(err);
          setError(friendlyMsg);
          setAuthState("unauthenticated");
          throw new Error(friendlyMsg);
        }
      } else {
        // Local SQLite / FastAPI fallback
        try {
          const res = await api.signup(email, password, effectiveName);
          setUser(res.user);
          setAuthState("authenticated");
          return res.user;
        } catch (err: any) {
          const msg = err.message || "Registration failed.";
          setError(msg);
          setAuthState("unauthenticated");
          throw new Error(msg);
        }
      }
    },
    [isConfigured]
  );

  const logout = useCallback(async () => {
    try {
      if (isConfigured && auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn("[NeuroCraft] Firebase signOut warning:", err);
    } finally {
      api.logout();
      setFirebaseUser(null);
      setUser(null);
      setAuthState("unauthenticated");
      setError(null);
    }
  }, [isConfigured]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        authState,
        isConfigured,
        isOnline,
        error,
        login,
        signup,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
