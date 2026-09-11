/* =====================================================
   ÁLBUM DE FOTOS VIRTUAL — Lógica con JavaScript
   -----------------------------------------------------
   Base de datos: IndexedDB (AlbumFotosDB)
   Tablas (object stores):
     • categoria -> { id, nombre, color, orden }
     • foto      -> { id, nombre, categoria, ruta, miniatura, archivo, fecha }
     • carpeta   -> { clave, handle }  (carpeta del disco, opcional)
   ===================================================== */

'use strict';

/* ---------- Configuración de la base de datos ---------- */
const DB_NOMBRE  = 'AlbumFotosDB';
const DB_VERSION = 1;
const TABLA_CATEGORIAS = 'categoria';
const TABLA_FOTOS      = 'foto';
const TABLA_CARPETA    = 'carpeta';

const ARCHIVO_CATEGORIAS = 'categorias.txt';

/* ---------- Categorías predeterminadas (tabla categoria) ---------- */
const CATEGORIAS_DEFECTO = [
  { id: 'cat_chris',     nombre: 'Chris',      color: '#0d6efd', orden: 1 },
  { id: 'cat_yazz',      nombre: 'Yazz',       color: '#d63384', orden: 2 },
  { id: 'cat_tuyyo',     nombre: 'Tú y Yo',    color: '#e63946', orden: 3 },
  { id: 'cat_costarica', nombre: 'Costa Rica', color: '#198754', orden: 4 },
  { id: 'cat_mexico',    nombre: 'México',     color: '#fd7e14', orden: 5 }
];

const CATEGORIA_VACIA = { id: '', nombre: 'Sin categoría', color: '#6c757d' };

/* ---------- Estado de la aplicación ---------- */
let db = null;
let categorias = [];
let fotos = [];
let filtroActual = 'todas';
let carpetaConectada = null;
let imagenesPendientes = [];
const soportaCarpetas = 'showDirectoryPicker' in window;

/* ---------- Referencias al DOM ---------- */
const $btnCargar       = document.getElementById('btnCargar');
const $btnCarpeta      = document.getElementById('btnCarpeta');
const $btnGestionar    = document.getElementById('btnGestionar');
const $zonaFormulario  = document.getElementById('zonaFormulario');
const $formFoto        = document.getElementById('formFoto');
const $inputFoto       = document.getElementById('inputFoto');
const $selectCategoria = document.getElementById('selectCategoria');
const $btnCancelar     = document.getElementById('btnCancelar');
const $vistaPrevia     = document.getElementById('vistaPrevia');
const $txtCantidad     = document.getElementById('txtCantidad');
const $imgPreview      = document.getElementById('imgPreview');
const $galeria         = document.getElementById('galeria');
const $contador        = document.getElementById('contador');
const $mensajeVacio    = document.getElementById('mensajeVacio');
const $leyenda         = document.getElementById('leyendaCategorias');
const $filtro          = document.getElementById('filtroCategoria');
const $modalImg        = document.getElementById('modalImg');
const $modalInfo       = document.getElementById('modalInfo');
const $listaCategorias = document.getElementById('listaCategorias');
const $btnNuevaCategoria = document.getElementById('btnNuevaCategoria');
const $modalFoto       = new bootstrap.Modal(document.getElementById('modalFoto'));
const $modalCategorias = new bootstrap.Modal(document.getElementById('modalCategorias'));

