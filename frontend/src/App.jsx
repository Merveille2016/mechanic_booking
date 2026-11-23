import { useState, useEffect } from 'react';
import './App.css';
import { registerUser, loginUser, logoutUser, addVehicle, getBookings } from './authService';

const App = () => {
  // Navigation State: 'auth', 'addVehicle', 'viewBookings'
  const [currentView, setCurrentView] = useState('auth');
  const [isLogin, setIsLogin] = useState(true);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // FR 1: Add Vehicle State
  const [vehicleData, setVehicleData] = useState({ make: '', model: '', plate_number: '', year: '' });
  
  // FR 2: View Bookings State
  const [bookings, setBookings] = useState([]);

  // Check session on load
  useEffect(() => {
    const session = sessionStorage.getItem('authSession');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.expiresAt > Date.now()) {
        setCurrentUser(parsed.user);
        setCurrentView('dashboard');
      }
    }
  }, []);

  // Fetch bookings when switching to viewBookings tab
  useEffect(() => {
    if (currentView === 'viewBookings' && currentUser) {
      loadBookings();
    }
  }, [currentView, currentUser]);

  const loadBookings = async () => {
    try {
      const data = await getBookings(currentUser.id);
      setBookings(data);
    } catch (error) {
      setMessage('Failed to load bookings.');
    }
  };

  // --- AUTH HANDLERS ---
  const toggleView = () => {
    setIsLogin(!isLogin);
    setFormData({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
    setMessage('');
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = isLogin 
        ? await loginUser(formData.email, formData.password)
        : await registerUser(formData);
      
      if (isLogin && response.user) {
        const sessionData = {
          user: { id: response.user.customer_id, email: response.user.email, name: response.user.full_name },
          expiresAt: Date.now() + (30 * 60 * 1000)
        };
        sessionStorage.setItem('authSession', JSON.stringify(sessionData));
        setCurrentUser(sessionData.user);
        setCurrentView('dashboard');
      } else if (!isLogin && response.status === 201) {
        setMessage('Registration successful! Please log in.');
        setTimeout(toggleView, 2000);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FR 1: ADD VEHICLE HANDLER ---
  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addVehicle({ customer_id: currentUser.id, ...vehicleData });
      setMessage('Vehicle added successfully!');
      setVehicleData({ make: '', model: '', plate_number: '', year: '' });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGOUT ---
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentView('auth');
    setMessage('Logged out securely.');
  };

  // ==========================================
  // RENDER: DASHBOARD (After Login)
  // ==========================================
  if (currentView === 'dashboard' || currentView === 'addVehicle' || currentView === 'viewBookings') {
    return (
      <div className="body">
        <header className="header">
          <h2 className="logo">Mechanic Booking System</h2>
          <nav className="nav">
            <span className="user-greeting">Welcome, {currentUser?.name}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </nav>
        </header>

        <div className="container">
          <div className="dashboard-card">
            {/* Dashboard Tabs */}
            <div className="dashboard-tabs">
              <button 
                className={`tab-btn ${currentView === 'addVehicle' ? 'active' : ''}`} 
                onClick={() => { setCurrentView('addVehicle'); setMessage(''); }}
              >
                Add Vehicle (FR 1)
              </button>
              <button 
                className={`tab-btn ${currentView === 'viewBookings' ? 'active' : ''}`} 
                onClick={() => { setCurrentView('viewBookings'); setMessage(''); }}
              >
                My Bookings (FR 2)
              </button>
            </div>

            {message && <p className={`message ${message.includes('success') ? 'success' : 'error'}`}>{message}</p>}

            {/* FR 1: Add Vehicle Form */}
            {currentView === 'addVehicle' && (
              <form onSubmit={handleVehicleSubmit} className="auth-form">
                <h3>Register Your Vehicle</h3>
                <div className="row">
                  <div className="inputGroup flex-1 mr-2">
                    <label>Make (e.g., Toyota)</label>
                    <input type="text" value={vehicleData.make} onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})} required />
                  </div>
                  <div className="inputGroup flex-1">
                    <label>Model (e.g., Corolla)</label>
                    <input type="text" value={vehicleData.model} onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})} required />
                  </div>
                </div>
                <div className="row">
                  <div className="inputGroup flex-1 mr-2">
                    <label>Plate Number</label>
                    <input type="text" value={vehicleData.plate_number} onChange={(e) => setVehicleData({...vehicleData, plate_number: e.target.value.toUpperCase()})} required />
                  </div>
                  <div className="inputGroup flex-1">
                    <label>Year</label>
                    <input type="number" value={vehicleData.year} onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})} required />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="submit-btn">
                  {loading ? 'Saving...' : 'Add Vehicle'}
                </button>
              </form>
            )}

            {/* FR 2: View Bookings List */}
            {currentView === 'viewBookings' && (
              <div className="bookings-list">
                <h3>Your Booking History</h3>
                {bookings.length === 0 ? (
                  <p className="empty-state">No bookings found. Request a mechanic to see it here.</p>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.booking_id} className="booking-item">
                      <div className="booking-header">
                        <span className="booking-id">Booking #{booking.booking_id}</span>
                        <span className={`status-badge status-${booking.status.toLowerCase()}`}>{booking.status}</span>
                      </div>
                      <p><strong>Issue:</strong> {booking.problem_description}</p>
                      <p><strong>Location:</strong> {booking.location}</p>
                      <p className="smallText">Created: {new Date(booking.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RENDER: AUTHENTICATION (Login/Register)
  return (
    <div className="body">
      <header className="header">
        <h2 className="logo">Mechanic Booking System</h2>
        <nav className="nav">
          <button onClick={toggleView} className={`nav-btn ${isLogin ? 'active' : ''}`}>
            {isLogin ? 'Login' : 'Register'}
          </button>
        </nav>
      </header>

      <div className="container">
        <div className="card">
          <div className="formSide">
            <h2>{isLogin ? 'Customer Login' : 'Customer Registration'}</h2>
            <p className="subtitle">{isLogin ? 'Sign in to manage your repairs.' : 'Create an account to book mechanics.'}</p>

            {message && <p className={`message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</p>}

            <form onSubmit={handleAuthSubmit} autoComplete="off">
              {!isLogin && (
                <div className="inputGroup">
                  <label>Full name</label>
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required autoComplete="off" />
                </div>
              )}
              <div className="inputGroup">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" />
              </div>
              {!isLogin && (
                <div className="inputGroup">
                  <label>Phone number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required autoComplete="off" />
                </div>
              )}
              <div className="inputGroup">
                <label>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required autoComplete="new-password" />
              </div>
              {!isLogin && (
                <div className="inputGroup">
                  <label>Confirm password</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
                </div>
              )}
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Processing...' : (isLogin ? 'Secure Login' : 'Create Account')}
              </button>
            </form>
            <p className="switchText">
              {isLogin ? "New to the system? " : "Already have an account? "}
              <button onClick={toggleView} className="link toggle-btn">{isLogin ? 'Register here' : 'Login here'}</button>
            </p>
          </div>
          <div className="infoSide">
            <h3>{isLogin ? 'Dedicated role access' : 'Your next repair starts here.'}</h3>
            <p>{isLogin ? 'Customer Login opens the Customer Dashboard only.' : 'Register as a vehicle owner to access the workspace.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;