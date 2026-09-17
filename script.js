/* ============================================================
   Los horarios ya NO están acá: se cargan desde clases.json.
   Para actualizar el horario del cuatrimestre, editá ese archivo
   (mismo formato, no hace falta tocar este script).
   ============================================================ */

let AULAS = [];
let CLASES = [];

const DIAS = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
const DIAS_LABEL = { lunes:"Lunes", martes:"Martes", miercoles:"Miércoles", jueves:"Jueves", viernes:"Viernes", sabado:"Sábado" };
const ORDEN_DIAS = ["lunes","martes","miercoles","jueves","viernes","sabado"];

function horaAMin(hstr) {
  const [h, m] = hstr.split(":").map(Number);
  return h * 60 + m;
}

function claseEnCurso(aula, diaActual, minActual) {
  return CLASES.find(c =>
    c.aula === aula &&
    c.dia === diaActual &&
    minActual >= horaAMin(c.hora_inicio) &&
    minActual < horaAMin(c.hora_fin)
  ) || null;
}

function minutosHastaFin(clase, minActual) {
  return horaAMin(clase.hora_fin) - minActual;
}

function claseDe(aula) {
  return CLASES.filter(c => c.aula === aula);
}

let anioFiltro = "todos";
let aulaAbierta = null;
let mostrarTodas = false;

function renderReloj() {
  const ahora = new Date();
  const diaActual = DIAS[ahora.getDay()];
  const minActual = ahora.getHours() * 60 + ahora.getMinutes();
  document.getElementById("reloj-dia").textContent = DIAS_LABEL[diaActual] || "Fin de semana";
  document.getElementById("reloj-hora").textContent =
    String(ahora.getHours()).padStart(2,"0") + ":" + String(ahora.getMinutes()).padStart(2,"0");
  return { diaActual, minActual };
}

function crearCard(aula, diaActual, minActual) {
  const clase = claseEnCurso(aula, diaActual, minActual);
  const card = document.createElement("button");
  card.className = "card";
  card.setAttribute("aria-label", `Aula ${aula.toUpperCase()}, ${clase ? "ocupada" : "libre"}`);

  let pillHtml, cuerpoHtml;
  if (clase) {
    const faltan = minutosHastaFin(clase, minActual);
    const pronto = faltan <= 15;
    pillHtml = `<span class="pill ${pronto ? "pronto" : "ocupada"}">${pronto ? `libre en ${faltan} min` : "en uso"}</span>`;
    cuerpoHtml = `<div class="detalle-corto">
      <div class="dc-materia">${clase.materia}</div>
      <div class="dc-profe">${clase.profesor}</div>
      <div class="dc-meta">${clase.carrera} · ${clase.anio}° año · hasta ${clase.hora_fin}</div>
    </div>`;
  } else {
    pillHtml = `<span class="pill libre">libre</span>`;
    cuerpoHtml = `<div class="vacio">Sin clases ahora</div>`;
  }

  card.innerHTML = `
    <span class="id">${aula.toUpperCase()}</span>
    ${pillHtml}
    ${cuerpoHtml}
  `;
  card.addEventListener("click", () => abrirPanel(aula));
  return card;
}

function renderGrid() {
  const { diaActual, minActual } = renderReloj();
  const plantaBaja = document.getElementById("planta-baja");
  const plantaAlta = document.getElementById("planta-alta");
  plantaBaja.innerHTML = "";
  plantaAlta.innerHTML = "";

  const mitad = Math.ceil(AULAS.length / 2);
  AULAS.slice(0, mitad).forEach(aula => plantaBaja.appendChild(crearCard(aula, diaActual, minActual)));
  AULAS.slice(mitad).forEach(aula => plantaAlta.appendChild(crearCard(aula, diaActual, minActual)));
}

function renderPanel() {
  if (!aulaAbierta) return;
  const diaActual = DIAS[new Date().getDay()];
  const minActual = new Date().getHours() * 60 + new Date().getMinutes();
  const clase = claseEnCurso(aulaAbierta, diaActual, minActual);

  // --- Bloque "ahora": detalle completo de lo que hay en este momento ---
  let estadoHtml;
  if (clase) {
    estadoHtml = `
      <span class="pill ocupada">en uso</span>
      <div class="ahora-detalle">
        <div class="ahora-materia">${clase.materia}</div>
        <div class="ahora-linea"><span class="ahora-label">Profesor/a</span> ${clase.profesor}</div>
        <div class="ahora-linea"><span class="ahora-label">Carrera</span> ${clase.carrera}</div>
        <div class="ahora-linea"><span class="ahora-label">Año</span> ${clase.anio}° año</div>
        <div class="ahora-linea"><span class="ahora-label">Horario</span> ${clase.hora_inicio}–${clase.hora_fin} hs</div>
      </div>`;
  } else {
    estadoHtml = `<span class="pill libre">libre ahora</span>`;
  }

  document.getElementById("panel-contenido").innerHTML = `
    <h2>${aulaAbierta.toUpperCase()}</h2>
    <div class="estado-actual">${estadoHtml}</div>
    <button class="ver-todas ${mostrarTodas ? "abierto" : ""}" id="btn-ver-todas">
      <span>${mostrarTodas ? "Ocultar horario completo" : "Ver todas las clases de esta aula"}</span>
      <span class="flecha">⌄</span>
    </button>
    <div id="horario-completo"></div>
  `;

  document.getElementById("btn-ver-todas").addEventListener("click", () => {
    mostrarTodas = !mostrarTodas;
    renderPanel();
  });

  if (mostrarTodas) {
    renderHorarioCompleto();
  }
}

