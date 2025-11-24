// src/App.js
import React, { useState, useEffect } from 'react';
import { Camera, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Home, Search, PlusSquare, User, ArrowLeft } from 'lucide-react';
import { supabase } from './lib/supabase';

const App = () => {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [newPost, setNewPost] = useState({ image: null, caption: '' });

  // Verificar sesión al cargar
  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      await loadProfile(session.user.id);
      await loadPosts();
      setCurrentView('home');
    }
  };

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) setProfile(data);
  };

  const loadPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (username, avatar_url),
        likes (id, user_id)
      `)
      .order('created_at', { ascending: false });
    
    if (data) {
      const postsWithLikes = data.map(post => ({
        id: post.id,
        user: {
          username: post.profiles.username,
          avatar: post.profiles.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles.username}`
        },
        image: post.image_url,
        caption: post.caption,
        likes: post.likes.length,
        comments: 0,
        liked: post.likes.some(like => like.user_id === user?.id),
        timestamp: formatDate(post.created_at)
      }));
      setPosts(postsWithLikes);
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutos`;
    if (diffHours < 24) return `${diffHours} horas`;
    if (diffDays < 7) return `${diffDays} días`;
    return date.toLocaleDateString();
  };

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      alert('Error: ' + error.message);
    } else if (data.user) {
      setUser(data.user);
      await loadProfile(data.user.id);
      await loadPosts();
      setCurrentView('home');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          full_name: username
        }
      }
    });
    
    if (error) {
      alert('Error: ' + error.message);
    } else if (data.user) {
      alert('¡Registro exitoso! Verifica tu email para confirmar tu cuenta.');
      setCurrentView('login');
    }
    setLoading(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPost({ ...newPost, image: reader.result, file: file });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!newPost.file) return;
    
    setLoading(true);
    
    // Subir imagen a Supabase Storage
    const fileName = `${Date.now()}_${newPost.file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(fileName, newPost.file);
    
    if (uploadError) {
      alert('Error al subir imagen: ' + uploadError.message);
      setLoading(false);
      return;
    }
    
    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('posts')
      .getPublicUrl(fileName);
    
    // Crear post en base de datos
    const { error: postError } = await supabase
      .from('posts')
      .insert([
        {
          user_id: user.id,
          image_url: publicUrl,
          caption: newPost.caption
        }
      ])
      .select();
    
    if (postError) {
      alert('Error al crear post: ' + postError.message);
    } else {
      setNewPost({ image: null, caption: '', file: null });
      await loadPosts();
      setCurrentView('home');
    }
    
    setLoading(false);
  };

  const toggleLike = async (postId, isLiked) => {
    if (isLiked) {
      // Quitar like
      await supabase
        .from('likes')
        .delete()
        .match({ user_id: user.id, post_id: postId });
    } else {
      // Dar like
      await supabase
        .from('likes')
        .insert([{ user_id: user.id, post_id: postId }]);
    }
    
    // Recargar posts
    await loadPosts();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPosts([]);
    setCurrentView('login');
  };

  // Vista de Login
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Instagram
            </h1>
            <p className="text-gray-500">Comparte tus momentos</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ¿No tienes cuenta?{' '}
              <button
                onClick={() => setCurrentView('register')}
                className="text-purple-600 font-semibold hover:underline"
              >
                Regístrate
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Vista de Registro
  if (currentView === 'register') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <button
            onClick={() => setCurrentView('login')}
            className="flex items-center text-gray-600 mb-6 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Instagram
            </h1>
            <p className="text-gray-500">Crea tu cuenta</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <input
              type="password"
              placeholder="Contraseña (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Registrarse'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de Nueva Publicación
  if (currentView === 'newPost') {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setCurrentView('home')} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold">Nueva publicación</h2>
          <button
            onClick={handlePublish}
            disabled={!newPost.image || loading}
            className={`text-blue-500 font-semibold ${(!newPost.image || loading) ? 'opacity-50' : ''}`}
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
        
        <div className="p-4">
          {!newPost.image ? (
            <label className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <Camera className="w-16 h-16 text-gray-400 mb-4" />
              <span className="text-gray-500">Selecciona una foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-4">
              <img src={newPost.image} alt="Preview" className="w-full rounded-lg" />
              <textarea
                placeholder="Escribe una descripción..."
                value={newPost.caption}
                onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                rows="4"
              />
              <button
                onClick={() => setNewPost({ image: null, caption: '', file: null })}
                className="text-red-500 hover:underline"
              >
                Cambiar foto
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista de Perfil
  if (currentView === 'profile') {
    const userPosts = posts.filter(p => p.user.username === profile?.username);
    
    return (
      <div className="min-h-screen bg-white pb-20">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <button onClick={() => setCurrentView('home')} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold">{profile?.username}</h2>
          <button onClick={handleLogout} className="text-sm text-red-500 font-semibold">
            Salir
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold">
              {profile?.username[0].toUpperCase()}
            </div>
            <div className="ml-6 flex-1">
              <div className="flex gap-6 mb-2">
                <div className="text-center">
                  <div className="font-semibold">{userPosts.length}</div>
                  <div className="text-sm text-gray-500">publicaciones</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">0</div>
                  <div className="text-sm text-gray-500">seguidores</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">0</div>
                  <div className="text-sm text-gray-500">seguidos</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold">{profile?.full_name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {profile?.bio || '📸 Amante de la fotografía'}
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-1">
            {userPosts.map((post) => (
              <div key={post.id} className="aspect-square bg-gray-100 rounded overflow-hidden">
                <img src={post.image} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {userPosts.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">
                No hay publicaciones aún
              </div>
            )}
          </div>
        </div>
        
        {/* Agregar barra de navegación también en perfil */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="flex justify-around items-center h-14 max-w-2xl mx-auto">
            <button
              onClick={() => setCurrentView('home')}
              className="text-gray-600 transition-colors"
              title="Inicio"
            >
              <Home className="w-6 h-6" />
            </button>
            <button className="text-gray-600" title="Buscar">
              <Search className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentView('newPost')}
              className="text-gray-600 transition-colors"
              title="Nueva publicación"
            >
              <PlusSquare className="w-6 h-6" />
            </button>
            <button className="text-gray-600" title="Notificaciones">
              <Heart className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentView('profile')}
              className="text-purple-600 transition-colors"
              title="Perfil"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold border-2 border-purple-600">
                {profile?.username[0].toUpperCase()}
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista Principal (Feed)
  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Instagram
        </h1>
      </div>

      <div className="max-w-2xl mx-auto">
        {loading && posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No hay publicaciones aún. ¡Sé el primero en publicar!
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="border-b border-gray-200">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center">
                  <img
                    src={post.user.avatar}
                    alt={post.user.username}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <span className="font-semibold text-sm">{post.user.username}</span>
                </div>
                <button>
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <img src={post.image} alt="" className="w-full" />

              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleLike(post.id, post.liked)}>
                      <Heart
                        className={`w-6 h-6 ${post.liked ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </button>
                    <button>
                      <MessageCircle className="w-6 h-6" />
                    </button>
                    <button>
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                  <button>
                    <Bookmark className="w-6 h-6" />
                  </button>
                </div>

                <div className="text-sm font-semibold mb-2">{post.likes} Me gusta</div>
                
                {post.caption && (
                  <div className="text-sm">
                    <span className="font-semibold mr-2">{post.user.username}</span>
                    {post.caption}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-2">{post.timestamp}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around items-center h-14 max-w-2xl mx-auto">
          <button
            onClick={() => setCurrentView('home')}
            className={`transition-colors ${currentView === 'home' ? 'text-purple-600' : 'text-gray-600'}`}
            title="Inicio"
          >
            <Home className="w-6 h-6" fill={currentView === 'home' ? 'currentColor' : 'none'} />
          </button>
          <button className="text-gray-600" title="Buscar">
            <Search className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentView('newPost')}
            className={`transition-colors ${currentView === 'newPost' ? 'text-purple-600' : 'text-gray-600'}`}
            title="Nueva publicación"
          >
            <PlusSquare className="w-6 h-6" />
          </button>
          <button className="text-gray-600" title="Notificaciones">
            <Heart className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentView('profile')}
            className={`transition-colors ${currentView === 'profile' ? 'text-purple-600' : 'text-gray-600'}`}
            title="Perfil"
          >
            {currentView === 'profile' ? (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold border-2 border-purple-600">
                {profile?.username[0].toUpperCase()}
              </div>
            ) : (
              <User className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;