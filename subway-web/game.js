// --- Configuration & Constants ---
const CANVAS_ID = 'gameCanvas';
const STATION_RADIUS = 10;
const STATION_COST = 200;
const TRACK_COST_PER_UNIT = 10;
const TRAIN_SPEED = 2; // Pixels per frame
const TRAINS_PER_STATION = 2;
const INCOME_INTERVAL = 1000; // ms

// Colors
const COLOR_TRACK = '#008080';     // Teal
const COLOR_STATION = '#ffffff';   // White
const COLOR_STATION_BORDER = '#333';
const COLOR_TRAIN = '#ff0055';     // Hot Pink
const COLOR_CITY_BLOCK = '#e0e0e0';
const COLOR_CITY_ROAD = '#ffffff';

// --- Game State ---
let budget = 3000; // Starting budget
let stations = [];
let tracks = [];
let trains = [];

// Interaction State
let dragging = false;
let startStation = null;
let currentMousePos = { x: 0, y: 0 };
let stationIdCounter = 1;

// --- Setup ---
const canvas = document.getElementById(CANVAS_ID);
const ctx = canvas.getContext('2d');

// UI Elements
const uiBudget = document.getElementById('budget');
const uiStations = document.getElementById('stationCount');
const uiTrack = document.getElementById('trackLength');
const uiTrains = document.getElementById('trainCount');
const uiStatus = document.getElementById('statusMsg');

// --- Helper Functions ---

function snapToGrid(val) {
    // Snap to a 40px grid for that "city block" alignment
    return Math.round(val / 40) * 40;
}

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

/**
 * Generates a unique key for a track segment so we can identify it.
 * Order doesn't matter: 1-4 is the same as 4-1.
 */
function getTrackKey(s1, s2) {
    return s1.id < s2.id ? `${s1.id}-${s2.id}` : `${s2.id}-${s1.id}`;
}

// --- Drawing Functions ---

function drawCityMap() {
    // Fill background (Road color)
    ctx.fillStyle = COLOR_CITY_ROAD;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Blocks
    ctx.fillStyle = COLOR_CITY_BLOCK;
    const blockSize = 32;
    const gridSize = 40; // 32px block + 8px road
    
    // Offset slightly so stations snap to intersections (roads)
    for (let x = 24; x < canvas.width; x += gridSize) {
        for (let y = 24; y < canvas.height; y += gridSize) {
            ctx.fillRect(x, y, blockSize, blockSize);
        }
    }
}

function drawTracks() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const t of tracks) {
        ctx.beginPath();
        ctx.moveTo(t.start.x, t.start.y);
        ctx.lineTo(t.end.x, t.end.y);
        ctx.lineWidth = 6;
        ctx.strokeStyle = COLOR_TRACK;
        ctx.stroke();
        
        // Inner rail detail
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    }

    // Drag line (preview)
    if (dragging && startStation) {
        const sx = snapToGrid(currentMousePos.x);
        const sy = snapToGrid(currentMousePos.y);
        
        ctx.beginPath();
        ctx.moveTo(startStation.x, startStation.y);
        ctx.lineTo(sx, sy);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; // Ghost line
        ctx.stroke();
        
        // Calculate potential cost
        const dist = getDistance(startStation, {x: sx, y: sy});
        const cost = Math.floor(dist * TRACK_COST_PER_UNIT);
        
        uiStatus.textContent = `Building Track: $${cost}`;
        uiStatus.style.color = cost > budget ? 'red' : 'green';
    }
}

function drawStations() {
    for (const s of stations) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, STATION_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_STATION;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = COLOR_STATION_BORDER;
        ctx.stroke();
        
        // Station Label
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.fillText(`S${s.id}`, s.x + 12, s.y - 12);
    }
}

function drawTrains() {
    ctx.fillStyle = COLOR_TRAIN;
    for (const t of trains) {
        const size = 6;
        ctx.fillRect(t.x - size/2, t.y - size/2, size, size);
    }
}

function updateUI() {
    uiBudget.textContent = Math.floor(budget);
    uiStations.textContent = stations.length;
    uiTrains.textContent = trains.length;
    
    // Calculate total track length
    const totalLen = tracks.reduce((acc, t) => acc + t.length, 0);
    uiTrack.textContent = (totalLen / 100).toFixed(1); // Scale down for display
}

// --- Game Logic ---

function spawnTrains(station) {
    for (let i = 0; i < TRAINS_PER_STATION; i++) {
        trains.push({
            x: station.x,
            y: station.y,
            currentStation: station,
            targetTrack: null,
            targetStation: null,
            distanceTraveled: 0,
            direction: 1, // 1 or -1
            lastTrackKey: null // KEY FIX: Remembers previous track
        });
    }
}

