import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useContext, useMemo } from 'react';
import { doc, getDoc, collection, updateDoc, arrayUnion, setDoc, query, orderBy, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, Calendar, Share2, MapPin, Clock, Plus, Edit3, Trash2, Map, Users, Wallet, Backpack, Sun, CloudRain } from 'lucide-react';
import { cn } from '../lib/utils';
import { parseISO, differenceInDays } from 'date-fns';

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
  '景點': 'bg-red-100 text-red-600 border-red-200',   // Pokeball red
  '美食': 'bg-yellow-100 text-yellow-600 border-yellow-200', // Pikachu yellow
  '交通': 'bg-blue-100 text-blue-600 border-blue-200',     // Squirtle blue
  '住宿': 'bg-green-100 text-green-600 border-green-200',   // Bulbasaur green
  '其他': 'bg-gray-100 text-gray-500 border-gray-200',
};

export function TripDetails() {
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');

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
              initialBudget: 50000,
              currency: 'JPY',
              joinedAt: Date.now()
            });
            tripData.memberIds.push(user.uid);
            alert('成功加入旅程！');
            navigate(`/trips/${tripId}`, { replace: true });
          }

          if (tripData.memberIds.includes(user.uid)) {
            setTrip({ id: tripDoc.id, ...tripData });
            setSelectedDate(tripData.startDate);
            
            // Load users map for avatars
            const map: Record<string, any> = {};
            for (const uid of tripData.memberIds) {
               const uSnap = await getDoc(doc(db, 'users', uid));
               if (uSnap.exists()) map[uid] = { id: uid, ...uSnap.data() };
            }
            setMembersMap(map);

            // Listen to itinerary
            const q = query(collection(db, `trips/${tripId}/itinerary`), orderBy('date'), orderBy('startTime'));
            sub = onSnapshot(q, (snapshot) => {
              const fetched: ItineraryItem[] = [];
              snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as ItineraryItem));
              setItems(fetched);
            });
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
    return () => { if (sub) sub(); };
  }, [tripId, user, navigate]);

  const daysLeft = useMemo(() => {
    if (!trip?.startDate) return null;
    const diff = differenceInDays(parseISO(trip.startDate), new Date());
    return diff > 0 ? diff : diff === 0 ? '今天出發' : '已出發';
  }, [trip]);

  const dates = useMemo(() => {
     if (!trip) return [];
     // Just gather all dates from items plus start/end to ensure we have a range
     const set = new Set([trip.startDate, trip.endDate, ...items.map(i => i.date)].filter(Boolean));
     return Array.from(set).sort();
  }, [trip, items]);

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
    setIsEditingTrip(true);
  };

  const saveEditTrip = async () => {
    if (!tripId || !editTripTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        title: editTripTitle.trim(),
        startDate: editTripStart,
        endDate: editTripEnd,
        updatedAt: Date.now()
      });
      setIsEditingTrip(false);
      setTrip((prev: any) => ({ ...prev, title: editTripTitle.trim(), startDate: editTripStart, endDate: editTripEnd }));
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const openModal = (item?: ItineraryItem) => {
    if (item) {
      setEditingItem(item);
      setFormTitle(item.title);
      setFormDate(item.date);
      setFormStartTime(item.startTime || '');
      setFormLocation(item.location || '');
      setFormCategory(item.category || '景點');
      setFormNotes(item.notes || '');
    } else {
      setEditingItem(null);
      setFormTitle('');
      setFormDate(selectedDate || trip?.startDate || '');
      setFormStartTime('09:00');
      setFormLocation('');
      setFormCategory('景點');
      setFormNotes('');
    }
    setShowModal(true);
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-yellow-50 to-white pb-24">
      {/* Pokemon style Header */}
      <div className="bg-red-500 text-white rounded-b-[2rem] shadow-[0_10px_20px_-10px_rgba(239,68,68,0.5)] px-6 pt-12 pb-8 relative shrink-0">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 active:scale-95 transition-transform">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button onClick={startEditTrip} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 active:scale-95 transition-transform">
              <Edit3 className="w-5 h-5" />
            </button>
            <button onClick={handleShare} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 active:scale-95 transition-transform">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between">
            <div>
              <div className="inline-flex items-center bg-white/25 px-2 py-1 rounded-full text-xs font-bold mb-2">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                {trip.startDate.replace(/-/g, '/')} - {trip.endDate.replace(/-/g, '/')}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight leading-none text-white">{trip.title}</h1>
            </div>
            
            {/* Countdown / Weather small card */}
            <div className="text-right flex flex-col items-end">
               <div className="text-[10px] font-bold uppercase tracking-widest text-red-100 mb-1">倒數</div>
               <div className="text-2xl font-black bg-white text-red-500 rounded-xl px-3 py-1 shadow-inner border-2 border-red-600">
                 {typeof daysLeft === 'number' ? `${daysLeft}天` : daysLeft}
               </div>
            </div>
        </div>

        {/* PokeBall subtle bg */}
        <div className="absolute right-0 top-0 overflow-hidden w-40 h-40 opacity-10 pointer-events-none">
          <div className="absolute right-[-40px] top-[-20px] w-48 h-48 border-[20px] border-white rounded-full"></div>
          <div className="absolute right-0 top-[80px] w-48 h-4 bg-white"></div>
        </div>
      </div>

      {/* Date Picker (Horizontal Scroll) */}
      <div className="px-6 mt-6 mb-2">
         <div className="flex overflow-x-auto gap-3 pb-4 snap-x hide-scrollbar">
            {dates.map((date) => {
               const isActive = date === selectedDate;
               const [yyyy, mm, dd] = date.split('-');
               const d = new Date(Number(yyyy), Number(mm)-1, Number(dd));
               return (
                 <button 
                   key={date}
                   onClick={() => setSelectedDate(date)}
                   className={cn(
                     "snap-center shrink-0 w-[4.5rem] flex flex-col items-center py-3 rounded-[2rem] border-2 transition-all font-bold",
                     isActive 
                       ? "bg-yellow-400 border-yellow-500 shadow-[0_8px_0_0_rgb(234,179,8),0_15px_20px_-10px_rgba(234,179,8,0.5)] text-gray-900 -translate-y-2 pb-5" 
                       : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                   )}
                 >
                    <span className="text-xs mb-1 opacity-70">
                      {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                    </span>
                    <span className="text-xl leading-none">
                      {d.getDate()}
                    </span>
                 </button>
               )
            })}
         </div>
      </div>

      {/* Weather Card for the day */}
      <div className="px-6 mb-6">
         <div className="bg-white border-2 border-sky-100 rounded-3xl p-4 flex items-center justify-between shadow-[0_5px_15px_-5px_rgba(14,165,233,0.15)]">
            <div className="flex items-center gap-3">
               {isSummer ? (
                 <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-amber-500">
                    <Sun className="w-7 h-7" />
                 </div>
               ) : (
                 <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-sky-500">
                    <CloudRain className="w-7 h-7" />
                 </div>
               )}
               <div>
                  <div className="text-sm font-bold text-gray-800">{isSummer ? '晴朗炎熱' : '陣雨/多雲'}</div>
                  <div className="text-xs font-bold text-sky-500">{isSummer ? '31° / 26°' : '18° / 12°'}</div>
               </div>
            </div>
            <div className="text-right text-[10px] font-bold text-gray-400 max-w-[100px]">
              天氣卡片僅供參考 (假資料)
            </div>
         </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 pb-20 relative">
         {!selectedDate ? (
            <div className="text-center font-bold text-gray-400 mt-10">請選擇日期</div>
         ) : displayedItems.length === 0 ? (
            <div className="text-center bg-white rounded-[2rem] p-10 border-2 border-dashed border-gray-200 shadow-sm">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <MapPin className="w-8 h-8" />
               </div>
               <p className="text-gray-500 font-bold mb-6">這天還沒有行程！</p>
               <button onClick={() => openModal()} className="bg-yellow-400 text-gray-900 border-2 border-yellow-500 font-black py-3 px-6 rounded-full shadow-[0_4px_0_0_rgb(234,179,8)] active:translate-y-1 active:shadow-none transition-all">
                 新增第一筆
               </button>
            </div>
         ) : (
            <div className="pl-4 border-l-4 border-gray-200 space-y-8 relative">
               {displayedItems.map((item, index) => {
                  const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES['其他'];
                  const editor = item.editorUid ? membersMap[item.editorUid] : null;

                  return (
                     <div key={item.id} className="relative group cursor-pointer" onClick={() => openModal(item)}>
                        {/* Timeline dot */}
                        <div className={cn("absolute -left-[27px] top-1.5 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center font-bold text-[10px] shadow-sm", style)}>
                          {index + 1}
                        </div>
                        
                        <div className="bg-white border-2 border-gray-100 p-4 rounded-[2rem] shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)] hover:border-sky-300 transition-colors ml-4">
                           <div className="flex justify-between items-start mb-2 gap-4">
                              <h4 className="font-extrabold text-gray-900 text-lg leading-tight">{item.title}</h4>
                              <span className={cn("shrink-0 px-2 py-1 rounded-lg text-[10px] font-black border", style)}>
                                {item.category || '其他'}
                              </span>
                           </div>
                           
                           <div className="flex flex-col gap-1.5 mb-3">
                             <div className="flex items-center text-xs font-bold text-gray-500">
                                <Clock className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                {item.startTime}
                             </div>
                             {item.location && (
                               <div className="flex items-start text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1.5 rounded-xl w-fit">
                                  <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                                  <span className="leading-snug">{item.location}</span>
                               </div>
                             )}
                           </div>

                           <div className="flex justify-between items-end mt-4 pt-4 border-t-2 border-gray-50/80">
                              <div className="text-[10px] font-bold text-gray-400 truncate pr-4">
                                 {item.notes || '無備註..'}
                              </div>
                              {/* Editor Avatar */}
                              {editor && (
                                 <div className="w-7 h-7 shrink-0 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center title" title={`編輯者: ${editor.displayName}`}>
                                    {editor.photoURL ? (
                                       <img src={editor.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                       <span className="text-[10px] font-bold text-gray-500">{editor.displayName?.charAt(0)}</span>
                                    )}
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  )
               })}

               {/* Map button linking to Google Maps route potentially */}
               <div className="pt-6 ml-4">
                  <button onClick={() => openModal()} className="flex items-center justify-center w-full gap-2 bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300 font-bold py-4 rounded-[2rem] hover:bg-gray-200 transition-colors">
                     <Plus className="w-5 h-5" />
                     新增行程
                  </button>
               </div>
            </div>
         )}
      </div>

      {/* Floating Add Button logic handled by timeline bottom button, or we can use FAB */}
      {selectedDate && displayedItems.length > 0 && (
         <button onClick={() => openModal()} className="absolute bottom-28 right-6 w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_0_0_rgb(185,28,28)] active:translate-y-2 active:shadow-none transition-all z-20 border-2 border-red-600">
           <Plus className="w-6 h-6" />
         </button>
      )}

      {/* Edit Trip Component */}
      {isEditingTrip && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-red-500">
            <h3 className="text-xl font-extrabold mb-4 text-gray-900">編輯旅程資訊</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">旅程名稱</label>
                <input 
                  type="text" 
                  value={editTripTitle} onChange={e => setEditTripTitle(e.target.value)}
                  className="w-full bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 font-bold focus:border-red-400 outline-none"
                  placeholder="旅程名稱"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1 block">出發日</label>
                  <input 
                    type="date" 
                    value={editTripStart} onChange={e => setEditTripStart(e.target.value)}
                    className="w-full bg-gray-50 p-3 rounded-2xl border-2 border-gray-100 font-bold focus:border-red-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1 block">結束日</label>
                  <input 
                    type="date" 
                    value={editTripEnd} onChange={e => setEditTripEnd(e.target.value)}
                    className="w-full bg-gray-50 p-3 rounded-2xl border-2 border-gray-100 font-bold focus:border-red-400 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-2">
                 <button onClick={() => setIsEditingTrip(false)} className="flex-1 py-4 text-gray-400 font-bold bg-gray-100 rounded-2xl border-2 border-gray-200 hover:bg-gray-200">取消</button>
                 <button onClick={saveEditTrip} disabled={!editTripTitle} className="flex-1 py-4 text-white font-black bg-red-500 border-2 border-red-600 rounded-2xl shadow-[0_4px_0_0_rgb(220,38,38)] disabled:opacity-50 active:translate-y-1 active:shadow-none hover:bg-red-400">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom pb-safe max-h-[90vh] overflow-y-auto border-t-4 border-sky-400">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-gray-900">{editingItem ? '編輯行程 (共同編輯)' : '新增行程'}</h3>
              <button className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 font-bold" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-gray-400 mb-1 block">分類</label>
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
                  <label className="text-xs font-bold text-gray-400 block mb-1">行程標題 <span className="text-red-500">*</span></label>
                  <input autoFocus type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors" placeholder="例如：淺草寺參拜" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">日期 <span className="text-red-500">*</span></label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-400 block mb-1">時間</label>
                    <input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors" />
                 </div>
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Google地圖位置</label>
                  <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors" placeholder="輸入地點，方便直接導航" />
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">備註</label>
                  <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full bg-gray-50/50 p-4 rounded-2xl border-2 border-gray-200 outline-none focus:border-sky-400 font-bold transition-colors min-h-[100px] resize-none" placeholder="要買什麼、吃什麼..."></textarea>
               </div>
               
               <div className="flex gap-3 mt-8 pt-4 border-t-2 border-gray-100">
                 {editingItem && (
                   <button onClick={() => handleDelete(editingItem.id)} className="w-14 items-center justify-center flex text-red-500 bg-red-50 hover:bg-red-100 transition-colors border-2 border-red-200 rounded-2xl flex-shrink-0">
                     <Trash2 className="w-5 h-5" />
                   </button>
                 )}
                 <button onClick={handleSave} disabled={!formTitle.trim() || !formDate} className="flex-1 py-4 text-gray-900 font-black bg-yellow-400 border-2 border-yellow-500 rounded-2xl shadow-[0_4px_0_0_rgb(234,179,8)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50">
                   {editingItem ? '儲存修改 / 同步' : '新增行程'}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
