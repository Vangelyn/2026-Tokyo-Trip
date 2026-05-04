/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Plane, Wallet, Map as MapIcon, CheckSquare, Plus, Loader2, Map, Calculator, UserCircle, Users, BookHeart, Backpack } from 'lucide-react';
import { cn } from './lib/utils';
import { MyTrips } from './views/MyTrips';
import { TripDetails } from './views/TripDetails';
import { Bookkeeping } from './views/Bookkeeping';
import { PackingList } from './views/PackingList';
import { CurrencyConverter } from './views/CurrencyConverter';
import { Settings } from './views/Settings';
import { Members } from './views/Members';

export const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

function MobileLayout() {
  const location = useLocation();
  const isTripRoute = location.pathname.startsWith('/trips/');
  
  const tripMatch = location.pathname.match(/\/trips\/([^\/]+)/);
  const tripId = tripMatch ? tripMatch[1] : null;
  
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-gray-50 overflow-hidden relative shadow-2xl sm:rounded-[3rem] sm:border-[8px] sm:border-gray-900 sm:h-[800px] sm:my-8 text-gray-800 font-sans">
      <main className="flex-1 overflow-y-auto w-full pb-20">
        <Outlet />
      </main>
      
      {!isTripRoute ? (
        <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-safe pb-4 pt-3 px-8 flex justify-between items-center z-50 rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] text-gray-400">
          <Link to="/" className={cn("flex flex-col items-center gap-1.5 transition-all", location.pathname === '/' ? "text-red-500 scale-110" : "hover:text-gray-600")}>
            <Map className={cn("w-6 h-6", location.pathname === '/' ? "fill-red-100" : "")} />
            <span className="text-[11px] font-bold">行程清單</span>
          </Link>
          <Link to="/tools" className={cn("flex flex-col items-center gap-1.5 transition-all", location.pathname === '/tools' ? "text-blue-500 scale-110" : "hover:text-gray-600")}>
            <Calculator className={cn("w-6 h-6", location.pathname === '/tools' ? "fill-blue-100" : "")} />
            <span className="text-[11px] font-bold">換匯算盤</span>
          </Link>
          <Link to="/settings" className={cn("flex flex-col items-center gap-1.5 transition-all", location.pathname === '/settings' ? "text-yellow-500 scale-110" : "hover:text-gray-600")}>
            <UserCircle className={cn("w-6 h-6", location.pathname === '/settings' ? "fill-yellow-100" : "")} />
            <span className="text-[11px] font-bold">帳號資訊</span>
          </Link>
        </nav>
      ) : tripId ? (
        <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-safe pb-4 pt-3 px-6 flex justify-between items-center z-50 rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] text-gray-400">
          <Link to={`/trips/${tripId}`} className={cn("flex flex-col items-center gap-1.5 transition-all text-center", location.pathname === `/trips/${tripId}` ? "text-red-500 scale-110" : "hover:text-gray-600")}>
            <Map className={cn("w-6 h-6", location.pathname === `/trips/${tripId}` ? "fill-red-100" : "")} />
            <span className="text-[10px] font-bold">行程表</span>
          </Link>
          <Link to={`/trips/${tripId}/bookkeeping`} className={cn("flex flex-col items-center gap-1.5 transition-all text-center", location.pathname === `/trips/${tripId}/bookkeeping` ? "text-yellow-500 scale-110" : "hover:text-gray-600")}>
            <Wallet className={cn("w-6 h-6", location.pathname === `/trips/${tripId}/bookkeeping` ? "fill-yellow-100" : "")} />
            <span className="text-[10px] font-bold">記帳本</span>
          </Link>
          <Link to={`/trips/${tripId}/packing`} className={cn("flex flex-col items-center gap-1.5 transition-all text-center", location.pathname === `/trips/${tripId}/packing` ? "text-green-500 scale-110" : "hover:text-gray-600")}>
            <Backpack className={cn("w-6 h-6", location.pathname === `/trips/${tripId}/packing` ? "fill-green-100" : "")} />
            <span className="text-[10px] font-bold">行李清單</span>
          </Link>
          <Link to={`/trips/${tripId}/members`} className={cn("flex flex-col items-center gap-1.5 transition-all text-center", location.pathname === `/trips/${tripId}/members` ? "text-blue-500 scale-110" : "hover:text-gray-600")}>
            <Users className={cn("w-6 h-6", location.pathname === `/trips/${tripId}/members` ? "fill-blue-100" : "")} />
            <span className="text-[10px] font-bold">旅伴</span>
          </Link>
        </nav>
      ) : null}
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
          photoURL: result.user.photoURL || '',
          createdAt: Date.now()
        });
      } else {
        // Update photoURL if changed
        if (result.user.photoURL && userDoc.data().photoURL !== result.user.photoURL) {
          await updateDoc(userDocRef, { photoURL: result.user.photoURL });
        }
      }
    } catch (error) {
      console.error(error);
      alert('登入失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-yellow-50 via-white to-red-50 px-6">
      <div className="w-24 h-24 bg-white rounded-[2rem] shadow-[0_10px_30px_rgba(255,50,50,0.15)] flex items-center justify-center mb-8 border-4 border-red-500 relative overflow-hidden">
        <div className="absolute top-0 w-full h-1/2 bg-red-500"></div>
        <div className="absolute top-1/2 -mt-1 w-full h-2 bg-gray-900 border-y-2 border-white"></div>
        <div className="absolute top-1/2 left-1/2 -ml-3 -mt-3 w-6 h-6 bg-white rounded-full border-4 border-gray-900 z-10"></div>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">PokeTrips</h1>
      <p className="text-gray-500 mb-10 text-center font-medium">Let's Go! 展開你的偉大冒險</p>
      
      <button 
        disabled={loading}
        onClick={handleLogin}
        className="w-full bg-red-500 text-white rounded-full py-4 font-bold text-lg hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-[0_8px_20px_-6px_rgba(239,68,68,0.6)] active:scale-95"
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
              <Route path="/trips/:tripId/bookkeeping" element={<Bookkeeping />} />
              <Route path="/trips/:tripId/packing" element={<PackingList />} />
              <Route path="/trips/:tripId/members" element={<Members />} />
              <Route path="/tools" element={<CurrencyConverter />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        ) : (
          <Routes>
            <Route element={<MobileLayout />}>
              <Route path="*" element={<Login />} />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

// Ensure Login is rendered when not authed inside the browser router but using mobile layout wrapper

