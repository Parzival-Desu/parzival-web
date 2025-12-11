// --- Configuration & Constants ---
const CANVAS_ID = 'gameCanvas';
const STATION_RADIUS = 10;
const STATION_COST = 200;
const TRACK_COST_PER_UNIT = 10;
const TRAIN_SPEED = 2; 
const TRAINS_PER_STATION = 2;

// --- State ---
let budget = 2500;
let stations = [];
let tracks = [];
let trains = [];

// Interaction State
let dragging = false;
let startStation = null;
let currentMousePos = { x: 0, y: 0 };
let stationIdCounter = 1;
let isDeleteMode = false; // NEW: Delete mode flag
let hoverTrack = null;    // NEW: Track being hovered for deletion
let hoverStation = null;  // NEW: Station being hovered for deletion

// --- Setup ---
const canvas = document.getElementById(CANVAS_ID);
const ctx = canvas.getContext('2d');
const uiBudget = document.getElementById('budget');
const uiStations = document.getElementById('stationCount');
const uiTrack = document.getElementById('trackLength');
const uiTrains = document.getElementById('trainCount');
const uiStatus = document.getElementById('statusMsg');
const deleteBtn = document.getElementById('toggleDeleteBtn');

// --- Helper Functions ---

function snapToGrid(val) { return Math.round(val / 40) * 40; }
function getDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}
function getStationAt(x, y) {
    for (const s of stations) {
        if (getDistance(s, { x, y }) < STATION_RADIUS * 2) return s;
    }
    return null;
}
function getTrackKey(s1, s2) {
    return s1.id < s2.id ? `${s1.id}-${s2.id}` : `${s2.id}-${s1.id}`;
}

/**
 * NEW: Finds a track near the given coordinates.
 * This uses a basic point-to-line segment distance check.
 */
function getTrackAt(x, y) {
    const clickP = { x, y };
    const tolerance = 15; // How close the click has to be to the track line
    
    for (const t of tracks) {
        const A = t.start;
        const B = t.end;
        
        // Calculate vector AB and vector AC (where C is the click point)
        const AB = { x: B.x - A.x, y: B.y - A.y };
        const AC = { x: clickP.x - A.x, y: clickP.y - A.y };
        
        // Calculate the position of the projection of C onto the line AB
        const t_param = (AC.x * AB.x + AC.y * AB.y) / (AB.x * AB.x + AB.y * AB.y);
        
        // Clamp t_param between 0 and 1 to ensure the point is within the segment
        const t_clamped = Math.max(0, Math.min(1, t_param));
        
        // Find the closest point (P) on the segment
        const P = {
            x: A.x + t_clamped * AB.x,
            y: A.y + t_clamped * AB.y
        };
        
        // Calculate the distance from C to P
        const distance = getDistance(clickP, P);
        
        if (distance <= tolerance) {
            return t;
        }
    }
    return null;
}


// --- Drawing Functions ---

function drawCityMap() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#f0f0f0';
    const gridSize = 40;
    const blockSize = 34;
    
    for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.fillRect(x + 3, y + 3, blockSize, blockSize);
        }
    }
}

function drawTracks() {
    ctx.lineCap = 'round';
    for (const t of tracks) {
        ctx.beginPath();
        ctx.moveTo(t.start.x, t.start.y);
        ctx.lineTo(t.end.x, t.end.y);
        
        ctx.lineWidth = 6;
        ctx.strokeStyle = (t === hoverTrack && isDeleteMode) ? 'rgba(231, 76, 60, 0.7)' : '#34495e';
        ctx.stroke();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    }
    // ... (Drawing drag line remains the same)
    if (dragging && startStation) {
        const sx = snapToGrid(currentMousePos.x);
        const sy = snapToGrid(currentMousePos.y);
        ctx.beginPath();
        ctx.moveTo(startStation.x, startStation.y);
        ctx.lineTo(sx, sy);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.stroke();
        const dist = getDistance(startStation, {x: sx, y: sy});
        const cost = Math.floor(dist * TRACK_COST_PER_UNIT);
        uiStatus.textContent = `Cost: $${cost}`;
        uiStatus.style.color = cost > budget ? '#e74c3c' : '#27ae60';
    }
}