function renderHorarioCompleto() {
  const todas = claseDe(aulaAbierta);
  const anios = [...new Set(todas.map(c => c.anio))].sort((a,b) => a-b);

  const tabsHtml = `
    <button data-anio="todos" class="${anioFiltro === "todos" ? "activo" : ""}">Todos</button>
    ${anios.map(a => `<button data-anio="${a}" class="${anioFiltro == a ? "activo" : ""}">${a}° año</button>`).join("")}
  `;

  const diasConClases = ORDEN_DIAS.filter(d => todas.some(c => c.dia === d && (anioFiltro === "todos" || c.anio == anioFiltro)));

  let cuerpoHtml;
  if (diasConClases.length === 0) {
    cuerpoHtml = `<p class="sin-clases">No hay clases registradas para este filtro.</p>`;
  } else {
    cuerpoHtml = diasConClases.map(dia => {
      const clasesDia = todas
        .filter(c => c.dia === dia && (anioFiltro === "todos" || c.anio == anioFiltro))
        .sort((a,b) => horaAMin(a.hora_inicio) - horaAMin(b.hora_inicio));
      return `
        <div class="dia-bloque">
          <h3>${DIAS_LABEL[dia]}</h3>
          ${clasesDia.map(c => `
            <div class="clase-item">
              <div class="hora">${c.hora_inicio}–${c.hora_fin}</div>
              <div class="info">
                <div class="materia">${c.materia}</div>
                <div class="profe">${c.profesor}</div>
                <div class="anio">${c.carrera} · ${c.anio}° año</div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }).join("");
  }

  document.getElementById("horario-completo").innerHTML = `
    <div class="tabs" id="tabs">${tabsHtml}</div>
    ${cuerpoHtml}
  `;

  document.querySelectorAll("#tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      anioFiltro = btn.dataset.anio;
      renderHorarioCompleto();
    });
  });
}

function abrirPanel(aula) {
  aulaAbierta = aula;
  anioFiltro = "todos";
  mostrarTodas = false;
  renderPanel();
  document.getElementById("backdrop").classList.add("activo");
  document.getElementById("panel").classList.add("activo");
}

function cerrarPanel() {
  aulaAbierta = null;
  document.getElementById("backdrop").classList.remove("activo");
  document.getElementById("panel").classList.remove("activo");
}

document.getElementById("backdrop").addEventListener("click", cerrarPanel);
document.getElementById("cerrar-panel").addEventListener("click", cerrarPanel);
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    cerrarPanel();
    document.getElementById("fab-panel").classList.remove("activo");
  }
});

/* FAB / feedback */
const fabBtn = document.getElementById("fab-btn");
const fabPanel = document.getElementById("fab-panel");
fabBtn.addEventListener("click", () => fabPanel.classList.toggle("activo"));

/* Carga de datos + arranque */
async function init() {
  try {
    const res = await fetch("clases.json");
    if (!res.ok) throw new Error("No se pudo leer clases.json (status " + res.status + ")");
    const data = await res.json();
    AULAS = data.aulas;
    CLASES = data.clases;
  } catch (err) {
    document.getElementById("planta-baja").innerHTML =
      `<p class="sin-clases">No se pudo cargar clases.json. Si abriste el archivo con doble click, 
       el navegador bloquea esa carga por seguridad (CORS) — corré un servidor local 
       (ej: <code>python3 -m http.server</code> en esta carpeta) y entrá por 
       <code>http://localhost:8000</code>. Detalle: ${err.message}</p>`;
    return;
  }

  const selectAula = document.getElementById("f-aula");
  AULAS.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a.toUpperCase();
    selectAula.appendChild(opt);
  });

  renderGrid();
  setInterval(renderGrid, 60 * 1000); // recalcula estado cada minuto
}

init();