/* =====================================================
   BASE DE DATOS (IndexedDB)
   ===================================================== */

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = req.result;
      if (!d.objectStoreNames.contains(TABLA_CATEGORIAS)) {
        const storeCat = d.createObjectStore(TABLA_CATEGORIAS, { keyPath: 'id' });
        storeCat.createIndex('por_nombre', 'nombre', { unique: true });
      }
      if (!d.objectStoreNames.contains(TABLA_FOTOS)) {
        const storeFoto = d.createObjectStore(TABLA_FOTOS, { keyPath: 'id' });
        storeFoto.createIndex('por_categoria', 'categoria', { unique: false });
      }
      if (!d.objectStoreNames.contains(TABLA_CARPETA)) {
        d.createObjectStore(TABLA_CARPETA, { keyPath: 'clave' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function pedir(tabla, modo, accion) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(tabla, modo);
    const store = tx.objectStore(tabla);
    const req = accion(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

const obtenerCategoriasDB = () => pedir(TABLA_CATEGORIAS, 'readonly',  s => s.getAll());
const guardarCategoriaDB  = c  => pedir(TABLA_CATEGORIAS, 'readwrite', s => s.put(c));
const borrarCategoriaDB   = id => pedir(TABLA_CATEGORIAS, 'readwrite', s => s.delete(id));
const obtenerFotosDB      = () => pedir(TABLA_FOTOS, 'readonly',  s => s.getAll());
const guardarFotoDB       = f  => pedir(TABLA_FOTOS, 'readwrite', s => s.put(f));
const borrarFotoDB        = id => pedir(TABLA_FOTOS, 'readwrite', s => s.delete(id));
const guardarCarpetaDB    = handle => pedir(TABLA_CARPETA, 'readwrite', s => s.put({ clave: 'carpeta', handle }));
const obtenerCarpetaDB    = () => pedir(TABLA_CARPETA, 'readonly', s => s.get('carpeta'));

async function sembrarCategorias() {
  const existentes = await obtenerCategoriasDB();
  if (existentes.length) return;
  for (const cat of CATEGORIAS_DEFECTO) await guardarCategoriaDB(cat);
}

/* =====================================================
   UTILIDADES
   ===================================================== */

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getCategoria(id) {
  return categorias.find(c => c.id === id) || CATEGORIA_VACIA;
}

function esImagen(nombre) {
  return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(nombre || '');
}

function leerComoDataURL(archivo) {
  return new Promise((res, rej) => {
    const lector = new FileReader();
    lector.onload  = () => res(lector.result);
    lector.onerror = () => rej(lector.error);
    lector.readAsDataURL(archivo);
  });
}

// Crea una miniatura pequeña para que la galería cargue rápido
function crearMiniatura(archivo, maxLado = 480) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      try {
        const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * escala));
        const h = Math.max(1, Math.round(img.naturalHeight * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (err) {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

/* =====================================================
   CATEGORÍAS — recarga, selects y leyenda
   ===================================================== */

async function recargarCategorias() {
  categorias = (await obtenerCategoriasDB()).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  poblarSelects();
  pintarLeyenda();
  exportarCategoriasATxt();
}

async function recargarFotos() {
  fotos = (await obtenerFotosDB()).sort((a, b) => b.fecha - a.fecha);
  renderizarGaleria();
}

function poblarSelects() {
  $selectCategoria.innerHTML = categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  $filtro.innerHTML =
    '<option value="todas">Todas las categorías</option>' +
    categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

function pintarLeyenda() {
  $leyenda.innerHTML = '';
  $leyenda.appendChild(crearItemLeyenda('todas', 'Todas', '#212529', filtroActual === 'todas'));
  categorias.forEach(cat =>
    $leyenda.appendChild(crearItemLeyenda(cat.id, cat.nombre, cat.color, filtroActual === cat.id)));
  if (fotos.some(f => !f.categoria)) {
    $leyenda.appendChild(crearItemLeyenda('sin', 'Sin categoría', CATEGORIA_VACIA.color, filtroActual === 'sin'));
  }
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

/* =====================================================
   GALERÍA
   ===================================================== */

function renderizarGaleria() {
  $galeria.innerHTML = '';

  const visibles = fotos.filter(f =>
    filtroActual === 'todas' ||
    (filtroActual === 'sin' ? !f.categoria : f.categoria === filtroActual));

  visibles.forEach(foto => {
    const cat = getCategoria(foto.categoria);
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

    col.innerHTML = `
      <article class="tarjeta-foto" style="--color-cat:${cat.color}">
        <img src="${foto.miniatura || foto.ruta}" alt="Foto de ${cat.nombre}" data-id="${foto.id}" loading="lazy">
        <div class="pie">
          <span class="badge-cat">${cat.nombre}</span>
          <button type="button" class="btn-eliminar" title="Eliminar foto" data-id="${foto.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </article>`;

    $galeria.appendChild(col);
  });

  $mensajeVacio.classList.toggle('d-none', visibles.length > 0);
  const texto = visibles.length === 1 ? 'foto' : 'fotos';
  let donde = 'en total';
  if (filtroActual === 'sin') donde = 'sin categoría';
  else if (filtroActual !== 'todas') donde = `en “${getCategoria(filtroActual).nombre}”`;
  $contador.textContent = `${visibles.length} ${texto} ${donde}`;

  $galeria.querySelectorAll('img[data-id]').forEach(img =>
    img.addEventListener('click', () => abrirModal(img.dataset.id)));

  $galeria.querySelectorAll('.btn-eliminar').forEach(btn =>
    btn.addEventListener('click', () => eliminarFoto(btn.dataset.id)));
}

function abrirModal(id) {
  const foto = fotos.find(f => f.id === id);
  if (!foto) return;
  const cat = getCategoria(foto.categoria);
  $modalImg.src = foto.ruta;
  $modalInfo.textContent = cat.nombre;
  $modalInfo.style.backgroundColor = cat.color;
  $modalFoto.show();
}

async function eliminarFoto(id) {
  if (!confirm('¿Eliminar esta foto del álbum?')) return;
  await borrarFotoDB(id);
  await recargarFotos();
}

/* =====================================================
   SUBIR FOTOS (se guardan en la tabla foto)
   ===================================================== */

async function guardarFotoEnDb(nombre, categoria, archivo) {
  const [ruta, miniatura] = await Promise.all([
    leerComoDataURL(archivo),
    crearMiniatura(archivo)
  ]);
  const foto = { id: generarId(), nombre, categoria, ruta, miniatura, archivo, fecha: Date.now() };
  await guardarFotoDB(foto);
  return foto;
}

$inputFoto.addEventListener('change', () => {
  const archivos = Array.from($inputFoto.files || []);
  if (!archivos.length) return;
  imagenesPendientes = archivos.filter(a => a.type.startsWith('image/'));
  if (imagenesPendientes.length !== archivos.length) {
    alert('Se ignoraron archivos que no son imágenes.');
  }
  if (!imagenesPendientes.length) { $inputFoto.value = ''; return; }

  const primera = imagenesPendientes[0];
  $imgPreview.src = URL.createObjectURL(primera);
  $txtCantidad.textContent = imagenesPendientes.length > 1
    ? `${imagenesPendientes.length} imágenes seleccionadas`
    : primera.name;
  $vistaPrevia.classList.remove('d-none');
});

$formFoto.addEventListener('submit', async e => {
  e.preventDefault();
  if (!imagenesPendientes.length) {
    alert('Primero selecciona una imagen.');
    return;
  }
  const categoria = $selectCategoria.value;
  const archivos = imagenesPendientes;
  imagenesPendientes = [];
  $inputFoto.value = '';
  $vistaPrevia.classList.add('d-none');

  for (const archivo of archivos) {
    await guardarFotoEnDb(archivo.name, categoria, archivo);
    if (carpetaConectada) {
      try { await escribirArchivoEnCarpeta(archivo); } catch (err) { console.warn(err); }
    }
  }
  await recargarFotos();
});

/* =====================================================
   GESTIÓN DE CATEGORÍAS (tabla categoria)
   ===================================================== */

$btnGestionar.addEventListener('click', () => {
  renderListaCategorias();
  $modalCategorias.show();
});

$btnNuevaCategoria.addEventListener('click', () => {
  const orden = categorias.reduce((m, c) => Math.max(m, c.orden || 0), 0) + 1;
  $listaCategorias.appendChild(
    filaCategoria({ id: generarId(), nombre: '', color: '#0dcaf0', orden }, true));
});

function renderListaCategorias() {
  $listaCategorias.innerHTML = '';
  categorias.forEach(cat => $listaCategorias.appendChild(filaCategoria(cat, false)));
}

function filaCategoria(cat, esNueva) {
  const fila = document.createElement('div');
  fila.className = 'row g-2 align-items-center mb-2 cat-fila' + (esNueva ? ' cat-nueva' : '');

  const botones = esNueva
    ? '<button type="button" class="btn btn-sm btn-success cat-guardar flex-fill"><i class="bi bi-check-lg me-1"></i>Guardar</button>'
    : '' +
      '<button type="button" class="btn btn-sm btn-success cat-guardar flex-fill"><i class="bi bi-check-lg me-1"></i>Guardar</button>' +
      '<button type="button" class="btn btn-sm btn-outline-danger cat-eliminar flex-fill"><i class="bi bi-trash"></i></button>';

  fila.innerHTML = `
    <div class="col-12 col-sm-3">
      <input type="color" class="form-control form-control-color cat-color" value="${cat.color}" title="Color de la categoría">
    </div>
    <div class="col-12 col-sm-5">
      <input type="text" class="form-control cat-nombre" value="${cat.nombre}" placeholder="Nombre de la categoría">
    </div>
    <div class="col-12 col-sm-4 d-flex gap-2">${botones}</div>`;

  const $nombre = fila.querySelector('.cat-nombre');
  const $color  = fila.querySelector('.cat-color');

  fila.querySelector('.cat-guardar').addEventListener('click', async () => {
    const nombre = $nombre.value.trim();
    if (!nombre) { alert('Escribe un nombre para la categoría.'); return; }
    if (categorias.some(c => c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== cat.id)) {
      alert('Ya existe una categoría con ese nombre.');
      return;
    }
    await guardarCategoriaDB({ id: cat.id, nombre, color: $color.value, orden: cat.orden || 0 });
    await recargarCategorias();
    await recargarFotos();
    renderListaCategorias();
  });

  if (!esNueva) {
    fila.querySelector('.cat-eliminar').addEventListener('click', () => eliminarCategoria(cat.id));
  }

  return fila;
}

async function eliminarCategoria(id) {
  const cat = getCategoria(id);
  if (!confirm(`¿Eliminar la categoría “${cat.nombre}”?\nLas fotos de esa categoría pasarán a “Sin categoría”.`)) return;

  const fotosDeCat = fotos.filter(f => f.categoria === id);
  for (const f of fotosDeCat) { f.categoria = ''; await guardarFotoDB(f); }

  await borrarCategoriaDB(id);
  if (filtroActual === id) filtroActual = 'todas';

  await recargarCategorias();
  await recargarFotos();
  renderListaCategorias();
}

/* =====================================================
   CARPETA EN EL DISCO (File System Access API)
   Guarda las fotos subidas en una carpeta real y genera
   categorias.txt con las categorías (nombre;color).
   ===================================================== */

$btnCarpeta.addEventListener('click', () => {
  if (carpetaConectada) { trasConexion(); return; }
  conectarCarpeta();
});

async function conectarCarpeta() {
  try {
    carpetaConectada = await window.showDirectoryPicker({ mode: 'readwrite' });
    await guardarCarpetaDB(carpetaConectada);
    await trasConexion();
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    alert('No se pudo conectar la carpeta: ' + err.message);
  }
}

async function pedirPermiso() {
  let permiso = await carpetaConectada.queryPermission({ mode: 'readwrite' });
  if (permiso !== 'granted') permiso = await carpetaConectada.requestPermission({ mode: 'readwrite' });
  return permiso;
}

async function trasConexion() {
  const permiso = await pedirPermiso();
  pintarEstadoCarpeta();
  if (permiso !== 'granted') {
    alert('Sin permiso de lectura/escritura en la carpeta.');
    return;
  }
  const txt = await leerArchivoDeCarpeta(ARCHIVO_CATEGORIAS);
  if (txt !== null) {
    await importarCategoriasDeTxt(txt);
    await recargarCategorias();
  }
  await importarFotosDeCarpeta();
}

function pintarEstadoCarpeta() {
  const conectada = !!carpetaConectada;
  $btnCarpeta.classList.toggle('btn-outline-secondary', !conectada);
  $btnCarpeta.classList.toggle('btn-success', conectada);
  $btnCarpeta.innerHTML = conectada
    ? `<i class="bi bi-folder-check me-1"></i>${carpetaConectada.name}`
    : '<i class="bi bi-folder2-open me-1"></i>Conectar carpeta';
  $btnCarpeta.title = conectada
    ? 'Carpeta conectada. Las fotos subidas se guardan aquí'
    : 'Guardar las fotos subidas en una carpeta de tu PC';
}

async function intentarConectarCarpetaGuardada() {
  if (!soportaCarpetas) return;
  try {
    const guardada = await obtenerCarpetaDB();
    if (!guardada || !guardada.handle) return;
    carpetaConectada = guardada.handle;
    const permiso = await carpetaConectada.queryPermission({ mode: 'readwrite' });
    if (permiso === 'granted') {
      await trasConexion();
    }
    pintarEstadoCarpeta();
  } catch (err) {
    console.warn('No se pudo recuperar la carpeta guardada:', err);
    carpetaConectada = null;
    pintarEstadoCarpeta();
  }
}

async function escribirArchivoEnCarpeta(archivo) {
  const handle = await carpetaConectada.getFileHandle(archivo.name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(archivo);
  await writable.close();
}

async function leerArchivoDeCarpeta(nombre) {
  try {
    const handle = await carpetaConectada.getFileHandle(nombre);
    const file = await handle.getFile();
    return await file.text();
  } catch (err) {
    return null;
  }
}

function textoCategorias() {
  return categorias.map(c => `${c.id}|${c.nombre}|${c.color}|${c.orden || 0}`).join('\n');
}

async function exportarCategoriasATxt() {
  if (!carpetaConectada) return;
  try {
    const handle = await carpetaConectada.getFileHandle(ARCHIVO_CATEGORIAS, { create: true });
    const writable = await handle.createWritable();
    await writable.write(textoCategorias());
    await writable.close();
  } catch (err) {
    console.warn('No se pudo escribir categorias.txt:', err);
  }
}

async function importarCategoriasDeTxt(texto) {
  const lineas = texto.split(/\r?\n/);
  for (const linea of lineas) {
    const t = linea.trim();
    if (!t || t.startsWith('#')) continue;
    const [id, nombre, color, orden] = t.split('|').map(s => (s || '').trim());
    if (!id || !nombre) continue;
    await guardarCategoriaDB({ id, nombre, color: color || '#808080', orden: Number(orden) || 0 });
  }
}

async function importarFotosDeCarpeta() {
  if (!carpetaConectada) return;
  const nombresExistentes = new Set(fotos.map(f => f.nombre));
  const nuevos = [];
  try {
    for await (const [nombre, handle] of carpetaConectada.entries()) {
      if (!handle || handle.kind !== 'file') continue;
      if (!esImagen(nombre) || nombre === ARCHIVO_CATEGORIAS) continue;
      if (nombresExistentes.has(nombre)) continue;
      nuevos.push(await handle.getFile());
    }
  } catch (err) {
    console.warn('No se pudo leer la carpeta:', err);
  }
  const categoria = filtroActual !== 'todas' && filtroActual !== 'sin' ? filtroActual : '';
  for (const archivo of nuevos) {
    await guardarFotoEnDb(archivo.name, categoria, archivo);
  }
  if (nuevos.length) await recargarFotos();
}

/* =====================================================
   EVENTOS GLOBALES
   ===================================================== */

$btnCargar.addEventListener('click', () => {
  mostrarFormulario(true);
  $inputFoto.click();
});

$btnCancelar.addEventListener('click', () => mostrarFormulario(false));

function mostrarFormulario(mostrar) {
  $zonaFormulario.classList.toggle('d-none', !mostrar);
  if (!mostrar) {
    $formFoto.reset();
    $vistaPrevia.classList.add('d-none');
    if ($imgPreview.src.startsWith('blob:')) URL.revokeObjectURL($imgPreview.src);
    $inputFoto.value = '';
    imagenesPendientes = [];
  }
}

$filtro.addEventListener('change', () => {
  filtroActual = $filtro.value;
  pintarLeyenda();
  renderizarGaleria();
});

/* =====================================================
   INICIO
   ===================================================== */

async function iniciar() {
  try {
    db = await abrirDB();
    await sembrarCategorias();
    await recargarCategorias();
    await recargarFotos();
    if (soportaCarpetas) await intentarConectarCarpetaGuardada();
  } catch (err) {
    console.error(err);
    alert('No se pudo iniciar la base de datos del álbum: ' + err.message);
  }
}

if (soportaCarpetas) {
  $btnCarpeta.classList.remove('d-none');
  pintarEstadoCarpeta();
}

iniciar();