import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useContext, useMemo, useRef } from 'react';
import { doc, getDoc, collection, updateDoc, arrayUnion, setDoc, query, orderBy, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, Calendar, Share2, MapPin, Clock, Plus, Edit3, Trash2, Map, Users, Wallet, Backpack, Sun, CloudRain, Thermometer } from 'lucide-react';
import { cn } from '../lib/utils';
import { parseISO, differenceInDays, format, addDays } from 'date-fns';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

interface ItineraryItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  category: string;
  creatorId: string;
  editorUid?: string;
  notes?: string;
}

const CATEGORY_STYLES: Record<string, string> = {
  '景點': 'bg-red-50 text-red-600 border-red-100',
  '美食': 'bg-yellow-50 text-yellow-600 border-yellow-100',
  '交通': 'bg-blue-50 text-blue-600 border-blue-100',
  '住宿': 'bg-green-50 text-green-600 border-green-100',
  '其他': 'bg-gray-50 text-gray-500 border-gray-100',
};

export function TripDetails() {
  const { t, i18n } = useTranslation();
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const scrollY = useMotionValue(0);

  // Header Animation values
  const headerHeight = useTransform(scrollY, [0, 100], [280, 100]);
  const headerOpacity = useTransform(scrollY, [0, 60], [1, 0]);
  const miniHeaderOpacity = useTransform(scrollY, [80, 120], [0, 1]);
  const headerRadius = useTransform(scrollY, [0, 100], [48, 24]);

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weather, setWeather] = useState<any>(null);
  const [weatherLocations, setWeatherLocations] = useState<{name: string, value: string}[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formLocation, setFormLocation] = useState('');
  const [formCategory, setFormCategory] = useState('景點');
  const [formNotes, setFormNotes] = useState('');

  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editTripTitle, setEditTripTitle] = useState('');
  const [editTripStart, setEditTripStart] = useState('');
  const [editTripEnd, setEditTripEnd] = useState('');
  const [editTripRegion, setEditTripRegion] = useState('');

  useEffect(() => {
    const fetchWeatherLocations = async () => {
      try {
        const res = await axios.get('/api/weather-locations');
        setWeatherLocations(res.data);
      } catch (e) {
        console.error("Failed to fetch weather locations", e);
      }
    };
    fetchWeatherLocations();
  }, []);

  useEffect(() => {
    if (!user || !tripId) return;

    let sub: any = null;

    const fetchTrip = async () => {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripDoc = await getDoc(tripRef);
        if (tripDoc.exists()) {
          const tripData = tripDoc.data();
          
          // Join logic
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get('join') === 'true' && !tripData.memberIds.includes(user.uid)) {
            await updateDoc(tripRef, {
              memberIds: arrayUnion(user.uid),
              updatedAt: Date.now()
            });
            await setDoc(doc(db, `trips/${tripId}/members/${user.uid}`), {
              userId: user.uid,
              role: 'editor',
              joinedAt: Date.now()
            });
            tripData.memberIds.push(user.uid);
            alert('成功加入旅程！');
            navigate(`/trips/${tripId}`, { replace: true });
          }

          if (tripData.memberIds.includes(user.uid)) {
            setTrip({ id: tripDoc.id, ...tripData });
            setSelectedDate(tripData.startDate);
            setEditTripRegion(tripData.weatherRegion || '');
            
            // Load users map for avatars
            const map: Record<string, any> = {};
            for (const uid of tripData.memberIds) {
               const uSnap = await getDoc(doc(db, 'users', uid));
               if (uSnap.exists()) map[uid] = { id: uid, ...uSnap.data() };
            }
            setMembersMap(map);

            // Subscriptions
            const subs: (() => void)[] = [];

            // Listen to itinerary
            const q = query(collection(db, `trips/${tripId}/itinerary`), orderBy('date'), orderBy('startTime'));
            const itinerarySub = onSnapshot(q, (snapshot) => {
              const fetched: ItineraryItem[] = [];
              snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as ItineraryItem));
              setItems(fetched);
            }, (err) => {
              console.error("Itinerary query error (might need index):", err);
              // Fallback: fetch without order and sort client-side if it's an index/permission error
              const fallbackQ = query(collection(db, `trips/${tripId}/itinerary`));
              const fSub = onSnapshot(fallbackQ, (snapshot) => {
                const fetched: ItineraryItem[] = [];
                snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as ItineraryItem));
                fetched.sort((a,b) => {
                  if(a.date !== b.date) return a.date.localeCompare(b.date);
                  return (a.startTime || '').localeCompare(b.startTime || '');
                });
                setItems(fetched);
              }, (fErr) => {
                handleFirestoreError(fErr, OperationType.LIST, `trips/${tripId}/itinerary`);
              });
              subs.push(fSub);
            });
            subs.push(itinerarySub);

            // Listen to Trip changes for weather region etc
            const tripSub = onSnapshot(tripRef, (snap) => {
               if(snap.exists()) setTrip({ id: snap.id, ...snap.data() });
            }, (err) => {
               handleFirestoreError(err, OperationType.GET, `trips/${tripId}`);
            });
            subs.push(tripSub);

            (window as any)._tripSubscriptions = subs;
          } else {
             setTrip(null);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `trips/${tripId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
    return () => { 
      const subs = (window as any)._tripSubscriptions;
      if (subs) {
        subs.forEach((unsub: any) => unsub());
        delete (window as any)._tripSubscriptions;
      }
    };
  }, [tripId, user, navigate]);

  // Fetch weather when region or date changes
  useEffect(() => {
    if (!trip?.weatherRegion || !selectedDate) return;
    
    // Check if selectedDate is within 7 days from now
    const today = new Date();
    const targetDate = parseISO(selectedDate);
    const diff = differenceInDays(targetDate, today);
    if (diff < 0 || diff > 7) {
      setWeather(null);
      return;
    }
    
    const fetchWeather = async () => {
      try {
        // Step 1: Geocoding (simplified for Japan/cities)
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trip.weatherRegion)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        
        if (geoData.results && geoData.results[0]) {
          const { latitude, longitude } = geoData.results[0];
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
          const weatherData = await weatherRes.json();
          
          // Match selectedDate to daily index
          const dateIdx = weatherData.daily.time.indexOf(selectedDate);
          if (dateIdx !== -1) {
             setWeather({
                code: weatherData.daily.weathercode[dateIdx],
                max: weatherData.daily.temperature_2m_max[dateIdx],
                min: weatherData.daily.temperature_2m_min[dateIdx]
             });
          } else {
             setWeather(null);
          }
        }
      } catch (e) {
        console.error('Weather fetch error:', e);
      }
    };
    fetchWeather();
  }, [trip?.weatherRegion, selectedDate]);

  const getWeatherInfo = (code: number) => {
     if (code <= 3) return { label: '晴朗', icon: Sun, color: 'text-amber-500' };
     if (code <= 48) return { label: '多雲/霧', icon: CloudRain, color: 'text-gray-400' };
     if (code <= 67) return { label: '陣雨', icon: CloudRain, color: 'text-sky-500' };
     if (code <= 77) return { label: '下雪', icon: CloudRain, color: 'text-blue-200' };
     return { label: '雷雨', icon: CloudRain, color: 'text-indigo-500' };
  };

  const daysLeft = useMemo(() => {
    if (!trip?.startDate) return null;
    const diff = differenceInDays(parseISO(trip.startDate), new Date());
    return diff > 0 ? diff : diff === 0 ? t('TripDetails.CountdownDeparted') : t('TripDetails.CountdownDeparted');
  }, [trip?.startDate, t]);

  const dates = useMemo(() => {
     if (!trip) return [];
     const start = parseISO(trip.startDate);
     const end = parseISO(trip.endDate);
     const days = differenceInDays(end, start) + 1;
     return Array.from({ length: Math.max(1, days) }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
  }, [trip?.startDate, trip?.endDate]);

  const displayedItems = useMemo(() => items.filter(i => i.date === selectedDate), [items, selectedDate]);

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/trips/${tripId}?join=true`);
    alert('已複製邀請連結！快傳給朋友吧');
  };

  const startEditTrip = () => {
    if (!trip) return;
    setEditTripTitle(trip.title);
    setEditTripStart(trip.startDate);
    setEditTripEnd(trip.endDate);
    setEditTripRegion(trip.weatherRegion || '');
    setIsEditingTrip(true);
  };

  const saveEditTrip = async () => {
    if (!tripId || !editTripTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        title: editTripTitle.trim(),
        startDate: editTripStart,
        endDate: editTripEnd,
        weatherRegion: editTripRegion.trim(),
        updatedAt: Date.now()
      });
      setIsEditingTrip(false);
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const openModal = (item?: ItineraryItem) => {
    try {
      if (item) {
        setEditingItem(item);
        setFormTitle(item.title || '');
        setFormDate(item.date || selectedDate || '');
        setFormStartTime(item.startTime || '09:00');
        setFormLocation(item.location || '');
        setFormCategory(item.category || '景點');
        setFormNotes(item.notes || '');
      } else {
        setEditingItem(null);
        setFormTitle('');
        setFormDate(selectedDate || trip?.startDate || new Date().toISOString().split('T')[0]);
        setFormStartTime('09:00');
        setFormLocation('');
        setFormCategory('景點');
        setFormNotes('');
      }
      setShowModal(true);
    } catch (err) {
      console.error("Open modal error:", err);
      alert("載入編輯視窗時發生錯誤");
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formDate || !user || !tripId) return;

    try {
      if (editingItem) {
        await updateDoc(doc(db, `trips/${tripId}/itinerary/${editingItem.id}`), {
          title: formTitle.trim(),
          date: formDate,
          startTime: formStartTime,
          location: formLocation.trim(),
          category: formCategory,
          notes: formNotes,
          editorUid: user.uid
        });
      } else {
        await addDoc(collection(db, `trips/${tripId}/itinerary`), {
          title: formTitle.trim(),
          date: formDate,
          startTime: formStartTime,
          location: formLocation.trim(),
          category: formCategory,
          notes: formNotes,
          creatorId: user.uid,
          editorUid: user.uid,
          createdAt: Date.now()
        });
        // Auto switch to the date of the newly added item
        setSelectedDate(formDate);
      }
      setShowModal(false);
    } catch (e) {
      handleFirestoreError(e, editingItem ? OperationType.UPDATE : OperationType.CREATE, `trips/${tripId}/itinerary`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個行程嗎？')) return;
    try {
      await deleteDoc(doc(db, `trips/${tripId}/itinerary/${id}`));
      setShowModal(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `trips/${tripId}/itinerary`);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center bg-yellow-50"><div className="w-10 h-10 border-4 border-red-500 border-t-white rounded-full animate-spin"></div></div>;
  if (!trip) return <div className="p-10 text-center font-bold text-gray-400">找不到此旅程或您沒有權限。</div>;

  const weatherMonth = selectedDate ? new Date(selectedDate).getMonth() : 6;
  const isSummer = weatherMonth >= 5 && weatherMonth <= 8;

  // Weather Info Section (already integrated in return in my mental model, let's update the actual code)
  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Animated Header */}
      <motion.div 
        style={{ height: headerHeight, borderBottomLeftRadius: headerRadius, borderBottomRightRadius: headerRadius }}
        className="fixed top-0 left-0 right-0 bg-red-500 text-white shadow-[0_15px_40px_-20px_rgba(239,68,68,0.6)] z-40 overflow-hidden"
      >
        {/* Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 z-20">
          <button onClick={() => navigate('/')} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-black/10 backdrop-blur-xl border border-white/20 active:scale-95 transition-transform">
            <ChevronLeft className="w-7 h-7" />
          </button>
          
          <motion.div style={{ opacity: miniHeaderOpacity }} className="absolute left-1/2 -translate-x-1/2 font-black text-lg tracking-tight">
             {trip.title}
          </motion.div>

          <div className="flex gap-3">
             <Link to={`/trips/${tripId}/members`} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-black/10 backdrop-blur-xl border border-white/20 active:scale-95 transition-transform">
              <Users className="w-5 h-5" />
            </Link>
            <button onClick={startEditTrip} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-black/10 backdrop-blur-xl border border-white/20 active:scale-95 transition-transform">
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Large Header Content */}
        <motion.div style={{ opacity: headerOpacity }} className="absolute bottom-6 left-6 right-6 z-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black tracking-tighter leading-none text-white drop-shadow-lg break-words line-clamp-2">
              {trip.title}
            </h1>
            <div className="flex items-center justify-between mt-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-white/80 font-black text-[10px] tracking-widest uppercase">
                  <Calendar className="w-4 h-4" />
                  {trip.startDate.replace(/-/g, '.')} - {trip.endDate.replace(/-/g, '.')}
                </div>
                {trip.weatherRegion && (
                  <div className="flex items-center gap-2 text-white/80 font-black text-[10px] tracking-widest uppercase">
                    <MapPin className="w-4 h-4" />
                    {trip.weatherRegion}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100 mb-2">{t('TripDetails.Status')}</span>
                <div className="text-2xl font-black bg-white text-red-500 rounded-2xl px-5 py-2.5 shadow-xl border-2 border-red-600/10 active:scale-95 transition-transform select-none">
                  {typeof daysLeft === 'number' ? t('TripDetails.Countdown', { days: daysLeft }) : daysLeft}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* PokeBall Decoration */}
        <div className="absolute -right-16 -top-16 w-64 h-64 opacity-[0.07] pointer-events-none">
          <div className="w-full h-full border-[40px] border-white rounded-full"></div>
          <div className="absolute left-0 top-[112px] w-full h-[40px] bg-white"></div>
          <div className="absolute left-[82px] top-[82px] w-[90px] h-[90px] border-[20px] border-white rounded-full bg-red-500"></div>
        </div>
      </motion.div>

      {/* Main Scrollable Area */}
      <div 
        onScroll={(e) => scrollY.set(e.currentTarget.scrollTop)}
        className="flex-1 overflow-y-auto hide-scrollbar pb-32"
      >
        {/* Spacer for Header */}
        <div className="h-[280px]" />

        {/* Date Picker (Horizontal) */}
        <div className="px-6 pt-2 pb-10 min-h-[160px] overflow-visible">
           <div className="flex overflow-x-auto gap-5 pb-8 snap-x hide-scrollbar px-2 pt-14 overflow-y-visible">
              {dates.map((date) => {
                 const isActive = date === selectedDate;
                 const [yyyy, mm, dd] = date.split('-');
                 const d = new Date(Number(yyyy), Number(mm)-1, Number(dd));
                 return (
                   <button 
                     key={date}
                     onClick={() => setSelectedDate(date)}
                     className={cn(
                       "snap-center shrink-0 w-20 h-28 flex flex-col items-center justify-center rounded-[2.5rem] border-4 transition-all duration-500",
                       isActive 
                         ? "bg-yellow-400 border-yellow-500 shadow-[0_20px_40px_-10px_rgba(234,179,8,0.4)] text-gray-900 -translate-y-6 scale-110 z-10" 
                         : "bg-white border-gray-50 text-gray-300 hover:border-gray-100 shadow-sm z-0"
                     )}
                   >
                      <span className="text-[10px] mb-1 font-black uppercase tracking-widest opacity-60">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}
                      </span>
                      <span className="text-2xl font-black leading-none">
                        {d.getDate()}
                      </span>
                   </button>
                 )
              })}
           </div>
        </div>

        {/* Weather & Location Card */}
        <div className="px-6 mb-10">
           <div className="bg-white rounded-[2.5rem] p-6 flex items-center justify-between shadow-sm border border-gray-100 relative group overflow-hidden">
              <div className="flex items-center gap-5 relative z-10">
                 {weather ? (
                   <div className="w-16 h-16 bg-sky-50 rounded-3xl flex items-center justify-center border-2 border-sky-100 shadow-inner">
                      {(() => {
                         const info = getWeatherInfo(weather.code);
                         return <info.icon className={cn("w-9 h-9", info.color)} />
                      })()}
                   </div>
                 ) : (
                   <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center border-2 border-gray-100 text-gray-200">
                      <Sun className="w-9 h-9" />
                   </div>
                 )}
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-black text-gray-900">{weather ? getWeatherInfo(weather.code).label : t('TripDetails.SetRegionForWeather')}</span>
                    </div>
                    <div className="flex items-center text-xs font-black text-sky-500 gap-3">
                      {weather && <span>H: {Math.round(weather.max)}° / L: {Math.round(weather.min)}°</span>}
                      <div className="flex items-center text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 italic">
                        <MapPin className="w-3 h-3 mr-1" />
                        {trip.weatherRegion || '未設定'}
                      </div>
                    </div>
                 </div>
              </div>
              <button onClick={startEditTrip} className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity">
                 <Edit3 className="w-5 h-5" />
              </button>
              <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-sky-500/5 rounded-full blur-2xl"></div>
           </div>
        </div>

        {/* Itinerary Items (Packing style layout) */}
        <div className="px-6 space-y-6">
           {!selectedDate ? (
              <div className="text-center font-bold text-gray-400 mt-10">請選擇日期</div>
           ) : displayedItems.length === 0 ? (
              <div className="text-center bg-white rounded-[2.5rem] p-12 border-2 border-dashed border-gray-200 shadow-sm">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                    <MapPin className="w-10 h-10" />
                 </div>
                 <p className="text-gray-400 font-black mb-8 text-lg">這天還沒有冒險行程！</p>
                 <button onClick={() => openModal()} className="bg-yellow-400 text-gray-900 border-2 border-yellow-500 font-extrabold py-4 px-10 rounded-full shadow-[0_5px_0_0_rgb(234,179,8)] active:translate-y-1 active:shadow-none transition-all">
                   新增行程
                 </button>
              </div>
           ) : (
              <div className="space-y-4">
                 <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-4 mb-4 flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500"></div>
                   Itinerary
                 </h3>
                 <div className="space-y-4">
                    {displayedItems.map((item, index) => {
                       const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES['其他'];
                       const editor = item.editorUid ? membersMap[item.editorUid] : null;

                       return (
                          <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => openModal(item)}
                            className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:border-red-200 active:scale-[0.98] transition-all cursor-pointer group"
                          >
                             <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4">
                                   <div className={cn("w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center shadow-inner shrink-0", style)}>
                                      <Clock className="w-4 h-4 mb-0.5" />
                                      <span className="text-[10px] font-black">{item.startTime}</span>
                                   </div>
                                   <div>
                                      <h4 className="font-black text-gray-900 text-lg leading-tight group-hover:text-red-500 transition-colors">{item.title}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                         <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border", style)}>
                                           {item.category || '其他'}
                                         </span>
                                         {item.location && (
                                            <span className="text-[10px] font-bold text-gray-400 flex items-center">
                                               <MapPin className="w-3 h-3 mr-1" />
                                               {item.location}
                                            </span>
                                         )}
                                      </div>
                                   </div>
                                </div>
                                <button className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Edit3 className="w-5 h-5" />
                                </button>
                             </div>

                             {item.notes && (
                                <div className="bg-slate-50 rounded-2xl p-4 text-xs font-bold text-slate-500 leading-relaxed border-l-4 border-slate-200 mb-4">
                                   {item.notes}
                                </div>
                             )}

                             <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                   Item #{index + 1}
                                </div>
                                {editor && (
                                   <div className="flex items-center gap-2 pr-1">
                                      <span className="text-[10px] font-bold text-gray-400">Edited by {editor.displayName}</span>
                                      <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center ring-2 ring-gray-50">
                                         {editor.photoURL ? (
                                            <img src={editor.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                         ) : (
                                            <span className="text-[8px] font-bold text-gray-500">{editor.displayName?.charAt(0)}</span>
                                         )}
                                      </div>
                                   </div>
                                )}
                             </div>
                          </motion.div>
                       )
                    })}
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Floating Add Action Button */}
      {selectedDate && (
         <button 
           onClick={() => openModal()} 
           className="fixed bottom-28 right-6 w-16 h-16 bg-red-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-[0_12px_25px_-10px_rgba(239,68,68,0.5)] active:scale-90 transition-all z-[60] border-t border-white/20 active:translate-y-1"
         >
           <Plus className="w-8 h-8" strokeWidth={3} />
         </button>
      )}

      {/* Edit Trip Component */}
      {isEditingTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 border-t-8 border-red-500 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black mb-6 text-gray-900 uppercase tracking-tight">{t('TripDetails.EditTrip')}</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-[0.2em] ml-2">Trip Title</label>
                <input 
                  type="text" 
                  value={editTripTitle} onChange={e => setEditTripTitle(e.target.value)}
                  className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-transparent font-bold focus:border-red-400 focus:bg-white outline-none transition-all shadow-inner"
                  placeholder="Journey Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-[0.2em] ml-2">Start Date</label>
                  <input 
                    type="date" 
                    value={editTripStart} onChange={e => setEditTripStart(e.target.value)}
                    className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-transparent font-bold focus:border-red-400 focus:bg-white outline-none transition-all shadow-inner text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-[0.2em] ml-2">End Date</label>
                  <input 
                    type="date" 
                    value={editTripEnd} onChange={e => setEditTripEnd(e.target.value)}
                    className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-transparent font-bold focus:border-red-400 focus:bg-white outline-none transition-all shadow-inner text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-[0.2em] ml-2">{t('TripDetails.WeatherSettings')}</label>
                <select 
                  value={editTripRegion} 
                  onChange={e => setEditTripRegion(e.target.value)}
                  className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-transparent font-bold focus:border-red-400 focus:bg-white outline-none transition-all shadow-inner appearance-none cursor-pointer"
                >
                  <option value="">{t('TripDetails.WeatherSettings')}</option>
                  {weatherLocations.map(loc => (
                    <option key={loc.value} value={loc.name}>{loc.name}</option>
                  ))}
                  <option value="Tokyo">Tokyo (JP)</option>
                  <option value="Osaka">Osaka (JP)</option>
                  <option value="Sapporo">Sapporo (JP)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-2 font-bold ml-2 italic">* {t('TripDetails.WeatherSettings')}</p>
              </div>
              <div className="flex gap-4 mt-8">
                 <button onClick={() => setIsEditingTrip(false)} className="flex-1 py-4 text-gray-400 font-black bg-gray-50 rounded-2xl border-2 border-gray-100 hover:bg-gray-100 transition-colors uppercase text-sm">{t('Common.Cancel')}</button>
                 <button onClick={saveEditTrip} disabled={!editTripTitle} className="flex-1 py-4 text-white font-black bg-red-500 border-b-4 border-red-700 rounded-2xl active:translate-y-1 active:border-b-0 transition-all uppercase text-sm shadow-lg shadow-red-100">{t('Common.Confirm')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center transition-all duration-300">
          <div 
            className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom duration-500 pb-safe-offset-4 max-h-[85vh] overflow-y-auto border-t-8 border-sky-400 text-gray-900 will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingItem ? t('TripDetails.EditItem') : t('TripDetails.AddItem')}</h3>
              <button 
                className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 font-black hover:bg-gray-100 transition-colors" 
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-gray-400 mb-1 block">{t('TripDetails.Category')}</label>
                  <div className="flex flex-wrap gap-2">
                     {Object.keys(CATEGORY_STYLES).map(cat => (
                        <button 
                           key={cat} 
                           onClick={() => setFormCategory(cat)}
                           className={cn("px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all", formCategory === cat ? cn("shadow-sm", CATEGORY_STYLES[cat]) : "bg-white text-gray-500 border-gray-200")}
                        >
                           {cat}
                        </button>
                     ))}
                  </div>
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">{t('TripDetails.ItemTitle')} <span className="text-red-500">*</span></label>
                  <input autoFocus type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors" placeholder="Asakusa Sensoji" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">{t('TripDetails.Date')} <span className="text-red-500">*</span></label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">{t('TripDetails.Time')}</label>
                    <input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors" />
                 </div>
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">{t('TripDetails.Location')}</label>
                  <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors" placeholder="Google Maps Location" />
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">{t('TripDetails.Notes')}</label>
                  <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors min-h-[100px] resize-none" placeholder="Buy something, eat something..."></textarea>
               </div>
               
               <div className="flex gap-3 mt-8 pt-4 border-t-2 border-gray-100">
                 {editingItem && (
                   <button onClick={() => handleDelete(editingItem.id)} className="w-14 items-center justify-center flex text-red-500 bg-red-50 hover:bg-red-100 transition-colors border-2 border-red-200 rounded-2xl flex-shrink-0">
                     <Trash2 className="w-5 h-5" />
                   </button>
                 )}
                 <button onClick={handleSave} disabled={!formTitle.trim() || !formDate} className="flex-1 py-4 text-gray-900 font-black bg-yellow-400 border-2 border-yellow-500 rounded-2xl shadow-[0_4px_0_0_rgb(234,179,8)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50">
                   {editingItem ? t('TripDetails.SaveEdit') : t('TripDetails.AddItem')}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
