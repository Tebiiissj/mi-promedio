// ===========================
// MiPromedio — Grade Calculator App
// ===========================

// Data store
let courses = [];
let editingCourseId = null;

// DOM refs
const coursesContainer = document.getElementById('coursesContainer');
const emptyState = document.getElementById('emptyState');
const courseModal = document.getElementById('courseModal');
const totalCoursesEl = document.getElementById('totalCourses');
const globalAverageEl = document.getElementById('globalAverage');
const approvedCountEl = document.getElementById('approvedCount');

const PASSING_GRADE = 3.95; // 3.95 rounds to 4.0
const MIN_GRADE = 1.0;
const MAX_GRADE = 7.0;

// ===========================
// Firebase & Cloud Sync Logic
// ===========================
const firebaseConfig = {
   // Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzBV-vIw8ec1ExTlSmGH7c-bCw-0XbJ8Q",
  authDomain: "mipromedio-app.firebaseapp.com",
  projectId: "mipromedio-app",
  storageBucket: "mipromedio-app.firebasestorage.app",
  messagingSenderId: "76902119281",
  appId: "1:76902119281:web:6724b438754f0d7e72e8d0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzBV-vIw8ec1ExTlSmGH7c-bCw-0XbJ8Q",
  authDomain: "mipromedio-app.firebaseapp.com",
  projectId: "mipromedio-app",
  storageBucket: "mipromedio-app.firebasestorage.app",
  messagingSenderId: "76902119281",
  appId: "1:76902119281:web:6724b438754f0d7e72e8d0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
};

const isFirebaseConfigured = Object.keys(firebaseConfig).length > 0;
let currentUser = null;
let db = null;
let auth = null;

if (isFirebaseConfigured && typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('userName').textContent = user.displayName || user.email;
            document.getElementById('userProfile').style.display = 'flex';
            loadFromFirebase();
        } else {
            currentUser = null;
            document.getElementById('loginOverlay').style.display = 'flex';
            document.getElementById('userProfile').style.display = 'none';
            courses = [];
            renderAll();
        }
    });
}

function loginWithGoogle() {
    if (!isFirebaseConfigured) {
        document.getElementById('firebaseConfigError').style.display = 'block';
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        console.error("Error en login:", error);
        showToast("Error al iniciar sesión");
    });
}

function logout() {
    if (auth) auth.signOut();
}

function continueOffline() {
    document.getElementById('loginOverlay').style.display = 'none';
    const profile = document.getElementById('userProfile');
    if(profile) profile.style.display = 'none';
    loadFromStorageFallback();
    renderAll();
}

async function loadFromFirebase() {
    try {
        const docRef = await db.collection('users').doc(currentUser.uid).get();
        if (docRef.exists) {
            courses = docRef.data().courses || [];
        } else {
            // Si es usuario nuevo, intentamos migrar los datos locales
            loadFromStorageFallback();
            if (courses.length > 0) saveToStorage();
        }
        renderAll();
    } catch (e) {
        console.error(e);
        showToast("Error al sincronizar datos");
    }
}

function loadFromStorageFallback() {
    const stored = localStorage.getItem('miPromedio_courses');
    if (stored) {
        try { courses = JSON.parse(stored); } catch (e) { courses = []; }
    }
}

function saveToStorage() {
    if (isFirebaseConfigured && currentUser) {
        db.collection('users').doc(currentUser.uid).set({ courses: courses })
            .catch(e => console.error("Error guardando en la nube: ", e));
    } else {
        localStorage.setItem('miPromedio_courses', JSON.stringify(courses));
    }
}

// ===========================
// Initialization
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    if (!isFirebaseConfigured) {
        document.getElementById('loginOverlay').style.display = 'flex';
    }
    createParticles();
});

// ===========================
// Particles Background
// ===========================
function createParticles() {
    const container = document.getElementById('bgParticles');
    if (!container) return;
    const colors = ['rgba(108,99,255,0.3)', 'rgba(0,212,255,0.2)', 'rgba(0,232,143,0.2)'];
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDuration = (Math.random() * 20 + 15) + 's';
        particle.style.animationDelay = (Math.random() * 15) + 's';
        container.appendChild(particle);
    }
}

