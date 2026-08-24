/* =====================================================
   ÁLBUM DE FOTOS VIRTUAL — Lógica con JavaScript
   ===================================================== */

'use strict';

/* ---------- Categorías (cada una con su color) ---------- */
const CATEGORIAS = [
  { id: 'familia',  nombre: 'Familia',  color: '#e63946' }, // rojo
  { id: 'viajes',   nombre: 'Viajes',   color: '#1d7fd6' }, // azul
  { id: 'amigos',   nombre: 'Amigos',   color: '#2a9d3f' }, // verde
  { id: 'eventos',  nombre: 'Eventos',  color: '#f4a300' }, // naranja
  { id: 'otros',    nombre: 'Otros',    color: '#8e44ad' }  // morado
];

/* ---------- Estado de la aplicación ---------- */
let fotos = [];            // { id, dataURL, categoria }
let filtroActual = '';     // '' => mostrar todas
let imagenPendiente = null; // dataURL esperando a que se elija categoría

/* ---------- Referencias al DOM ---------- */
const $btnCargar       = document.getElementById('btnCargar');
const $zonaFormulario  = document.getElementById('zonaFormulario');
const $formFoto        = document.getElementById('formFoto');
const $inputFoto       = document.getElementById('inputFoto');
const $selectCategoria = document.getElementById('selectCategoria');
const $btnCancelar     = document.getElementById('btnCancelar');
const $vistaPrevia     = document.getElementById('vistaPrevia');
const $imgPreview      = document.getElementById('imgPreview');
const $galeria         = document.getElementById('galeria');
const $contador        = document.getElementById('contador');
const $mensajeVacio    = document.getElementById('mensajeVacio');
const $leyenda         = document.getElementById('leyendaCategorias');
const $filtro          = document.getElementById('filtroCategoria');
const $modalImg        = document.getElementById('modalImg');
const $modalInfo       = document.getElementById('modalInfo');
const $modalFoto       = new bootstrap.Modal(document.getElementById('modalFoto'));

/* ---------- Utilidades ---------- */
function obtenerCategoria(id) {
  return CATEGORIAS.find(c => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1];
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- Construir selects y leyendas ---------- */
function poblarSelects() {
  // Select del formulario
  $selectCategoria.innerHTML = CATEGORIAS.map(c =>
    `<option value="${c.id}">${c.nombre}</option>`).join('');

  // Filtro del navbar
  $filtro.innerHTML =
    '<option value="">Todas las categorías</option>' +
    CATEGORIAS.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

function pintarLeyenda() {
  $leyenda.innerHTML = '';

  const itemTodas = crearItemLeyenda('', 'Todas', '#212529', !filtroActual);
  $leyenda.appendChild(itemTodas);

  CATEGORIAS.forEach(cat => {
    $leyenda.appendChild(crearItemLeyenda(cat.id, cat.nombre, cat.color, filtroActual === cat.id));
  });
}

function crearItemLeyenda(id, nombre, color, activa) {
  const span = document.createElement('span');
  span.className = 'leyenda-item' + (activa ? ' activa' : '');
  span.style.setProperty('--color-cat', color);
  span.innerHTML = `<span class="punto"></span>${nombre}`;
  span.addEventListener('click', () => {
    filtroActual = id;
    $filtro.value = id;
    pintarLeyenda();
    renderizarGaleria();
  });
  return span;
}

/* ---------- Render de la galería ---------- */
function renderizarGaleria() {
  $galeria.innerHTML = '';

  const visibles = fotos.filter(f => !filtroActual || f.categoria === filtroActual);

  visibles.forEach(foto => {
    const cat = obtenerCategoria(foto.categoria);

    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

    col.innerHTML = `
      <article class="tarjeta-foto" style="--color-cat:${cat.color}">
        <img src="${foto.dataURL}" alt="Foto ${cat.nombre}" data-id="${foto.id}">
        <div class="pie">
          <span class="badge-cat">${cat.nombre}</span>
          <button type="button" class="btn-eliminar" title="Eliminar foto" data-id="${foto.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </article>`;

    $galeria.appendChild(col);
  });

  // Mensaje vacío y contador
  $mensajeVacio.classList.toggle('d-none', visibles.length > 0);
  const texto = visibles.length === 1 ? 'foto' : 'fotos';
  $contador.textContent = `${visibles.length} ${texto}` +
    (filtroActual ? ` en “${obtenerCategoria(filtroActual).nombre}”` : ' en total');

  // Eventos: abrir modal / eliminar
  $galeria.querySelectorAll('img[data-id]').forEach(img =>
    img.addEventListener('click', () => abrirModal(img.dataset.id)));

  $galeria.querySelectorAll('.btn-eliminar').forEach(btn =>
    btn.addEventListener('click', () => eliminarFoto(btn.dataset.id)));
}

/* ---------- Acciones sobre las fotos ---------- */
function agregarFoto(dataURL, categoria) {
  fotos.push({ id: generarId(), dataURL, categoria });
  if (filtroActual && categoria !== filtroActual) return; // no romper el filtro actual
  renderizarGaleria();
}

function eliminarFoto(id) {
  if (!confirm('¿Eliminar esta foto del álbum?')) return;
  fotos = fotos.filter(f => f.id !== id);
  renderizarGaleria();
}

function abrirModal(id) {
  const foto = fotos.find(f => f.id === id);
  if (!foto) return;

  const cat = obtenerCategoria(foto.categoria);
  $modalImg.src = foto.dataURL;
  $modalInfo.textContent = cat.nombre;
  $modalInfo.style.backgroundColor = cat.color;
  $modalFoto.show();
}

/* ---------- Formulario de carga ---------- */
function mostrarFormulario(mostrar) {
  $zonaFormulario.classList.toggle('d-none', !mostrar);
  if (!mostrar) {
    $formFoto.reset();
    $vistaPrevia.classList.add('d-none');
    $inputFoto.value = '';
    imagenPendiente = null;
  }
}

$inputFoto.addEventListener('change', () => {
  const archivo = $inputFoto.files[0];
  if (!archivo) return;

  if (!archivo.type.startsWith('image/')) {
    alert('El archivo seleccionado no es una imagen.');
    $inputFoto.value = '';
    return;
  }

  const lector = new FileReader();
  lector.onload = e => {
    imagenPendiente = e.target.result;
    $imgPreview.src = imagenPendiente;
    $vistaPrevia.classList.remove('d-none');
  };
  lector.readAsDataURL(archivo);
});

$formFoto.addEventListener('submit', e => {
  e.preventDefault();

  if (!imagenPendiente) {
    alert('Primero selecciona una imagen.');
    return;
  }

  agregarFoto(imagenPendiente, $selectCategoria.value);
  mostrarFormulario(false);
});

/* ---------- Eventos globales ---------- */
$btnCargar.addEventListener('click', () => {
  mostrarFormulario(true);
  $inputFoto.click(); // abre el explorador de archivos directamente
});

$btnCancelar.addEventListener('click', () => mostrarFormulario(false));

$filtro.addEventListener('change', () => {
  filtroActual = $filtro.value;
  pintarLeyenda();
  renderizarGaleria();
});

/* ---------- Inicio ---------- */
poblarSelects();
pintarLeyenda();
renderizarGaleria();
