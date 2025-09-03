import React, { useState, useEffect } from 'react';

// --- KONFIGURASI SUPABASE ---
// Ganti dengan URL dan Kunci Anon dari proyek Supabase Anda
const supabaseUrl = 'https://hhmqbfbzvskmfheeainf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobXFiZmJ6dnNrbWZoZWVhaW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzI4MTQsImV4cCI6MjA3MjQ0ODgxNH0.zmI2ku95AnqPZx_DMh4mtXsiHjKsuP5PprJ5r_pApqA'; 
// Pindahkan inisialisasi client ke dalam komponen untuk menghindari race condition
let supabase = null;
// -------------------------

// Komponen Halaman Login
function AuthPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-center text-gray-800">Login Admin</h1>
                <p className="text-center text-gray-600">Sistem Rekap Humas & Promosi FKIP UAD</p>
                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label className="text-sm font-bold text-gray-600 block">Email</label>
                        <input
                            className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-600 block">Password</label>
                        <input
                            className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm font-semibold"
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// Komponen Utama
export default function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Inisialisasi Supabase client di sini untuk memastikan library sudah dimuat
        if (window.supabase) {
            supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                setLoading(false);
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session);
            });

            return () => {
                if (subscription) {
                    subscription.unsubscribe();
                }
            };
        } else {
            // Tambahkan timeout untuk menunggu library Supabase dimuat
            const timeout = setTimeout(() => {
                if(window.supabase){
                     supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
                     supabase.auth.getSession().then(({ data: { session } }) => {
                        setSession(session);
                        setLoading(false);
                    });
                } else {
                    console.error("Supabase library not loaded.");
                    setLoading(false); // Berhenti memuat jika gagal
                }
            }, 1000); // Tunggu 1 detik
            return () => clearTimeout(timeout);
        }
    }, []);
    
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!session) {
        return <AuthPage />;
    } else {
        return <Dashboard key={session.user.id} />;
    }
}

