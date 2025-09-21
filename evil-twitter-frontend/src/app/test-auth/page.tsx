// 'use client';

// import React, { useEffect } from 'react';
// import { useAuthStore } from '../../../lib/stores/authStore';

// export default function TestAuthPage() {
//     const {
//         user,
//         session,
//         isAuthenticated,
//         isLoading,
//         error,
//         initialized,
//         login,
//         logout,
//         signUp
//     } = useAuthStore();

//     const handleTestLogin = async () => {
//         try {
//             await login('test@example.com', 'password123');
//         } catch (error) {
//             console.error('Test login failed:', error);
//         }
//     };

//     const handleTestSignup = async () => {
//         try {
//             const result = await signUp('test@example.com', 'password123', 'Test User');
//             console.log('Signup result:', result);
//         } catch (error) {
//             console.error('Test signup failed:', error);
//         }
//     };

//     const handleTestLogout = async () => {
//         try {
//             await logout();
//         } catch (error) {
//             console.error('Test logout failed:', error);
//         }
//     };

//     return (
//         <div className="min-h-screen bg-black text-white p-8">
//             <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>

//             <div className="space-y-6">
//                 <div className="bg-gray-800 p-6 rounded-lg">
//                     <h2 className="text-xl font-semibold mb-4">Auth State</h2>
//                     <div className="space-y-2">
//                         <p><strong>Initialized:</strong> {initialized ? 'Yes' : 'No'}</p>
//                         <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
//                         <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
//                         <p><strong>Error:</strong> {error || 'None'}</p>
//                     </div>
//                 </div>

//                 <div className="bg-gray-800 p-6 rounded-lg">
//                     <h2 className="text-xl font-semibold mb-4">User Info</h2>
//                     {user ? (
//                         <div className="space-y-2">
//                             <p><strong>ID:</strong> {user.id}</p>
//                             <p><strong>Email:</strong> {user.email}</p>
//                             <p><strong>Display Name:</strong> {user.user_metadata?.display_name || 'N/A'}</p>
//                             <p><strong>Username:</strong> {user.user_metadata?.username || 'N/A'}</p>
//                             <p><strong>Created:</strong> {user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</p>
//                         </div>
//                     ) : (
//                         <p>No user logged in</p>
//                     )}
//                 </div>

//                 <div className="bg-gray-800 p-6 rounded-lg">
//                     <h2 className="text-xl font-semibold mb-4">Session Info</h2>
//                     {session ? (
//                         <div className="space-y-2">
//                             <p><strong>Access Token:</strong> {session.access_token ? 'Present' : 'Missing'}</p>
//                             <p><strong>Refresh Token:</strong> {session.refresh_token ? 'Present' : 'Missing'}</p>
//                             <p><strong>Expires At:</strong> {session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}</p>
//                         </div>
//                     ) : (
//                         <p>No active session</p>
//                     )}
//                 </div>

//                 <div className="bg-gray-800 p-6 rounded-lg">
//                     <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
//                     <div className="space-x-4">
//                         <button
//                             onClick={handleTestSignup}
//                             className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
//                         >
//                             Test Signup
//                         </button>
//                         <button
//                             onClick={handleTestLogin}
//                             className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded"
//                         >
//                             Test Login
//                         </button>
//                         <button
//                             onClick={handleTestLogout}
//                             className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
//                         >
//                             Test Logout
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }
