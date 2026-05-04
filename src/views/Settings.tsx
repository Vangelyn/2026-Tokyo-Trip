import { useContext } from 'react';
import { AuthContext } from '../App';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export function Settings() {
  const { user } = useContext(AuthContext);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="pt-12 px-6 h-full flex flex-col bg-gray-50">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">設定</h1>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden text-emerald-600 font-bold text-xl">
             {user?.photoURL ? (
                <img src={user.photoURL} alt="User" />
             ) : (
                user?.displayName?.[0] || 'U'
             )}
          </div>
          <div>
             <h3 className="text-xl font-bold text-gray-900">{user?.displayName || 'User'}</h3>
             <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-500 font-bold py-3 rounded-xl hover:bg-red-100 transition-colors"
        >
          登出
        </button>
      </div>

      <div className="text-center text-xs text-gray-400 font-medium">
        <p>Tokyo Travel Pal v1.0.0</p>
      </div>
    </div>
  );
}