// Komponen Dashboard (Aplikasi utama setelah login)
function Dashboard() {
  const [activeMenu, setActiveMenu] = useState('sekolah');
  const [academicYears, setAcademicYears] = useState([]);
  const [schools, setSchools] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data: yearsData } = await supabase.from('academic_years').select('*').order('start', { ascending: false });
        const { data: schoolsData } = await supabase.from('schools').select('*').order('name');
        const { data: agendasData } = await supabase.from('agendas').select('*').order('date', { ascending: false });

        setAcademicYears(yearsData || []);
        setSchools(schoolsData || []);
        setAgendas(agendasData || []);
        setLoading(false);
    };

    fetchData();

    const channel = supabase.channel('public-schema-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData(); 
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const renderContent = () => {
    if (loading) return <div className="text-center p-8">Memuat data...</div>;
    switch (activeMenu) {
      case 'tahunAkademik': return <MasterDataView title="Tahun Akademik" data={academicYears} fields={academicYearFields} tableName="academic_years" />;
      case 'sekolah': return <MasterDataView title="Data Sekolah" data={schools} fields={schoolFields} tableName="schools" />;
      case 'agenda': return <MasterDataView title="Agenda Humas dan Promosi" data={agendas} fields={agendaFields(schools)} tableName="agendas" />;
      default: return <div className="text-center p-8">Silakan pilih menu</div>;
    }
  };

  const menuItems = [{ key: 'tahunAkademik', label: 'Tahun Akademik' }, { key: 'sekolah', label: 'Data Sekolah' }, { key: 'agenda', label: 'Agenda Humas' }];

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <header className="bg-blue-800 text-white shadow-md">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Rekap Humas & Promosi FKIP UAD</h1>
          <button onClick={() => supabase.auth.signOut()} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Logout</button>
        </div>
      </header>
      <main className="container mx-auto p-4"><div className="flex flex-col md:flex-row gap-6"><aside className="md:w-1/4"><div className="bg-white p-4 rounded-lg shadow-md"><h2 className="text-lg font-semibold mb-3 border-b pb-2">Menu Master</h2><ul className="space-y-2">{menuItems.map(item => (<li key={item.key}><button onClick={() => setActiveMenu(item.key)} className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${activeMenu === item.key ? 'bg-blue-600 text-white shadow' : 'bg-gray-50 hover:bg-gray-200 text-gray-700'}`}>{item.label}</button></li>))}</ul></div></aside><section className="md:w-3/4">{renderContent()}</section></div></main>
    </div>
  );
}

// Komponen generik untuk mengelola Master Data (CRUD)
function MasterDataView({ title, data, fields, tableName }) {
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(null);

    const getInitialFormState = () => fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {});

    useEffect(() => {
        setFormData(getInitialFormState());
        setIsEditing(null);
    }, [tableName]);

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleCancel = () => { setFormData(getInitialFormState()); setIsEditing(null); };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const dataToSubmit = { ...formData };
        Object.keys(dataToSubmit).forEach(key => dataToSubmit[key] === undefined && delete dataToSubmit[key]);
        const { error } = isEditing ? await supabase.from(tableName).update(dataToSubmit).eq('id', isEditing.id) : await supabase.from(tableName).insert([dataToSubmit]);
        if (error) alert(`Gagal: ${error.message}`);
        else handleCancel();
    };
    
    const handleEdit = (item) => { setIsEditing(item); setFormData(item); window.scrollTo(0, 0); };
    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin?')) {
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) alert(`Gagal menghapus: ${error.message}`);
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md"><div className="mb-6 pb-4 border-b"><h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit' : 'Tambah'} {title}</h2><form onSubmit={handleSubmit} className="mt-4 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{fields.map(field => (<div key={field.name} className={field.fullWidth ? 'md:col-span-2' : ''}><label className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>{field.type === 'select' ? (<select name={field.name} value={formData[field.name] || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required><option value="" disabled>Pilih {field.label}</option>{field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>) : field.type === 'textarea' ? (<textarea name={field.name} value={formData[field.name] || ''} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>) : (<input type={field.type} name={field.name} value={formData[field.name] || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required={field.required !== false}/>)}</div>))}</div><div className="flex items-center gap-4 pt-2"><button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">{isEditing ? 'Update Data' : 'Simpan Data'}</button>{isEditing && (<button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-md hover:bg-gray-600">Batal</button>)}</div></form></div><div><h2 className="text-xl font-bold text-gray-800 mb-4">Daftar {title}</h2><div className="overflow-x-auto"><table className="min-w-full bg-white border"><thead className="bg-gray-50"><tr>{fields.map(field => <th key={field.name} className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">{field.label}</th>)}<th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Aksi</th></tr></thead><tbody className="text-gray-700">{data.length === 0 && (<tr><td colSpan={fields.length + 1} className="text-center py-4">Tidak ada data.</td></tr>)}{data.map(item => (<tr key={item.id} className="hover:bg-gray-50">{fields.map(field => <td key={field.name} className="py-2 px-4 border-b text-sm align-top">{item[field.name]}</td>)}<td className="py-2 px-4 border-b text-sm align-top"><div className="flex gap-2"><button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 font-medium">Edit</button><button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 font-medium">Hapus</button></div></td></tr>))}</tbody></table></div></div></div>
    );
}
const academicYearFields = [{ name: 'name', label: 'Nama Tahun Akademik', type: 'text' }, { name: 'start', label: 'Tanggal Mulai', type: 'date' }, { name: 'end', label: 'Tanggal Selesai', type: 'date' }];
const schoolFields = [{ name: 'name', label: 'Nama Sekolah', type: 'text', fullWidth: true }, { name: 'address', label: 'Alamat', type: 'textarea', fullWidth: true, required: false }, { name: 'pic', label: 'Penanggung Jawab', type: 'text', required: false }, { name: 'whatsapp', label: 'WhatsApp PJ', type: 'text', required: false }, { name: 'email', label: 'Email', type: 'email', required: false }, { name: 'instagram', label: 'Instagram', type: 'text', required: false }, { name: 'tiktok', label: 'TikTok', type: 'text', required: false }];
const agendaFields = (schools) => [{ name: 'type', label: 'Jenis Agenda', type: 'select', options: [{ value: 'Kunjungan Akademik', label: 'Kunjungan Akademik' }, { value: 'AMT/Pelatihan', label: 'AMT/Pelatihan' }, { value: 'Campus Tour', label: 'Campus Tour' }] }, { name: 'school', label: 'Sekolah Tujuan', type: 'select', options: schools.map(s => ({ value: s.name, label: s.name })) }, { name: 'date', label: 'Tanggal Pelaksanaan', type: 'date' }, { name: 'description', label: 'Keterangan Singkat', type: 'textarea', fullWidth: true, required: false }];

