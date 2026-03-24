import axios from 'axios';

// ============================================================
// API Configuration
// ============================================================
const API_URL = 'http://192.168.1.15:8000';
const USE_MOCK = true;

export const api = axios.create({ baseURL: API_URL, timeout: 5000 });

// ============================================================
// EXPANDED MOCK DATA — 15 typical Indian canteen items
// ============================================================
const MOCK_NUTRITION = {
    chicken_curry: { calories: 243, protein: 27, carbohydrates: 8, fat: 12, vitamins: 15, calcium: 4, category: 'Non-Veg', prepTime: 15, isVeg: false },
    fried_rice: { calories: 238, protein: 5, carbohydrates: 41, fat: 7, vitamins: 10, calcium: 3, category: 'Rice', prepTime: 10, isVeg: true },
    biryani: { calories: 290, protein: 18, carbohydrates: 38, fat: 8, vitamins: 12, calcium: 5, category: 'Rice', prepTime: 20, isVeg: false },
    dal_tadka: { calories: 150, protein: 9, carbohydrates: 20, fat: 5, vitamins: 18, calcium: 6, category: 'Curry', prepTime: 12, isVeg: true },
    paneer_butter_masala: { calories: 320, protein: 14, carbohydrates: 12, fat: 24, vitamins: 14, calcium: 20, category: 'Curry', prepTime: 15, isVeg: true },
    idli: { calories: 78, protein: 2, carbohydrates: 16, fat: 0.2, vitamins: 5, calcium: 2, category: 'South Indian', prepTime: 5, isVeg: true },
    masala_dosa: { calories: 168, protein: 4, carbohydrates: 28, fat: 5, vitamins: 8, calcium: 3, category: 'South Indian', prepTime: 8, isVeg: true },
    chole_bhature: { calories: 450, protein: 12, carbohydrates: 55, fat: 20, vitamins: 10, calcium: 8, category: 'North Indian', prepTime: 18, isVeg: true },
    samosa: { calories: 262, protein: 4, carbohydrates: 30, fat: 14, vitamins: 6, calcium: 2, category: 'Snacks', prepTime: 5, isVeg: true },
    aloo_paratha: { calories: 300, protein: 7, carbohydrates: 40, fat: 12, vitamins: 10, calcium: 4, category: 'Bread', prepTime: 10, isVeg: true },
    rajma_chawal: { calories: 350, protein: 15, carbohydrates: 55, fat: 6, vitamins: 20, calcium: 10, category: 'Combo', prepTime: 15, isVeg: true },
    veg_pulao: { calories: 210, protein: 5, carbohydrates: 35, fat: 6, vitamins: 15, calcium: 4, category: 'Rice', prepTime: 12, isVeg: true },
    fish_curry: { calories: 200, protein: 22, carbohydrates: 6, fat: 10, vitamins: 20, calcium: 8, category: 'Non-Veg', prepTime: 18, isVeg: false },
    egg_bhurji: { calories: 180, protein: 13, carbohydrates: 3, fat: 13, vitamins: 12, calcium: 5, category: 'Non-Veg', prepTime: 8, isVeg: false },
    chapati: { calories: 70, protein: 3, carbohydrates: 15, fat: 0.5, vitamins: 4, calcium: 2, category: 'Bread', prepTime: 3, isVeg: true },
};

const FOOD_PRICES = {
    chicken_curry: 80, fried_rice: 60, biryani: 120, dal_tadka: 40, paneer_butter_masala: 90,
    idli: 30, masala_dosa: 50, chole_bhature: 70, samosa: 20, aloo_paratha: 45,
    rajma_chawal: 65, veg_pulao: 55, fish_curry: 100, egg_bhurji: 50, chapati: 10,
};