function placeStation(x, y) {
    const sx = snapToGrid(x);
    const sy = snapToGrid(y);

    if (getStationAt(sx, sy)) {
        uiStatus.textContent = "Station blocked!";
        return;
    }

    if (budget >= STATION_COST) {
        budget -= STATION_COST;
        const newStation = { id: stationIdCounter++, x: sx, y: sy };
        stations.push(newStation);
        spawnTrains(newStation);
        uiStatus.textContent = "Station Placed.";
        uiStatus.style.color = 'black';
    } else {
        uiStatus.textContent = "Insufficient Funds!";
        uiStatus.style.color = 'red';
    }
}

function placeTrack(endStation) {
    if (!startStation || startStation === endStation) return;

    // Check if track exists
    const key = getTrackKey(startStation, endStation);
    if (tracks.some(t => t.key === key)) {
        uiStatus.textContent = "Track already exists.";
        return;
    }

    const dist = getDistance(startStation, endStation);
    const cost = Math.floor(dist * TRACK_COST_PER_UNIT);

    if (budget >= cost) {
        budget -= cost;
        tracks.push({
            start: startStation,
            end: endStation,
            length: dist,
            key: key
        });
        uiStatus.textContent = "Track Built.";
        uiStatus.style.color = 'black';
    } else {
        uiStatus.textContent = "Insufficient Funds!";
        uiStatus.style.color = 'red';
    }
}

// --- THE CORE MOVEMENT LOGIC (FIXED) ---
function updateTrains() {
    for (const train of trains) {
        
        // 1. Stopped at a station, needs a new destination
        if (train.currentStation && !train.targetTrack) {
            
            // Find connected tracks
            let options = tracks.filter(t => 
                t.start === train.currentStation || t.end === train.currentStation
            );

            // Filter out the track we just came from (unless it's the only option)
            const nonBacktrackOptions = options.filter(t => t.key !== train.lastTrackKey);
            
            if (nonBacktrackOptions.length > 0) {
                // We have choices that aren't "go back", pick one randomly
                options = nonBacktrackOptions;
            } 
            // Else: We hit a dead end, `options` still contains the backtrack track, so we use it.

            if (options.length > 0) {
                // Pick random track from valid options
                const choice = options[Math.floor(Math.random() * options.length)];
                
                train.targetTrack = choice;
                train.distanceTraveled = 0;
                
                // Set direction and destination
                if (choice.start === train.currentStation) {
                    train.targetStation = choice.end;
                    train.direction = 1;
                } else {
                    train.targetStation = choice.start;
                    train.direction = -1;
                }

                // Clear station state
                train.currentStation = null;
            }
            continue;
        }

        // 2. Moving along a track
        if (train.targetTrack) {
            train.distanceTraveled += TRAIN_SPEED;
            
            const t = train.targetTrack;
            const ratio = train.distanceTraveled / t.length;

            const startP = train.direction === 1 ? t.start : t.end;
            const endP = train.direction === 1 ? t.end : t.start;

            train.x = startP.x + (endP.x - startP.x) * ratio;
            train.y = startP.y + (endP.y - startP.y) * ratio;

            // Arrived?
            if (train.distanceTraveled >= t.length) {
                train.x = train.targetStation.x;
                train.y = train.targetStation.y;
                
                // Remember where we came from
                train.lastTrackKey = train.targetTrack.key;
                
                train.currentStation = train.targetStation;
                train.targetTrack = null;
                train.targetStation = null;
            }
        }
    }
}

// --- Main Loop ---

function gameLoop() {
    // Clear & Redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawCityMap();
    drawTracks();
    drawStations();
    
    updateTrains();
    drawTrains();
    
    updateUI();
    
    requestAnimationFrame(gameLoop);
}

// Income Cycle
setInterval(() => {
    // Base income + Bonus for connected network size
    const income = 100 + (stations.length * 15) + (trains.length * 5);
    budget += income;
    uiStatus.textContent = `Income: +$${income}`;
    uiStatus.style.color = '#008080';
}, INCOME_INTERVAL);

// --- Input Handling ---

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedStation = getStationAt(x, y);
    
    if (clickedStation) {
        dragging = true;
        startStation = clickedStation;
    } else {
        placeStation(x, y);
    }
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    currentMousePos.x = e.clientX - rect.left;
    currentMousePos.y = e.clientY - rect.top;
});

canvas.addEventListener('mouseup', e => {
    if (dragging && startStation) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const endStation = getStationAt(x, y);
        
        if (endStation) {
            placeTrack(endStation);
        } else {
            uiStatus.textContent = "Cancelled.";
        }
    }
    dragging = false;
    startStation = null;
});

// Start
requestAnimationFrame(gameLoop);
console.log("Subway Tycoon Started.");