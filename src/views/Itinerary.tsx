import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, MapPin, Clock, ExternalLink, Plus, Edit3, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface ItineraryItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  creatorId: string;
}

export function Itinerary() {
  const { tripId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [trip, setTrip] = useState<any>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formLocation, setFormLocation] = useState('');

  useEffect(() => {
    if (!tripId || !user) return;
    
    getDoc(doc(db, 'trips', tripId)).then(doc => {
      if(doc.exists()) setTrip(doc.data());
    });

    const q = query(collection(db, `trips/${tripId}/itinerary`), orderBy('date'), orderBy('startTime'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: ItineraryItem[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as ItineraryItem);
      });
      setItems(fetched);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/itinerary`);
    });
    return () => unsubscribe();
  }, [tripId, user]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormDate(trip?.startDate || format(new Date(), 'yyyy-MM-dd'));
    setFormStartTime('09:00');
    setFormLocation('');
    setShowModal(true);
  };

  const openEditModal = (item: ItineraryItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDate(item.date);
    setFormStartTime(item.startTime || '');
    setFormLocation(item.location || '');
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
          location: formLocation.trim()
        });
      } else {
        await addDoc(collection(db, `trips/${tripId}/itinerary`), {
          title: formTitle.trim(),
          date: formDate,
          startTime: formStartTime,
          location: formLocation.trim(),
          creatorId: user.uid,
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

  const dates = Array.from(new Set(items.map(i => i.date))).sort();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-sky-500 pt-12 pb-24 px-6 text-white rounded-b-[3rem] shadow-sm relative">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">行程表</h1>
          <div className="w-8 h-8"></div>
        </div>
        
        <p className="text-sky-100 text-center text-sm font-medium">{trip?.title || '載入中...'}</p>
        <div className="absolute -bottom-10 left-10 w-24 h-24 bg-sky-400 rounded-full blur-2xl"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 -mt-16 z-10 pb-24 border-none">
         {items.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 text-center shadow-lg border border-white mt-10">
               <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <MapPin className="w-8 h-8 text-sky-400" />
               </div>
               <p className="text-gray-500 font-medium mb-4">目前還沒有排定任何行程！</p>
               <button onClick={openAddModal} className="bg-sky-500 text-white font-bold py-3 px-6 rounded-full shadow-sm active:scale-95 transition-transform">
                 新增第一個行程
               </button>
            </div>
         ) : (
            <div className="space-y-6">
              {dates.map(date => {
                 const dayItems = items.filter(i => i.date === date);
                 return (
                   <div key={date}>
                     <div className="bg-white/80 backdrop-blur-md rounded-full px-4 py-1.5 inline-block text-sm font-bold text-sky-600 shadow-sm mb-4 border border-white">
                        {date}
                     </div>
                     
                     <div className="pl-4 border-l-2 border-sky-100 space-y-6">
                        {dayItems.map(item => (
                           <div key={item.id} className="relative">
                              <div className="absolute -left-[23px] top-1 w-4 h-4 rounded-full bg-sky-200 border-2 border-white shadow-sm"></div>
                              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative group">
                                 <button 
                                   onClick={() => openEditModal(item)}
                                   className="absolute top-4 right-4 text-gray-300 hover:text-sky-500"
                                 >
                                   <Edit3 className="w-4 h-4" />
                                 </button>
                                 <h4 className="font-bold text-gray-900 mb-2 pr-6">{item.title}</h4>
                                 
                                 <div className="flex flex-col gap-2 text-xs text-gray-500 font-medium">
                                   <div className="flex items-center">
                                      <Clock className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                                      {item.startTime || '未設定時間'}
                                   </div>
                                   {item.location && (
                                     <div className="flex items-start">
                                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-sky-400 mt-0.5 shrink-0" />
                                        <span className="leading-tight">{item.location}</span>
                                     </div>
                                   )}
                                 </div>

                                 {item.location && (
                                   <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`} target="_blank" rel="noreferrer" className="mt-4 text-xs font-bold text-sky-500 flex items-center bg-sky-50 px-3 py-1.5 rounded-lg w-fit">
                                     <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                     在 Google Maps 開啟
                                   </a>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                   </div>
                 )
              })}
            </div>
         )}
      </div>

      <div className="absolute bottom-8 right-6 z-20">
        <button 
          onClick={openAddModal}
          className="w-14 h-14 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-sky-200 active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom pb-safe max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{editingItem ? '編輯行程' : '新增行程'}</h3>
              <span className="text-sm font-bold text-gray-500 cursor-pointer p-2" onClick={() => setShowModal(false)}>取消</span>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-gray-500">行程標題</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={formTitle} 
                    onChange={e => setFormTitle(e.target.value)}
                    className="w-full bg-gray-50 p-3 rounded-xl mt-1 border border-gray-100 outline-none focus:border-sky-400"
                    placeholder="例如：淺草寺參拜"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-gray-500">日期</label>
                    <input 
                      type="date" 
                      value={formDate} 
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full bg-gray-50 p-3 rounded-xl mt-1 border border-gray-100 outline-none focus:border-sky-400"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500">時間 (選填)</label>
                    <input 
                      type="time" 
                      value={formStartTime} 
                      onChange={e => setFormStartTime(e.target.value)}
                      className="w-full bg-gray-50 p-3 rounded-xl mt-1 border border-gray-100 outline-none focus:border-sky-400"
                    />
                 </div>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-500">地點 (選填)</label>
                  <input 
                    type="text" 
                    value={formLocation} 
                    onChange={e => setFormLocation(e.target.value)}
                    className="w-full bg-gray-50 p-3 rounded-xl mt-1 border border-gray-100 outline-none focus:border-sky-400"
                    placeholder="輸入地點，方便開啟地圖導航"
                  />
               </div>
               
               <div className="flex gap-3 mt-8">
                 {editingItem && (
                   <button onClick={() => handleDelete(editingItem.id)} className="p-3 text-red-500 bg-red-50 hover:bg-red-100 transition-colors rounded-xl flex items-center justify-center aspect-square">
                     <Trash2 className="w-5 h-5" />
                   </button>
                 )}
                 <button onClick={handleSave} disabled={!formTitle.trim() || !formDate} className="flex-1 py-3 text-white font-bold bg-sky-500 hover:bg-sky-600 rounded-xl disabled:opacity-50 transition-colors shadow-sm">
                   {editingItem ? '儲存修改' : '建立行程'}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