function drawStations() {
    for (const s of stations) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, STATION_RADIUS, 0, Math.PI * 2);
        
        ctx.fillStyle = (s === hoverStation && isDeleteMode) ? 'rgba(231, 76, 60, 0.2)' : '#fff';
        ctx.fill();
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = (s === hoverStation && isDeleteMode) ? '#e74c3c' : '#2c3e50';
        ctx.stroke();
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(`S${s.id}`, s.x + 12, s.y - 12);
    }
}

function drawTrains() {
    ctx.fillStyle = '#e74c3c';
    for (const t of trains) {
        ctx.fillRect(t.x - 3, t.y - 3, 6, 6);
    }
}

function updateUI() {
    uiBudget.textContent = `$${Math.floor(budget)}`;
    uiStations.textContent = stations.length;
    uiTrains.textContent = trains.length;
    const totalLen = tracks.reduce((acc, t) => acc + t.length, 0);
    uiTrack.textContent = (totalLen / 100).toFixed(1);
}

// --- Deletion Logic (NEW) ---

function deleteTrack(trackToDelete) {
    if (!trackToDelete) return;
    
    // 1. Calculate Refund
    const cost = Math.floor(trackToDelete.length * TRACK_COST_PER_UNIT);
    budget += cost * 0.5; // Refund 50% of the cost

    // 2. Remove track
    tracks = tracks.filter(t => t !== trackToDelete);
    hoverTrack = null;

    // 3. Check for stranded trains
    // Trains traveling on the deleted track must be reset/deleted
    trains.forEach(train => {
        if (train.targetTrack === trackToDelete) {
            // Option 1: Teleport train back to the station it came from
            train.x = train.targetTrack.start.x;
            train.y = train.targetTrack.start.y;
            train.currentStation = train.targetTrack.start;
            train.targetTrack = null;
            train.lastTrackKey = null;
        }
    });

    uiStatus.textContent = `Track deleted. Refunded $${(cost * 0.5).toFixed(0)}.`;
    uiStatus.style.color = '#e74c3c';
}

function deleteStation(stationToDelete) {
    if (!stationToDelete) return;

    // 1. Calculate Refund
    budget += STATION_COST * 0.5; // Refund 50% of station cost

    // 2. Remove all connected tracks first
    const tracksToRemove = tracks.filter(t => 
        t.start === stationToDelete || t.end === stationToDelete
    );
    tracksToRemove.forEach(t => deleteTrack(t)); // This handles track refunds and stranded trains

    // 3. Remove all trains currently at this station
    trains = trains.filter(t => t.currentStation !== stationToDelete);

    // 4. Remove the station
    stations = stations.filter(s => s !== stationToDelete);
    hoverStation = null;
    
    uiStatus.textContent = `Station S${stationToDelete.id} and all connections deleted.`;
    uiStatus.style.color = '#e74c3c';
}

// --- Main Loop and Other Logic (Train logic is unchanged) ---
// (All other game logic, including updateTrains and gameLoop, remains the same)

function spawnTrains(station) {
    for (let i = 0; i < TRAINS_PER_STATION; i++) {
        trains.push({
            x: station.x, y: station.y,
            currentStation: station,
            targetTrack: null, targetStation: null,
            distanceTraveled: 0, direction: 1,
            lastTrackKey: null
        });
    }
}

function placeStation(x, y) {
    const sx = snapToGrid(x);
    const sy = snapToGrid(y);
    if (getStationAt(sx, sy)) {
        uiStatus.textContent = "Location blocked";
        return;
    }
    if (budget >= STATION_COST) {
        budget -= STATION_COST;
        const newStation = { id: stationIdCounter++, x: sx, y: sy };
        stations.push(newStation);
        spawnTrains(newStation);
        uiStatus.textContent = "Station Placed";
        uiStatus.style.color = 'black';
    } else {
        uiStatus.textContent = "No Money!";
        uiStatus.style.color = '#e74c3c';
    }
}

function placeTrack(endStation) {
    if (!startStation || startStation === endStation) return;
    const key = getTrackKey(startStation, endStation);
    if (tracks.some(t => t.key === key)) return;
    const dist = getDistance(startStation, endStation);
    const cost = Math.floor(dist * TRACK_COST_PER_UNIT);
    if (budget >= cost) {
        budget -= cost;
        tracks.push({ start: startStation, end: endStation, length: dist, key: key });
        uiStatus.textContent = "Track Built";
        uiStatus.style.color = 'black';
    } else {
        uiStatus.textContent = "Too Expensive!";
        uiStatus.style.color = '#e74c3c';
    }
}

