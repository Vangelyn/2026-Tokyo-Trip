import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContext } from '../App';
import { ChevronLeft, MapPin, Clock, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

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
      
      // Let's seed an example if empty for demo
      if (fetched.length === 0) {
          fetched.push(
               { id: '1', title: '抵達東京成田機場', date: '2026-05-11', startTime: '12:00', location: 'NRT Airport', creatorId: 'sys' },
               { id: '2', title: '淺草寺參拜', date: '2026-05-12', startTime: '09:00', location: '東京都台東區淺草', creatorId: 'sys' },
               { id: '3', title: '晴空塔看夜景', date: '2026-05-12', startTime: '19:00', location: '東京都墨田區押上', creatorId: 'sys' }
          );
      }
      setItems(fetched);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/itinerary`);
    });
    return () => unsubscribe();
  }, [tripId, user]);

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
        
        <p className="text-sky-100 text-center text-sm font-medium">{trip?.title}</p>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-10 left-10 w-24 h-24 bg-sky-400 rounded-full blur-2xl"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 -mt-16 z-10 pb-24">
         <div className="space-y-6">
            {['2026-05-11', '2026-05-12'].map(date => {
               const dayItems = items.filter(i => i.date === date);
               if (dayItems.length === 0) return null;
               
               return (
                 <div key={date}>
                   <div className="bg-white/80 backdrop-blur-md rounded-full px-4 py-1.5 inline-block text-sm font-bold text-sky-600 shadow-sm mb-4 border border-white">
                      {date}
                   </div>
                   
                   <div className="pl-4 border-l-2 border-sky-100 space-y-6">
                      {dayItems.map(item => (
                         <div key={item.id} className="relative">
                            <div className="absolute -left-[23px] top-1 w-4 h-4 rounded-full bg-sky-200 border-2 border-white shadow-sm"></div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                               <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                               
                               <div className="flex flex-col gap-2 text-xs text-gray-500 font-medium">
                                 <div className="flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                                    {item.startTime}
                                 </div>
                                 <div className="flex items-start">
                                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-sky-400 mt-0.5 shrink-0" />
                                    <span className="leading-tight">{item.location}</span>
                                 </div>
                               </div>

                               <button className="mt-4 text-xs font-bold text-sky-500 flex items-center bg-sky-50 px-3 py-1.5 rounded-lg w-fit">
                                 <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                 在 Google Maps 開啟
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                 </div>
               )
            })}
         </div>
      </div>
    </div>
  );
}
