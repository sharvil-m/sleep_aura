import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDIQdnCd6iIlmefZp7w1CkBSzJbH61bOv0",
  authDomain: "sleepaura-2717c.firebaseapp.com",
  projectId: "sleepaura-2717c",
  storageBucket: "sleepaura-2717c.firebasestorage.app",
  messagingSenderId: "169320011806",
  appId: "1:169320011806:web:03456e156a7024b9e6360f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userPreferences = null;
let currentAudio = null;
let ambientAudio = null;
let activeSession = null;

// Premium frequencies (more than basic version)
const premiumFrequencies = [
  {id: 'anger', emoji: '😠', name: 'Calm Anger', hz: '528Hz', desc: 'Dissolve tension and release stress', file: 'sounds/528hz.mp3'},
  {id: 'sadness', emoji: '😢', name: 'Lift Sadness', hz: '396Hz', desc: 'Soothe emotional heaviness', file: 'sounds/396hz.mp3'},
  {id: 'excitement', emoji: '😊', name: 'Balance Energy', hz: '432Hz', desc: 'Find harmony when overstimulated', file: 'sounds/432hz.mp3'},
  {id: 'sleep', emoji: '🥱', name: 'Deep Sleep', hz: 'Theta', desc: 'Enter natural sleep cycles', file: 'sounds/theta.mp3'},
  {id: 'stress', emoji: '😩', name: 'Stress Relief', hz: '852Hz', desc: 'Release mental pressure', file: 'sounds/852hz.mp3'},
  {id: 'overthinking', emoji: '🤯', name: 'Clear Mind', hz: '741Hz', desc: 'Reduce racing thoughts', file: 'sounds/741hz.mp3'},
  // Premium exclusive frequencies
  {id: 'anxiety', emoji: '😰', name: 'Ease Anxiety', hz: '174Hz', desc: 'Ground and center yourself', file: 'sounds/174hz.mp3'},
  {id: 'confidence', emoji: '💪', name: 'Build Confidence', hz: '963Hz', desc: 'Connect with inner strength', file: 'sounds/963hz.mp3'},
  {id: 'creativity', emoji: '🎨', name: 'Boost Creativity', hz: '40Hz', desc: 'Enhance creative flow', file: 'sounds/40hz.mp3'},
  {id: 'healing', emoji: '🌿', name: 'Physical Healing', hz: '285Hz', desc: 'Support body restoration', file: 'sounds/285hz.mp3'},
  {id: 'intuition', emoji: '🔮', name: 'Enhance Intuition', hz: '417Hz', desc: 'Deepen inner knowing', file: 'sounds/417hz.mp3'},
  {id: 'love', emoji: '💚', name: 'Open Heart', hz: '639Hz', desc: 'Cultivate love and compassion', file: 'sounds/639hz.mp3'}
];

const ambientMap = {
  anger: "sounds/ambient_sounds/fire.mp3",
  sadness: "sounds/ambient_sounds/ocean.mp3",
  excitement: "sounds/ambient_sounds/rain.mp3",
  sleep: "sounds/ambient_sounds/ocean.mp3",
  stress: "sounds/ambient_sounds/rain.mp3",
  overthinking: "sounds/ambient_sounds/fire.mp3",
  anxiety: "sounds/ambient_sounds/forest.mp3",
  confidence: "sounds/ambient_sounds/thunder.mp3",
  creativity: "sounds/ambient_sounds/wind.mp3",
  healing: "sounds/ambient_sounds/birds.mp3",
  intuition: "sounds/ambient_sounds/cave.mp3",
  love: "sounds/ambient_sounds/heart.mp3"
};

// Auth check and initialization
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  
  currentUser = user;
  await loadUserProfile();
  await loadUserData();
  initializeDashboard();
});

async function loadUserProfile() {
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  
  const email = currentUser.email;
  const initial = email.charAt(0).toUpperCase();
  
  profileAvatar.textContent = initial;
  profileName.textContent = email.split('@')[0];
  profileEmail.textContent = email;
}