function toDisplayName(key) {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ============================================================
// MOCK CONTAINERS — 8 canteen containers with varied states
// ============================================================
let MOCK_CONTAINERS = [
    { id: 'C1', food_name: 'Chicken Curry', freshness_score: 92, status: 'Fresh', sensor_readings: [{ NH3: 0.3, H2S: 0.1, temperature: 28, humidity: 55 }], sensor_score: 0.08, vision_features: true, timestamp: Date.now() / 1000, image_uri: null, nutrition: MOCK_NUTRITION.chicken_curry },
    { id: 'C2', food_name: 'Fried Rice', freshness_score: 78, status: 'Fresh', sensor_readings: [{ NH3: 1.2, H2S: 0.4, temperature: 30, humidity: 60 }], sensor_score: 0.22, vision_features: true, timestamp: Date.now() / 1000 - 3600, image_uri: null, nutrition: MOCK_NUTRITION.fried_rice },
    { id: 'C3', food_name: 'Biryani', freshness_score: 55, status: 'Warning', sensor_readings: [{ NH3: 3.5, H2S: 1.8, temperature: 33, humidity: 70 }], sensor_score: 0.45, vision_features: true, timestamp: Date.now() / 1000 - 9000, image_uri: null, nutrition: MOCK_NUTRITION.biryani },
    { id: 'C4', food_name: 'Dal Tadka', freshness_score: 97, status: 'Fresh', sensor_readings: [{ NH3: 0.1, H2S: 0.05, temperature: 27, humidity: 50 }], sensor_score: 0.03, vision_features: true, timestamp: Date.now() / 1000 - 600, image_uri: null, nutrition: MOCK_NUTRITION.dal_tadka },
    { id: 'C5', food_name: 'Paneer Butter Masala', freshness_score: 85, status: 'Fresh', sensor_readings: [{ NH3: 0.6, H2S: 0.2, temperature: 29, humidity: 58 }], sensor_score: 0.15, vision_features: true, timestamp: Date.now() / 1000 - 1800, image_uri: null, nutrition: MOCK_NUTRITION.paneer_butter_masala },
    { id: 'C6', food_name: 'Idli', freshness_score: 35, status: 'Spoiled', sensor_readings: [{ NH3: 5.0, H2S: 3.2, temperature: 35, humidity: 80 }], sensor_score: 0.65, vision_features: true, timestamp: Date.now() / 1000 - 14400, image_uri: null, nutrition: MOCK_NUTRITION.idli },
    { id: 'C7', food_name: 'Masala Dosa', freshness_score: 88, status: 'Fresh', sensor_readings: [{ NH3: 0.4, H2S: 0.15, temperature: 28, humidity: 52 }], sensor_score: 0.12, vision_features: true, timestamp: Date.now() / 1000 - 1200, image_uri: null, nutrition: MOCK_NUTRITION.masala_dosa },
    { id: 'C8', food_name: 'Rajma Chawal', freshness_score: 62, status: 'Warning', sensor_readings: [{ NH3: 2.8, H2S: 1.2, temperature: 31, humidity: 65 }], sensor_score: 0.38, vision_features: true, timestamp: Date.now() / 1000 - 7200, image_uri: null, nutrition: MOCK_NUTRITION.rajma_chawal },
];

// ============================================================
// SIMULATED REAL-TIME SENSOR DEGRADATION
// ============================================================
setInterval(() => {
    MOCK_CONTAINERS = MOCK_CONTAINERS.map(c => {
        const decay = Math.random() * 0.4;
        let f = Math.max(0, c.freshness_score - decay);
        const r = c.sensor_readings[0] || {};
        const nr = {
            NH3: Math.max(0, (r.NH3 || 0) + (Math.random() * 0.08 - 0.01)),
            H2S: Math.max(0, (r.H2S || 0) + (Math.random() * 0.04 - 0.005)),
            temperature: (r.temperature || 28) + (Math.random() * 0.2 - 0.1),
            humidity: (r.humidity || 55) + (Math.random() * 0.4 - 0.2),
        };
        let status = 'Fresh';
        if (f < 40) status = 'Spoiled';
        else if (f < 70) status = 'Warning';
        return { ...c, freshness_score: f, status, sensor_readings: [nr], sensor_score: parseFloat((1 - f / 100).toFixed(3)) };
    });

    // Check for spoilage alerts
    MOCK_CONTAINERS.forEach(c => {
        if (c.freshness_score < 40 && !_notifiedSpoiled.has(c.id)) {
            _notifiedSpoiled.add(c.id);
            addNotification('danger', `🚨 SPOILED: ${c.food_name} (${c.id}) is at ${Math.round(c.freshness_score)}%! Replace immediately.`);
        } else if (c.freshness_score < 70 && c.freshness_score >= 40 && !_notifiedWarning.has(c.id)) {
            _notifiedWarning.add(c.id);
            addNotification('warning', `⚠️ WARNING: ${c.food_name} (${c.id}) freshness dropping — ${Math.round(c.freshness_score)}%`);
        }
        const hoursSinceUpdate = (Date.now() / 1000 - (c.timestamp || 0)) / 3600;
        if (hoursSinceUpdate > 2 && !_notified2Hr.has(c.id)) {
            _notified2Hr.add(c.id);
            addNotification('warning', `🕐 ${c.food_name} (${c.id}) hasn't been updated in ${hoursSinceUpdate.toFixed(1)} hours!`);
        }
    });
}, 10000);

// ============================================================
// IN-APP NOTIFICATION SYSTEM
// ============================================================
let _notifications = [];
let _notificationListeners = [];
let _notificationIdCounter = 1;
const _notifiedSpoiled = new Set();
const _notifiedWarning = new Set();
const _notified2Hr = new Set();

function addNotification(type, message) {
    const notif = { id: _notificationIdCounter++, type, message, timestamp: Date.now(), read: false };
    _notifications.unshift(notif);
    if (_notifications.length > 50) _notifications.pop();
    _notificationListeners.forEach(fn => fn([..._notifications]));
}

export function subscribeNotifications(listener) {
    _notificationListeners.push(listener);
    listener([..._notifications]);
    return () => { _notificationListeners = _notificationListeners.filter(l => l !== listener); };
}

export function getNotifications() { return [..._notifications]; }

export function markNotificationRead(id) {
    const n = _notifications.find(n => n.id === id);
    if (n) n.read = true;
}

export function clearNotifications() {
    _notifications = [];
    _notificationListeners.forEach(fn => fn([]));
}

// ============================================================
// RATINGS & FEEDBACK SYSTEM
// ============================================================
let RATINGS = {};
// Pre-populate some demo ratings
Object.keys(MOCK_NUTRITION).forEach(key => {
    const name = toDisplayName(key);
    RATINGS[name] = {
        total: Math.floor(Math.random() * 40) + 10,
        sum: 0,
        reviews: [],
    };
    RATINGS[name].sum = Math.floor(RATINGS[name].total * (3.2 + Math.random() * 1.5));
    // Add demo reviews
    const demoReviews = ['Delicious!', 'Good portion size', 'A bit too spicy', 'Fresh and tasty', 'Could be better', 'Love it!', 'Average', 'Great value'];
    for (let i = 0; i < Math.min(3, RATINGS[name].total); i++) {
        RATINGS[name].reviews.push({
            id: `r_${key}_${i}`,
            rating: Math.floor(Math.random() * 3) + 3,
            comment: demoReviews[Math.floor(Math.random() * demoReviews.length)],
            timestamp: Date.now() - Math.random() * 86400000,
        });
    }
});

export function rateFood(foodName, rating, comment) {
    if (!RATINGS[foodName]) RATINGS[foodName] = { total: 0, sum: 0, reviews: [] };
    RATINGS[foodName].total += 1;
    RATINGS[foodName].sum += rating;
    RATINGS[foodName].reviews.unshift({ id: `r_${Date.now()}`, rating, comment, timestamp: Date.now() });
    return getAverageRating(foodName);
}

export function getAverageRating(foodName) {
    const r = RATINGS[foodName];
    if (!r || r.total === 0) return { avg: 0, count: 0, reviews: [] };
    return { avg: parseFloat((r.sum / r.total).toFixed(1)), count: r.total, reviews: r.reviews };
}

export function getAllRatings() {
    const result = {};
    Object.keys(RATINGS).forEach(name => {
        result[name] = getAverageRating(name);
    });
    return result;
}

// ============================================================
// ORDER AHEAD SYSTEM
// ============================================================
let ORDERS = [];
let _orderIdCounter = 1000;

export function placeOrder(items) {
    // items = [{foodName, key, quantity, price}]
    const totalPrice = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const totalPrepTime = Math.max(...items.map(i => MOCK_NUTRITION[i.key]?.prepTime || 10));
    const waitTime = totalPrepTime + Math.floor(Math.random() * 10) + 5;
    const order = {
        id: `ORD-${_orderIdCounter++}`,
        items,
        totalPrice,
        estimatedWaitMinutes: waitTime,
        status: 'Preparing',
        placedAt: Date.now(),
        estimatedReady: Date.now() + waitTime * 60000,
    };
    ORDERS.unshift(order);

    // Simulate order progression
    setTimeout(() => { order.status = 'Ready for Pickup'; }, waitTime * 60000 * 0.8);
    setTimeout(() => { order.status = 'Ready for Pickup'; }, Math.min(waitTime * 60000, 30000)); // Demo: ready in 30s

    return order;
}

export function getOrders() { return [...ORDERS]; }

export function getMenuItems() {
    return Object.keys(MOCK_NUTRITION).map(key => ({
        key,
        name: toDisplayName(key),
        ...MOCK_NUTRITION[key],
        price: FOOD_PRICES[key] || 50,
        available: true,
    }));
}

// ============================================================
// HEALTH GOALS & MEAL PLANNER
// ============================================================
let HEALTH_GOALS = { calories: 2000, protein: 60, carbohydrates: 250, fat: 65 };
let MEAL_PLATE = []; // [{key, name, quantity, nutrition}]

export function setHealthGoals(goals) { HEALTH_GOALS = { ...HEALTH_GOALS, ...goals }; }
export function getHealthGoals() { return { ...HEALTH_GOALS }; }

export function addToPlate(foodKey) {
    const existing = MEAL_PLATE.find(m => m.key === foodKey);
    if (existing) {
        existing.quantity += 1;
    } else {
        MEAL_PLATE.push({ key: foodKey, name: toDisplayName(foodKey), quantity: 1, nutrition: MOCK_NUTRITION[foodKey] });
    }
    return getPlate();
}

export function removeFromPlate(foodKey) {
    MEAL_PLATE = MEAL_PLATE.filter(m => m.key !== foodKey);
    return getPlate();
}

export function clearPlate() {
    MEAL_PLATE = [];
    return getPlate();
}

export function getPlate() {
    const totals = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };
    MEAL_PLATE.forEach(item => {
        const n = item.nutrition || MOCK_NUTRITION[item.key];
        if (n) {
            totals.calories += n.calories * item.quantity;
            totals.protein += n.protein * item.quantity;
            totals.carbohydrates += n.carbohydrates * item.quantity;
            totals.fat += n.fat * item.quantity;
        }
    });
    return { items: [...MEAL_PLATE], totals, goals: getHealthGoals() };
}

