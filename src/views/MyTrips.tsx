import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, setDoc, updateDoc, arrayRemove, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MapPin, Calendar, LogOut, MoreVertical, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  memberIds: string[];
  weatherRegion?: string;
}

export function MyTrips() {
  const { t, i18n } = useTranslation();
  const { user } = useContext(AuthContext);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const q = query(
      collection(db, 'trips'),
      where('memberIds', 'array-contains', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTrips: Trip[] = [];
      snapshot.forEach(doc => {
        fetchedTrips.push({ id: doc.id, ...doc.data() } as Trip);
      });
      // Sort by start date
      fetchedTrips.sort((a, b) => a.startDate.localeCompare(b.startDate));
      setTrips(fetchedTrips);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trips');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLeaveTrip = async (e: React.MouseEvent, tripId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    
    const tripToLeave = trips.find(t => t.id === tripId);
    const isOwner = tripToLeave?.ownerId === user.uid;
    
    // Customize message for owner vs member
    const confirmMsg = isOwner ? t('Home.DeleteTripConfirm', '確定要刪除並退出此行程嗎？') : t('Home.LeaveConfirm');
    if (!confirm(confirmMsg)) return;

    setMenuOpenId(null);

    try {
      if (isOwner) {
        // If owner, we delete the trip document (cascading delete isn't automatic in Firestore, 
        // but for a simple app we at least delete the main document to hide it)
        await deleteDoc(doc(db, 'trips', tripId));
      } else {
        // Just remove the member
        const tripRef = doc(db, 'trips', tripId);
        await updateDoc(tripRef, {
          memberIds: arrayRemove(user.uid)
        });
        await deleteDoc(doc(db, `trips/${tripId}/members`, user.uid));
      }
      // UI will auto-update via onSnapshot
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const createDefaultTrip = async () => {
    if (!user) return;
    try {
      const tripData = {
        title: '東京夏日之旅',
        startDate: '2026-05-11',
        endDate: '2026-05-16',
        ownerId: user.uid,
        memberIds: [user.uid],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const tripRef = await addDoc(collection(db, 'trips'), tripData);
      
      // Add user to subcollection members
      await setDoc(doc(db, `trips/${tripRef.id}/members`, user.uid), {
        userId: user.uid,
        role: 'owner',
        initialBudget: 50000,
        joinedAt: Date.now()
      });

      // Default Category styling for default data
      const DEFAULT_ITINERARY = [
        { date: '2026-05-11', title: '桃園機場 (TPE) 出發', startTime: '09:00', location: '桃園國際機場', category: '交通' },
        { date: '2026-05-11', title: '抵達東京成田機場 (NRT)', startTime: '13:30', location: '成田國際機場', category: '交通' },
        { date: '2026-05-11', title: '飯店 Check-in & 附近晚餐', startTime: '16:00', location: '東京', category: '住宿' },
        { date: '2026-05-12', title: '淺草寺、雷門參拜', startTime: '09:30', location: '淺草寺', category: '景點' },
        { date: '2026-05-12', title: '晴空塔觀景 & 商場購物', startTime: '14:00', location: '東京晴空塔', category: '景點' },
        { date: '2026-05-13', title: '寶可夢咖啡廳 / 寶可夢中心', startTime: '11:00', location: 'Pokemon Center Tokyo DX', category: '美食' },
        { date: '2026-05-13', title: '秋葉原動漫電器街', startTime: '14:00', location: '秋葉原', category: '景點' },
        { date: '2026-05-14', title: '明治神宮 & 原宿商圈', startTime: '09:30', location: '明治神宮', category: '景點' },
        { date: '2026-05-14', title: '澀谷十字路口 & 晚餐', startTime: '16:00', location: '澀谷', category: '美食' },
        { date: '2026-05-15', title: '東京迪士尼樂園 / 海洋', startTime: '08:30', location: '東京迪士尼度假區', category: '景點' },
        { date: '2026-05-16', title: '購買伴手禮', startTime: '09:30', location: '東京車站', category: '其他' },
        { date: '2026-05-16', title: '前往機場準備搭機', startTime: '13:00', location: '成田國際機場', category: '交通' },
        { date: '2026-05-16', title: '抵達桃園機場', startTime: '18:00', location: '桃園國際機場', category: '交通' }
      ];

      for (const item of DEFAULT_ITINERARY) {
        await addDoc(collection(db, `trips/${tripRef.id}/itinerary`), {
            ...item,
            creatorId: user.uid,
            createdAt: Date.now()
        });
      }
      
      navigate(`/trips/${tripRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trips');
    }
  };

  return (
    <div className="pt-12 px-6 h-full flex flex-col bg-gray-50">
      <div className="flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">{t('Home.TripList')}</h1>
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => i18n.changeLanguage('zh')}
              className={cn("text-[10px] font-black px-2 py-1 rounded-md border", i18n.language === 'zh' ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-400 border-gray-200")}
            >繁體中文</button>
            <button 
              onClick={() => i18n.changeLanguage('en')}
              className={cn("text-[10px] font-black px-2 py-1 rounded-md border", i18n.language === 'en' ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-400 border-gray-200")}
            >English</button>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border-2 border-gray-100 shadow-sm overflow-hidden shrink-0">
          {user?.photoURL ? (
             <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
          ) : (
             <span className="text-red-500 font-extrabold text-xl">{user?.displayName?.[0] || 'U'}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full pb-32 hide-scrollbar">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-400 font-bold">{t('Common.Loading')}</div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[2.5rem] shadow-sm border-2 border-dashed border-gray-100 text-center mt-10">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <MapPin className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="font-black text-xl text-gray-900 mb-2">{t('Home.NoTrips')}</h3>
            <button 
              onClick={createDefaultTrip}
              className="mt-6 bg-yellow-400 text-gray-900 border-2 border-yellow-500 rounded-[1.5rem] px-8 py-4 font-black shadow-[0_5px_0_0_rgb(234,179,8)] active:translate-y-1 active:shadow-none transition-all w-full"
            >
              {t('Home.CreateTrip')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {trips.map(trip => {
              const daysToTrip = differenceInDays(parseISO(trip.startDate), new Date());
              const isTodayOrFuture = daysToTrip >= 0;
              
              return (
                <div key={trip.id} className="relative group">
                  <Link to={`/trips/${trip.id}`} className="block active:scale-[0.98] transition-all">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-red-200 transition-colors relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner border-2", trip.weatherRegion ? "bg-sky-50 text-sky-500 border-sky-100" : "bg-red-50 text-red-500 border-red-100")}>
                            <MapPin className="w-7 h-7" />
                          </div>
                          {trip.weatherRegion && (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</span>
                              <span className="text-sm font-black text-gray-700">{trip.weatherRegion}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border shadow-sm",
                          daysToTrip > 0 ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-green-100 text-green-700 border-green-200"
                        )}>
                          {daysToTrip > 0 ? t('Home.Countdown', { days: daysToTrip }) : t('Home.CountdownReady')}
                        </div>
                      </div>

                      <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">{trip.title}</h3>
                      
                      <div className="flex items-center text-gray-400 text-xs font-bold bg-gray-50 w-fit px-3 py-1.5 rounded-xl border border-gray-100">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-red-400" />
                        {trip.startDate.replace(/-/g, '.')} - {trip.endDate.replace(/-/g, '.')}
                      </div>

                      {/* PokeBall Decoration mini */}
                      <div className="absolute -right-4 -bottom-4 w-20 h-20 opacity-[0.03] pointer-events-none grayscale">
                        <div className="w-full h-full border-[10px] border-black rounded-full relative overflow-hidden">
                          <div className="absolute left-0 top-[22px] w-full h-[8px] bg-black"></div>
                          <div className="absolute left-[20px] top-[20px] w-[20px] h-[20px] border-[5px] border-black rounded-full bg-white"></div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Menu Button */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === trip.id ? null : trip.id);
                    }}
                    className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors z-10"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {menuOpenId === trip.id && (
                    <div className="absolute top-14 right-6 bg-white border border-gray-100 shadow-xl rounded-2xl p-2 z-50 animate-in fade-in zoom-in duration-200 min-w-[120px]">
                      <button 
                        onClick={(e) => handleLeaveTrip(e, trip.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-black"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('Home.LeaveTrip')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <button 
              onClick={createDefaultTrip}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-400 border-4 border-dashed border-gray-100 py-8 rounded-[2.5rem] hover:border-red-200 hover:text-red-400 transition-all font-black text-lg active:scale-[0.98]"
            >
              <Plus className="w-6 h-6" />
              {t('Home.CreateTrip')}
            </button>
          </div>
        )}
      </div>
      
      {/* Click outside to close menu */}
      {menuOpenId && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)}></div>
      )}
    </div>
  );
}