async function loadUserData() {
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      userPreferences = userDoc.data();
    } else {
      userPreferences = {
        favorites: [],
        totalSessions: 0,
        totalTime: 0,
        sleepStreak: 0,
        lastSessionDate: null,
        frequentlyPlayed: {},
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', currentUser.uid), userPreferences);
    }
    
    updateStatsDisplay();
    await loadFrequentlyPlayed();
    await loadSessionHistory();
    await loadAnalytics();
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function updateStatsDisplay() {
  document.getElementById('sleepStreak').textContent = userPreferences.sleepStreak || 0;
  document.getElementById('totalSessions').textContent = userPreferences.totalSessions || 0;
  document.getElementById('totalTime').textContent = Math.round((userPreferences.totalTime || 0) / 60) + 'h';
}

async function loadFrequentlyPlayed() {
  const frequentList = document.getElementById('frequentList');
  const frequentData = userPreferences.frequentlyPlayed || {};
  
  const sorted = Object.entries(frequentData)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  if (sorted.length === 0) {
    frequentList.innerHTML = '<div style="text-align:center; color:var(--muted); padding:1rem;">No sessions yet</div>';
    return;
  }
  
  frequentList.innerHTML = sorted.map(([emotion, count]) => {
    const freq = premiumFrequencies.find(f => f.id === emotion);
    if (!freq) return '';
    
    return `
      <div class="frequent-item" onclick="playFrequency('${emotion}')">
        <div class="frequent-emoji">${freq.emoji}</div>
        <div class="frequent-info">
          <div class="frequent-name">${freq.name}</div>
          <div class="frequent-count">${count} sessions</div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadSessionHistory() {
  try {
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(sessionsQuery);
    const historyContainer = document.getElementById('sessionHistory');
    
    if (snapshot.empty) {
      historyContainer.innerHTML = '<div style="text-align:center; color:var(--muted); padding:2rem;">No sessions yet</div>';
      return;
    }
    
    historyContainer.innerHTML = snapshot.docs.map(doc => {
      const session = doc.data();
      const date = new Date(session.timestamp).toLocaleDateString();
      const freq = premiumFrequencies.find(f => f.id === session.emotion);
      
      return `
        <div class="history-item">
          <div class="history-date">${date}</div>
          <div class="history-emotion">${freq?.emoji || '🎵'}</div>
          <div class="history-details">
            <div class="history-name">${freq?.name || session.emotion}</div>
            <div class="history-duration">${Math.round(session.duration/60)}min • ${session.frequency}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading session history:', error);
  }
}

async function loadAnalytics() {
  await createMoodChart();
  await createUsageChart();
}

async function createMoodChart() {
  const ctx = document.getElementById('moodChart').getContext('2d');
  
  // Get last 7 days of sessions
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  try {
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', currentUser.uid),
      where('timestamp', '>=', weekAgo.toISOString())
    );
    
    const snapshot = await getDocs(sessionsQuery);
    const moodCounts = {};
    
    snapshot.docs.forEach(doc => {
      const session = doc.data();
      moodCounts[session.emotion] = (moodCounts[session.emotion] || 0) + 1;
    });
    
    const labels = Object.keys(moodCounts);
    const data = Object.values(moodCounts);
    const colors = labels.map(() => `hsl(${Math.random() * 360}, 70%, 60%)`);
    
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map(emotion => {
          const freq = premiumFrequencies.find(f => f.id === emotion);
          return freq ? `${freq.emoji} ${freq.name}` : emotion;
        }),
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#f1f5f9', font: { size: 12 } }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating mood chart:', error);
  }
}

async function createUsageChart() {
  const ctx = document.getElementById('usageChart').getContext('2d');
  
  try {
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(sessionsQuery);
    const hourCounts = new Array(24).fill(0);
    
    snapshot.docs.forEach(doc => {
      const session = doc.data();
      const hour = new Date(session.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Sessions',
          data: hourCounts,
          borderColor: '#facc15',
          backgroundColor: 'rgba(250, 204, 21, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.1)' }
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.1)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#f1f5f9' }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating usage chart:', error);
  }
}

function initializeDashboard() {
  // Load frequencies
  const grid = document.getElementById('frequenciesGrid');
  grid.innerHTML = premiumFrequencies.map(freq => `
    <div class="frequency-card" data-id="${freq.id}">
      <div class="freq-header">
        <div class="freq-emoji">${freq.emoji}</div>
        <div class="freq-info">
          <div class="freq-name">${freq.name}</div>
          <div class="freq-hz">${freq.hz}</div>
        </div>
      </div>
      <div class="freq-desc">${freq.desc}</div>
      <div class="freq-controls">
        <select class="duration-select">
          <option value="300">5 minutes</option>
          <option value="600">10 minutes</option>
          <option value="900">15 minutes</option>
          <option value="1800">30 minutes</option>
          <option value="3600">1 hour</option>
        </select>
        <div class="control-buttons">
          <button class="btn btn-play" onclick="startSession('${freq.id}')">▶ Play</button>
          <button class="btn btn-stop" onclick="stopSession()" style="display:none">⏹ Stop</button>
          <button class="btn btn-fav" onclick="toggleFavorite('${freq.id}')">⭐</button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.frequency-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.freq-controls')) return;
      
      const controls = card.querySelector('.freq-controls');
      const isShowing = controls.classList.contains('show');
      
      // Hide all other controls
      document.querySelectorAll('.freq-controls').forEach(c => c.classList.remove('show'));
      document.querySelectorAll('.frequency-card').forEach(c => c.classList.remove('active'));
      
      if (!isShowing) {
        controls.classList.add('show');
        card.classList.add('active');
      }
    });
  });
  
  // Logout handler
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
      await signOut(auth);
      window.location.href = 'login.html';
    }
  });
  
  // Mobile toggle
  document.getElementById('mobileToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('show');
  });
  
  // Preset handlers
  document.querySelectorAll('.preset-item').forEach(item => {
    item.addEventListener('click', () => {
      const preset = item.dataset.preset;
      playPreset(preset);
    });
  });
}

async function startSession(emotionId) {
  const freq = premiumFrequencies.find(f => f.id === emotionId);
  if (!freq) return;
  
  const card = document.querySelector(`[data-id="${emotionId}"]`);
  const duration = parseInt(card.querySelector('.duration-select').value);
  
  // Stop any current session
  stopSession();
  
  // Start new session
  currentAudio = new Audio(freq.file);
  currentAudio.loop = true;
  currentAudio.volume = 0.7;
  
  try {
    await currentAudio.play();
    
    // Update UI
    card.querySelector('.btn-play').style.display = 'none';
    card.querySelector('.btn-stop').style.display = 'inline-block';
    
    // Set timer
    activeSession = {
      emotion: emotionId,
      frequency: freq.hz,
      duration: duration,
      startTime: Date.now()
    };
    
    setTimeout(() => {
      stopSession();
    }, duration * 1000);
    
    // Save session to Firebase
    await saveSession(emotionId, freq.hz, duration);
    
  } catch (error) {
    console.error('Error playing audio:', error);
  }
}

function stopSession() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  if (ambientAudio) {
    ambientAudio.pause();
    ambientAudio = null;
  }
  
  // Reset UI
  document.querySelectorAll('.btn-play').forEach(btn => btn.style.display = 'inline-block');
  document.querySelectorAll('.btn-stop').forEach(btn => btn.style.display = 'none');
  
  activeSession = null;
}

async function saveSession(emotion, frequency, duration) {
  try {
    // Save to sessions collection
    await addDoc(collection(db, 'sessions'), {
      userId: currentUser.uid,
      emotion: emotion,
      frequency: frequency,
      duration: duration,
      timestamp: new Date().toISOString()
    });
    
    // Update user stats
    const updates = {
      totalSessions: (userPreferences.totalSessions || 0) + 1,
      totalTime: (userPreferences.totalTime || 0) + duration,
      [`frequentlyPlayed.${emotion}`]: (userPreferences.frequentlyPlayed?.[emotion] || 0) + 1
    };
    
    // Update streak
    const today = new Date().toDateString();
    const lastSession = userPreferences.lastSessionDate;
    
    if (lastSession) {
      const lastDate = new Date(lastSession).toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastDate === today) {
        // Same day, no change to streak
      } else if (lastDate === yesterday.toDateString()) {
        // Consecutive day
        updates.sleepStreak = (userPreferences.sleepStreak || 0) + 1;
      } else {
        // Streak broken
        updates.sleepStreak = 1;
      }
    } else {
      updates.sleepStreak = 1;
    }
    
    updates.lastSessionDate = new Date().toISOString();
    
    await updateDoc(doc(db, 'users', currentUser.uid), updates);
    
    // Update local data
    Object.assign(userPreferences, updates);
    updateStatsDisplay();
    await loadFrequentlyPlayed();
    
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

async function toggleFavorite(emotionId) {
  try {
    const favorites = userPreferences.favorites || [];
    const isFavorite = favorites.includes(emotionId);
    
    if (isFavorite) {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        favorites: arrayRemove(emotionId)
      });
    } else {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        favorites: arrayUnion(emotionId)
      });
    }
    
    // Update local data
    if (isFavorite) {
      userPreferences.favorites = favorites.filter(f => f !== emotionId);
    } else {
      userPreferences.favorites = [...favorites, emotionId];
    }
    
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
}

function playPreset(presetType) {
  const presets = {
    bedtime: 'sleep',
    stress: 'stress', 
    focus: 'anger'
  };
  
  const emotionId = presets[presetType];
  if (emotionId) {
    startSession(emotionId);
  }
}

// Global functions for onclick handlers
window.startSession = startSession;
window.stopSession = stopSession;
window.toggleFavorite = toggleFavorite;
window.playFrequency = startSession;