export function getRecommendations() {
    const goals = getHealthGoals();
    const plate = getPlate();
    const remaining = {
        calories: goals.calories - plate.totals.calories,
        protein: goals.protein - plate.totals.protein,
        carbohydrates: goals.carbohydrates - plate.totals.carbohydrates,
        fat: goals.fat - plate.totals.fat,
    };

    // Score each food by how well it fills remaining goals without exceeding
    const scored = Object.entries(MOCK_NUTRITION).map(([key, n]) => {
        let score = 0;
        if (remaining.calories > 0 && n.calories <= remaining.calories) score += 2;
        if (remaining.protein > 0) score += (n.protein / remaining.protein) * 3; // Weight protein higher
        if (n.calories <= remaining.calories * 0.5) score += 1; // Bonus for not overfilling
        if (n.fat < 10) score += 0.5; // Bonus for low fat
        return { key, name: toDisplayName(key), score, ...n, price: FOOD_PRICES[key] || 50 };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5);
}

export function analyzePlatePhoto(imageUri) {
    // Simulate model inference on a plate photo
    return new Promise(resolve => {
        setTimeout(() => {
            // "Detect" 2-3 random items on the plate
            const allKeys = Object.keys(MOCK_NUTRITION);
            const count = 2 + Math.floor(Math.random() * 2);
            const detected = [];
            const used = new Set();
            for (let i = 0; i < count; i++) {
                let k;
                do { k = allKeys[Math.floor(Math.random() * allKeys.length)]; } while (used.has(k));
                used.add(k);
                detected.push({ key: k, name: toDisplayName(k), confidence: 0.75 + Math.random() * 0.2, nutrition: MOCK_NUTRITION[k] });
            }
            resolve(detected);
        }, 2000);
    });
}

// ============================================================
// CORE API FUNCTIONS (with mock fallback)
// ============================================================
export const getDashboard = async () => {
    if (USE_MOCK) return MOCK_CONTAINERS;
    try { return (await api.get('/dashboard/')).data; }
    catch (e) { return MOCK_CONTAINERS; }
};

export const getFoods = async () => {
    if (USE_MOCK) return Object.keys(MOCK_NUTRITION);
    try { return (await api.get('/foods/')).data; }
    catch (e) { return Object.keys(MOCK_NUTRITION); }
};

export const getNutrition = async (foodName) => {
    const key = foodName.toLowerCase().replace(/ /g, '_');
    if (USE_MOCK) return MOCK_NUTRITION[key] || MOCK_NUTRITION.chicken_curry;
    try { return (await api.get(`/foods/${foodName}`)).data; }
    catch (e) { return MOCK_NUTRITION[key] || {}; }
};

export const uploadImage = async (imageUri, containerId) => {
    if (USE_MOCK) {
        await new Promise(r => setTimeout(r, 1500));
        const foods = Object.keys(MOCK_NUTRITION);
        const rk = foods[Math.floor(Math.random() * foods.length)];
        const rn = toDisplayName(rk);
        const sp = parseFloat((Math.random() * 0.25).toFixed(2));
        const fr = 100 - sp * 100;
        let st = 'Fresh';
        if (fr < 40) st = 'Spoiled'; else if (fr < 70) st = 'Warning';

        if (containerId) {
            const idx = MOCK_CONTAINERS.findIndex(c => c.id === containerId);
            if (idx >= 0) {
                MOCK_CONTAINERS[idx] = { ...MOCK_CONTAINERS[idx], food_name: rn, freshness_score: fr, status: st, vision_features: true, timestamp: Date.now() / 1000, image_uri: imageUri, nutrition: MOCK_NUTRITION[rk] };
                // Reset notification tracking for this container
                _notifiedSpoiled.delete(containerId);
                _notifiedWarning.delete(containerId);
                _notified2Hr.delete(containerId);
            }
        } else {
            containerId = `C${MOCK_CONTAINERS.length + 1}`;
            MOCK_CONTAINERS.push({ id: containerId, food_name: rn, freshness_score: fr, status: st, sensor_readings: [{ NH3: 0.2, H2S: 0.1, temperature: 27, humidity: 50 }], sensor_score: sp, vision_features: true, timestamp: Date.now() / 1000, image_uri: imageUri, nutrition: MOCK_NUTRITION[rk] });
        }
        return { food_name: rn, vision_spoilage_score: sp, spoilage_prob: sp, container_id: containerId, nutrition: MOCK_NUTRITION[rk] };
    }
    const formData = new FormData();
    formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'upload.jpg' });
    if (containerId) formData.append('container_id', containerId);
    const response = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 });
    return response.data;
};

// ============================================================
// AUTH FUNCTIONS (Mock Mode)
// ============================================================
const MOCK_USERS = {};

export const mockRegister = async (username, password, role) => {
    await new Promise(r => setTimeout(r, 600));
    if (MOCK_USERS[username]) throw new Error('Username already exists');
    const user = { id: Date.now(), username, role };
    MOCK_USERS[username] = { ...user, password };
    return user;
};

export const mockLogin = async (username, password) => {
    await new Promise(r => setTimeout(r, 600));
    const user = MOCK_USERS[username];
    if (!user || user.password !== password) throw new Error('Invalid credentials');
    return { id: user.id, username: user.username, role: user.role };
};

// Per-user health goals storage
const USER_HEALTH_GOALS = {};

export const getUserHealthGoals = (userId) => {
    return USER_HEALTH_GOALS[userId] || { calories: 2000, protein: 60, carbohydrates: 250, fat: 65 };
};

export const setUserHealthGoals = (userId, goals) => {
    USER_HEALTH_GOALS[userId] = { ...goals };
};