function updateTrains() {
    for (const train of trains) {
        if (train.currentStation && !train.targetTrack) {
            let options = tracks.filter(t => t.start === train.currentStation || t.end === train.currentStation);
            const nonBacktrack = options.filter(t => t.key !== train.lastTrackKey);
            if (nonBacktrack.length > 0) options = nonBacktrack;
            
            if (options.length > 0) {
                const choice = options[Math.floor(Math.random() * options.length)];
                train.targetTrack = choice;
                train.distanceTraveled = 0;
                if (choice.start === train.currentStation) {
                    train.targetStation = choice.end; train.direction = 1;
                } else {
                    train.targetStation = choice.start; train.direction = -1;
                }
                train.currentStation = null;
            }
            continue;
        }
        if (train.targetTrack) {
            train.distanceTraveled += TRAIN_SPEED;
            const t = train.targetTrack;
            const ratio = train.distanceTraveled / t.length;
            const startP = train.direction === 1 ? t.start : t.end;
            const endP = train.direction === 1 ? t.end : t.start;
            train.x = startP.x + (endP.x - startP.x) * ratio;
            train.y = startP.y + (endP.y - startP.y) * ratio;
            if (train.distanceTraveled >= t.length) {
                train.x = train.targetStation.x;
                train.y = train.targetStation.y;
                train.lastTrackKey = train.targetTrack.key;
                train.currentStation = train.targetStation;
                train.targetTrack = null;
                train.targetStation = null;
            }
        }
    }
}


function gameLoop() {
    drawCityMap();
    drawTracks();
    drawStations();
    updateTrains();
    drawTrains();
    updateUI();
    requestAnimationFrame(gameLoop);
}

// Income
setInterval(() => {
    const income = 50 + (stations.length * 15) + (trains.length * 5);
    budget += income;
    uiStatus.textContent = `Income: +$${income}`;
    uiStatus.style.color = '#27ae60';
}, 3000);

// --- Input Handling (UPDATED) ---

// NEW: Toggle Delete Mode Function
deleteBtn.addEventListener('click', () => {
    isDeleteMode = !isDeleteMode;
    deleteBtn.classList.toggle('active', isDeleteMode);
    deleteBtn.textContent = isDeleteMode ? "🚫 Delete Mode (ON)" : "🚫 Delete Mode (OFF)";
    uiStatus.textContent = isDeleteMode ? "Click a Station or Track to delete." : "Ready to build.";
});

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDeleteMode) {
        // --- DELETE MODE ACTION ---
        const clickedStation = getStationAt(x, y);
        const clickedTrack = getTrackAt(x, y);
        
        if (clickedStation) {
            deleteStation(clickedStation);
        } else if (clickedTrack) {
            deleteTrack(clickedTrack);
        }
        
    } else {
        // --- BUILD MODE ACTION ---
        const clickedStation = getStationAt(x, y);
        
        if (clickedStation) {
            dragging = true;
            startStation = clickedStation;
        } else {
            placeStation(x, y);
        }
    }
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    currentMousePos.x = e.clientX - rect.left;
    currentMousePos.y = e.clientY - rect.top;

    if (isDeleteMode) {
        // Update hover feedback in Delete Mode
        hoverStation = getStationAt(currentMousePos.x, currentMousePos.y);
        hoverTrack = getTrackAt(currentMousePos.x, currentMousePos.y);
        canvas.style.cursor = (hoverStation || hoverTrack) ? 'pointer' : 'default';
        if (hoverStation) uiStatus.textContent = `Click to delete S${hoverStation.id}. (50% Refund)`;
        else if (hoverTrack) uiStatus.textContent = `Click to delete track. (50% Refund)`;
        else uiStatus.textContent = "Click a Station or Track to delete.";

    } else if (dragging && startStation) {
        // Keep normal building drag cursor
        canvas.style.cursor = 'crosshair';
    } else {
        // Normal cursor
        canvas.style.cursor = 'crosshair';
    }
});

canvas.addEventListener('mouseup', e => {
    if (dragging && startStation) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const end = getStationAt(x, y);
        if (end) placeTrack(end);
    }
    dragging = false; startStation = null;
});

requestAnimationFrame(gameLoop);