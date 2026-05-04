/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Plane, Wallet, Map as MapIcon, CheckSquare, Plus, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import { MyTrips } from './views/MyTrips';
import { TripDetails } from './views/TripDetails';
import { Bookkeeping } from './views/Bookkeeping';
import { PackingList } from './views/PackingList';
import { CurrencyConverter } from './views/CurrencyConverter';
import { Settings } from './views/Settings';

import { Itinerary } from './views/Itinerary';

export const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

function MobileLayout() {
  const location = useLocation();
  const isTripRoute = location.pathname.startsWith('/trips/');
  
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-gray-50 overflow-hidden relative shadow-2xl sm:rounded-[3rem] sm:border-[8px] sm:border-gray-900 sm:h-[800px] sm:my-8 text-gray-800 font-sans">
      <main className="flex-1 overflow-y-auto w-full pb-20">
        <Outlet />
      </main>
      
      {!isTripRoute && (
        <nav className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 pb-safe pb-6 pt-2 px-6 flex justify-between items-center z-50">
          <Link to="/" className={cn("flex flex-col items-center gap-1", location.pathname === '/' ? "text-sky-500" : "text-gray-400")}>
            <Plane className="w-6 h-6" />
            <span className="text-[10px] font-medium">行程</span>
          </Link>
          <Link to="/tools" className={cn("flex flex-col items-center gap-1", location.pathname === '/tools' ? "text-sky-500" : "text-gray-400")}>
            <Wallet className="w-6 h-6" />
            <span className="text-[10px] font-medium">工具</span>
          </Link>
          <Link to="/settings" className={cn("flex flex-col items-center gap-1", location.pathname === '/settings' ? "text-sky-500" : "text-gray-400")}>
            <MapIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">設定</span>
          </Link>
        </nav>
      )}
    </div>
  );
}

function Login() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Ensure user document exists
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: result.user.email,
          displayName: result.user.displayName || 'Traveler',
          createdAt: Date.now()
        });
      }
    } catch (error) {
      console.error(error);
      alert('登入失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-sky-100 to-emerald-50 px-6">
      <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6">
        <Plane className="w-10 h-10 text-sky-500" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Tokyo Travel Pal</h1>
      <p className="text-gray-500 mb-10 text-center">與旅伴一同規劃完美的東京夏日之行</p>
      
      <button 
        disabled={loading}
        onClick={handleLogin}
        className="w-full bg-gray-900 text-white rounded-full py-4 font-semibold text-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Google 帳號登入'}
      </button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <BrowserRouter>
        {user ? (
          <Routes>
            <Route element={<MobileLayout />}>
              <Route path="/" element={<MyTrips />} />
              <Route path="/trips/:tripId" element={<TripDetails />} />
              <Route path="/trips/:tripId/itinerary" element={<Itinerary />} />
              <Route path="/trips/:tripId/bookkeeping" element={<Bookkeeping />} />
              <Route path="/trips/:tripId/packing" element={<PackingList />} />
              <Route path="/tools" element={<CurrencyConverter />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        ) : (
          <Routes>
            <Route element={<MobileLayout />}>
              <Route path="/" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

// Ensure Login is rendered when not authed inside the browser router but using mobile layout wrapper