// ===========================
// Course Modal
// ===========================
function openCourseModal(courseId = null) {
    editingCourseId = courseId;
    const modal = document.getElementById('courseModal');
    const title = document.getElementById('modalTitle');
    const nameInput = document.getElementById('courseName');
    const evalsInput = document.getElementById('courseEvals');
    const customCheck = document.getElementById('useCustomWeights');
    const weightsGroup = document.getElementById('weightsGroup');

    if (courseId) {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;
        title.textContent = 'Editar Curso';
        nameInput.value = course.name;
        evalsInput.value = course.evaluations.length;
        customCheck.checked = course.customWeights;
        weightsGroup.style.display = 'block';
        if (course.customWeights) {
            renderWeightInputs(course.evaluations.length, course.evaluations.map(e => e.weight));
        } else {
            document.getElementById('weightsContainer').style.display = 'none';
        }
    } else {
        title.textContent = 'Nuevo Curso';
        nameInput.value = '';
        evalsInput.value = 3;
        customCheck.checked = false;
        weightsGroup.style.display = 'block';
        document.getElementById('weightsContainer').style.display = 'none';
    }

    modal.classList.add('active');
    setTimeout(() => nameInput.focus(), 100);

    // Listen for eval count changes
    evalsInput.oninput = () => {
        if (customCheck.checked) {
            renderWeightInputs(parseInt(evalsInput.value) || 1);
        }
    };
}

function closeCourseModal() {
    courseModal.classList.remove('active');
    editingCourseId = null;
}

function toggleWeights() {
    const checked = document.getElementById('useCustomWeights').checked;
    const container = document.getElementById('weightsContainer');
    const evalsCount = parseInt(document.getElementById('courseEvals').value) || 1;
    
    if (checked) {
        container.style.display = 'grid';
        renderWeightInputs(evalsCount);
    } else {
        container.style.display = 'none';
    }
}

function renderWeightInputs(count, existingWeights = []) {
    const container = document.getElementById('weightsContainer');
    container.style.display = 'grid';
    let html = '';
    const defaultWeight = Math.round((100 / count) * 10) / 10;

    for (let i = 0; i < count; i++) {
        const weight = existingWeights[i] || defaultWeight;
        html += `
            <div class="weight-row">
                <label>Eval ${i + 1}</label>
                <input type="number" class="weight-input" value="${weight}" min="1" max="100" step="0.1" oninput="updateWeightTotal()"> %
            </div>
        `;
    }
    html += '<div class="weight-total" id="weightTotal"></div>';
    container.innerHTML = html;
    updateWeightTotal();
}

function updateWeightTotal() {
    const inputs = document.querySelectorAll('.weight-input');
    let total = 0;
    inputs.forEach(inp => total += parseFloat(inp.value) || 0);
    const totalEl = document.getElementById('weightTotal');
    if (totalEl) {
        totalEl.textContent = `Total: ${total.toFixed(1)}%`;
        totalEl.className = 'weight-total ' + (Math.abs(total - 100) < 0.5 ? 'valid' : 'invalid');
    }
}

function saveCourse() {
    const name = document.getElementById('courseName').value.trim();
    const evalsCount = parseInt(document.getElementById('courseEvals').value) || 1;
    const useCustom = document.getElementById('useCustomWeights').checked;

    if (!name) {
        showToast('Ingresa el nombre del curso');
        return;
    }

    if (evalsCount < 1 || evalsCount > 20) {
        showToast('El número de evaluaciones debe ser entre 1 y 20');
        return;
    }

    let weights = [];
    if (useCustom) {
        const weightInputs = document.querySelectorAll('.weight-input');
        let total = 0;
        weightInputs.forEach(inp => {
            const w = parseFloat(inp.value) || 0;
            weights.push(w);
            total += w;
        });
        if (Math.abs(total - 100) > 1) {
            showToast('Las ponderaciones deben sumar 100%');
            return;
        }
    } else {
        const equalWeight = 100 / evalsCount;
        for (let i = 0; i < evalsCount; i++) {
            weights.push(Math.round(equalWeight * 100) / 100);
        }
    }

    if (editingCourseId) {
        // Edit existing
        const course = courses.find(c => c.id === editingCourseId);
        if (course) {
            course.name = name;
            course.customWeights = useCustom;
            // Adjust evaluations array
            while (course.evaluations.length < evalsCount) {
                course.evaluations.push({
                    name: `Evaluación ${course.evaluations.length + 1}`,
                    weight: weights[course.evaluations.length],
                    grade: null
                });
            }
            while (course.evaluations.length > evalsCount) {
                course.evaluations.pop();
            }
            course.evaluations.forEach((ev, i) => {
                ev.weight = weights[i];
                ev.name = `Evaluación ${i + 1}`;
            });
        }
    } else {
        // New course
        const evaluations = [];
        for (let i = 0; i < evalsCount; i++) {
            evaluations.push({
                name: `Evaluación ${i + 1}`,
                weight: weights[i],
                grade: null
            });
        }
        courses.push({
            id: Date.now().toString(),
            name,
            customWeights: useCustom,
            evaluations,
            collapsed: false
        });
    }

    saveToStorage();
    renderAll();
    closeCourseModal();
    showToast(editingCourseId ? 'Curso actualizado' : 'Curso agregado exitosamente');
}

// ===========================
// Delete Course
// ===========================
function deleteCourse(id) {
    if (!confirm('¿Estás seguro de eliminar este curso?')) return;
    courses = courses.filter(c => c.id !== id);
    saveToStorage();
    renderAll();
    showToast('Curso eliminado');
}

// ===========================
// Toggle Course Collapse
// ===========================
function toggleCourse(id) {
    const course = courses.find(c => c.id === id);
    if (course) {
        course.collapsed = !course.collapsed;
        saveToStorage();
        renderAll();
    }
}

// ===========================
// Grade Input Handler
// ===========================
function updateGrade(courseId, evalIndex, value) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    if (value === '' || value === null || value === undefined) {
        course.evaluations[evalIndex].grade = null;
    } else {
        let grade = parseFloat(value);
        if (isNaN(grade)) {
            course.evaluations[evalIndex].grade = null;
        } else {
            grade = Math.max(MIN_GRADE, Math.min(MAX_GRADE, grade));
            course.evaluations[evalIndex].grade = grade;
        }
    }

    saveToStorage();
    // Re-render just the affected parts without losing focus
    updateCourseDisplay(courseId);
    updateSummary();
}

// ===========================
// Calculations
// ===========================
function calculateCourseAverage(course) {
    let weightedSum = 0;
    let weightUsed = 0;

    course.evaluations.forEach(ev => {
        if (ev.grade !== null && ev.grade !== undefined) {
            weightedSum += ev.grade * (ev.weight / 100);
            weightUsed += ev.weight / 100;
        }
    });

    if (weightUsed === 0) return null;
    return weightedSum / weightUsed;
}

function calculateCurrentWeightedSum(course) {
    let weightedSum = 0;
    course.evaluations.forEach(ev => {
        if (ev.grade !== null && ev.grade !== undefined) {
            weightedSum += ev.grade * (ev.weight / 100);
        }
    });
    return weightedSum;
}

function getWeightUsed(course) {
    let used = 0;
    course.evaluations.forEach(ev => {
        if (ev.grade !== null && ev.grade !== undefined) {
            used += ev.weight / 100;
        }
    });
    return used;
}

function getWeightRemaining(course) {
    let remaining = 0;
    course.evaluations.forEach(ev => {
        if (ev.grade === null || ev.grade === undefined) {
            remaining += ev.weight / 100;
        }
    });
    return remaining;
}

function getRemainingEvals(course) {
    return course.evaluations.filter(ev => ev.grade === null || ev.grade === undefined);
}

function getGradeStatus(avg) {
    if (avg === null) return 'pending';
    if (avg >= PASSING_GRADE) return 'approved';
    if (avg >= 3.5) return 'at-risk';
    return 'failing';
}

function calculateNeededGrade(course) {
    const remaining = getRemainingEvals(course);
    if (remaining.length === 0) return null;

    const currentSum = calculateCurrentWeightedSum(course);
    const remainingWeight = getWeightRemaining(course);

    if (remainingWeight === 0) return null;

    // For next single evaluation
    if (remaining.length === 1) {
        const needed = (PASSING_GRADE - currentSum) / remainingWeight;
        return {
            type: 'single',
            needed: Math.round(needed * 100) / 100,
            evalName: remaining[0].name,
            evalWeight: remaining[0].weight
        };
    }

    // For multiple remaining - calculate needed average across all remaining
    const neededAvg = (PASSING_GRADE - currentSum) / remainingWeight;
    
    // Also calculate for just the next one (assuming rest get the same grade)
    const nextEval = remaining[0];
    const nextWeight = nextEval.weight / 100;
    const otherRemainingWeight = remainingWeight - nextWeight;
    
    return {
        type: 'multiple',
        neededAvg: Math.round(neededAvg * 100) / 100,
        remainingCount: remaining.length,
        nextEvalName: nextEval.name,
        nextEvalWeight: nextEval.weight
    };
}

// ===========================
// Rendering
// ===========================
function renderAll() {
    renderCourses();
    updateSummary();
}

function updateSummary() {
    totalCoursesEl.textContent = courses.length;

    let totalAvg = 0;
    let countWithGrades = 0;
    let approvedCount = 0;

    courses.forEach(course => {
        const avg = calculateCourseAverage(course);
        if (avg !== null) {
            totalAvg += avg;
            countWithGrades++;
            if (avg >= PASSING_GRADE) approvedCount++;
        }
    });

    if (countWithGrades > 0) {
        globalAverageEl.textContent = (totalAvg / countWithGrades).toFixed(1);
        const globalStatus = getGradeStatus(totalAvg / countWithGrades);
        globalAverageEl.parentElement.parentElement.className = `summary-card summary-average`;
    } else {
        globalAverageEl.textContent = '—';
    }

    approvedCountEl.textContent = `${approvedCount}/${courses.length}`;
}

function renderCourses() {
    if (courses.length === 0) {
        emptyState.style.display = 'block';
        // Remove all course cards
        const cards = coursesContainer.querySelectorAll('.course-card');
        cards.forEach(c => c.remove());
        return;
    }

    emptyState.style.display = 'none';

    // Remove old cards
    const oldCards = coursesContainer.querySelectorAll('.course-card');
    oldCards.forEach(c => c.remove());

    courses.forEach(course => {
        const card = createCourseCard(course);
        coursesContainer.appendChild(card);
    });
}

function createCourseCard(course) {
    const avg = calculateCourseAverage(course);
    const status = getGradeStatus(avg);
    const isCollapsed = course.collapsed;
    const weightUsed = getWeightUsed(course) * 100;

    const card = document.createElement('div');
    card.className = 'course-card';
    card.id = `course-${course.id}`;

    // Header
    const header = document.createElement('div');
    header.className = 'course-header';
    header.onclick = (e) => {
        // Don't toggle if clicking action buttons
        if (e.target.closest('.course-actions')) return;
        toggleCourse(course.id);
    };

    header.innerHTML = `
        <div class="course-header-left">
            <div class="course-status-dot ${status}"></div>
            <span class="course-name">${escapeHtml(course.name)}</span>
        </div>
        <div class="course-header-right">
            <div class="course-average-badge ${status}">
                ${avg !== null ? avg.toFixed(1) : '—'}
            </div>
            <div class="course-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); openCourseModal('${course.id}')" title="Editar curso">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon" onclick="event.stopPropagation(); deleteCourse('${course.id}')" title="Eliminar curso">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
            <div class="course-toggle ${isCollapsed ? '' : 'open'}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
        </div>
    `;

    card.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = `course-body ${isCollapsed ? '' : 'open'}`;
    body.id = `course-body-${course.id}`;

    const inner = document.createElement('div');
    inner.className = 'course-body-inner';

    // Evaluations table
    inner.innerHTML = `
        <table class="evals-table">
            <thead>
                <tr>
                    <th>Evaluación</th>
                    <th>Ponderación</th>
                    <th>Nota</th>
                </tr>
            </thead>
            <tbody>
                ${course.evaluations.map((ev, idx) => `
                    <tr>
                        <td><span class="eval-name">${escapeHtml(ev.name)}</span></td>
                        <td><span class="eval-weight">${ev.weight.toFixed(1)}%</span></td>
                        <td>
                            <div class="grade-input-wrapper">
                                <input 
                                    type="number" 
                                    class="grade-input ${getGradeInputClass(ev.grade)}" 
                                    id="grade-${course.id}-${idx}"
                                    value="${ev.grade !== null ? ev.grade : ''}" 
                                    min="1" 
                                    max="7" 
                                    step="0.1" 
                                    placeholder="—"
                                    oninput="updateGrade('${course.id}', ${idx}, this.value)"
                                    onblur="onGradeBlur('${course.id}', ${idx}, this)"
                                >
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${renderProgressBar(weightUsed)}
        ${renderSuggestion(course)}
    `;

    body.appendChild(inner);
    card.appendChild(body);

    return card;
}

function getGradeInputClass(grade) {
    if (grade === null || grade === undefined) return '';
    if (grade >= PASSING_GRADE) return 'grade-good';
    if (grade >= 3.5) return 'grade-risk';
    return 'grade-bad';
}

function renderProgressBar(weightUsed) {
    return `
        <div class="progress-bar-container">
            <div class="progress-label">
                <span>Avance evaluaciones</span>
                <span>${weightUsed.toFixed(0)}% completado</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${weightUsed}%"></div>
            </div>
        </div>
    `;
}

function renderSuggestion(course) {
    const remaining = getRemainingEvals(course);
    const avg = calculateCourseAverage(course);
    const allGraded = remaining.length === 0;

    // If all evaluations have grades
    if (allGraded && avg !== null) {
        if (avg >= PASSING_GRADE) {
            return `
                <div class="suggestion-panel">
                    <div class="suggestion-approved">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <span>¡Felicidades! Has aprobado este curso con un promedio de <strong>${avg.toFixed(1)}</strong></span>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="suggestion-panel">
                    <div class="suggestion-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Resultado Final
                    </div>
                    <div class="suggestion-body">
                        Tu promedio final es <span class="suggestion-note-value impossible">${avg.toFixed(1)}</span>. 
                        Lamentablemente no alcanzas la nota aprobatoria de 4.0.
                    </div>
                </div>
            `;
        }
    }

    // If no grades entered yet
    if (avg === null) {
        return `
            <div class="suggestion-panel">
                <div class="suggestion-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Sugerencia
                </div>
                <div class="suggestion-body">
                    Ingresa tus notas para recibir recomendaciones sobre qué nota necesitas para aprobar.
                </div>
            </div>
        `;
    }

    // Calculate suggestion
    const needed = calculateNeededGrade(course);
    if (!needed) return '';

    if (needed.type === 'single') {
        return renderSingleSuggestion(needed, avg);
    } else {
        return renderMultipleSuggestion(needed, course, avg);
    }
}

function renderSingleSuggestion(needed, currentAvg) {
    let message = '';
    let valueClass = '';

    if (needed.needed <= MIN_GRADE) {
        valueClass = 'achievable';
        message = `Ya tienes el curso aprobado sin importar lo que saques en <strong>${escapeHtml(needed.evalName)}</strong>. ¡Excelente trabajo! 🎉`;
    } else if (needed.needed <= 4.0) {
        valueClass = 'achievable';
        message = `Necesitas al menos un <span class="suggestion-note-value achievable">${needed.needed.toFixed(1)}</span> en <strong>${escapeHtml(needed.evalName)}</strong> (${needed.evalWeight.toFixed(1)}%) para aprobar. ¡Totalmente alcanzable! 💪`;
    } else if (needed.needed <= 5.5) {
        valueClass = 'achievable';
        message = `Necesitas al menos un <span class="suggestion-note-value achievable">${needed.needed.toFixed(1)}</span> en <strong>${escapeHtml(needed.evalName)}</strong> (${needed.evalWeight.toFixed(1)}%) para aprobar. ¡Tú puedes! 📚`;
    } else if (needed.needed <= MAX_GRADE) {
        valueClass = 'hard';
        message = `Necesitas al menos un <span class="suggestion-note-value hard">${needed.needed.toFixed(1)}</span> en <strong>${escapeHtml(needed.evalName)}</strong> (${needed.evalWeight.toFixed(1)}%) para aprobar. Va a ser difícil, ¡pero no imposible! 🔥`;
    } else {
        valueClass = 'impossible';
        message = `Necesitarías un <span class="suggestion-note-value impossible">${needed.needed.toFixed(1)}</span> en <strong>${escapeHtml(needed.evalName)}</strong>, lo cual supera la nota máxima de 7.0. Lamentablemente no es posible aprobar solo con esta evaluación. 😔`;
    }

    return `
        <div class="suggestion-panel">
            <div class="suggestion-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Sugerencia para aprobar
            </div>
            <div class="suggestion-body">
                ${message}
            </div>
        </div>
    `;
}

function renderMultipleSuggestion(needed, course, currentAvg) {
    let message = '';

    if (needed.neededAvg <= MIN_GRADE) {
        message = `Ya tienes el curso aprobado sin importar tus notas restantes. ¡Excelente trabajo! 🎉`;
    } else if (needed.neededAvg <= MAX_GRADE) {
        let difficultyClass = 'achievable';
        if (needed.neededAvg > 5.5) difficultyClass = 'hard';
        if (needed.neededAvg > MAX_GRADE) difficultyClass = 'impossible';

        message = `Te quedan <strong>${needed.remainingCount} evaluaciones</strong> pendientes. 
            Necesitas un promedio mínimo de <span class="suggestion-note-value ${difficultyClass}">${needed.neededAvg.toFixed(1)}</span> 
            en las evaluaciones restantes para aprobar con 4.0.`;
        
        // Add specific advice per remaining eval
        const remainingEvals = getRemainingEvals(course);
        if (remainingEvals.length <= 4) {
            const currentSum = calculateCurrentWeightedSum(course);
            const targetGrade = PASSING_GRADE;

            message += `<br><br><strong>Detalle por evaluación pendiente:</strong><br>`;
            
            // Simulate: if all remaining get needed avg
            remainingEvals.forEach((ev, i) => {
                // Calculate what happens if this eval gets different grades
                const otherSum = currentSum;
                let otherWeightedGrades = 0;
                remainingEvals.forEach((otherEv, j) => {
                    if (i !== j) {
                        otherWeightedGrades += needed.neededAvg * (otherEv.weight / 100);
                    }
                });
                const thisNeeded = (targetGrade - otherSum - otherWeightedGrades) / (ev.weight / 100);
                const rounded = Math.round(thisNeeded * 100) / 100;
                
                let cls = 'achievable';
                if (rounded > 5.5) cls = 'hard';
                if (rounded > MAX_GRADE) cls = 'impossible';
                if (rounded < MIN_GRADE) cls = 'achievable';
                
                message += `• ${escapeHtml(ev.name)} (${ev.weight.toFixed(1)}%): mín. <span class="suggestion-note-value ${cls}">${Math.max(MIN_GRADE, rounded).toFixed(1)}</span> si las demás promedian ${needed.neededAvg.toFixed(1)}<br>`;
            });
        }
    } else {
        message = `Necesitarías un promedio de <span class="suggestion-note-value impossible">${needed.neededAvg.toFixed(1)}</span> en las ${needed.remainingCount} evaluaciones restantes, lo cual supera la nota máxima de 7.0. Será muy difícil aprobar este curso. 😔`;
    }

    return `
        <div class="suggestion-panel">
            <div class="suggestion-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Sugerencia para aprobar
            </div>
            <div class="suggestion-body">
                ${message}
            </div>
        </div>
    `;
}

// ===========================
// Update without full re-render
// ===========================
function updateCourseDisplay(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const card = document.getElementById(`course-${courseId}`);
    if (!card) return;

    // Update badge
    const avg = calculateCourseAverage(course);
    const status = getGradeStatus(avg);
    const badge = card.querySelector('.course-average-badge');
    if (badge) {
        badge.textContent = avg !== null ? avg.toFixed(1) : '—';
        badge.className = `course-average-badge ${status}`;
    }

    // Update dot
    const dot = card.querySelector('.course-status-dot');
    if (dot) dot.className = `course-status-dot ${status}`;

    // Update grade input classes
    course.evaluations.forEach((ev, idx) => {
        const input = document.getElementById(`grade-${courseId}-${idx}`);
        if (input) {
            const cls = getGradeInputClass(ev.grade);
            input.className = `grade-input ${cls}`;
        }
    });

    // Update progress bar
    const weightUsed = getWeightUsed(course) * 100;
    const progressFill = card.querySelector('.progress-fill');
    if (progressFill) progressFill.style.width = weightUsed + '%';
    const progressLabel = card.querySelector('.progress-label span:last-child');
    if (progressLabel) progressLabel.textContent = `${weightUsed.toFixed(0)}% completado`;

    // Update suggestion panel
    const bodyInner = card.querySelector('.course-body-inner');
    if (bodyInner) {
        const oldSuggestion = bodyInner.querySelector('.suggestion-panel');
        if (oldSuggestion) oldSuggestion.remove();
        bodyInner.insertAdjacentHTML('beforeend', renderSuggestion(course));
    }
}

function onGradeBlur(courseId, evalIndex, input) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const ev = course.evaluations[evalIndex];
    if (ev.grade !== null) {
        input.value = ev.grade;
    }
}

// ===========================
// Toast
// ===========================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===========================
// Utilities
// ===========================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal on overlay click
courseModal.addEventListener('click', (e) => {
    if (e.target === courseModal) closeCourseModal();
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && courseModal.classList.contains('active')) {
        closeCourseModal();
    }
});
