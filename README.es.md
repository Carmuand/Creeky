<h1 align="center">
  Creeky
</h1>

<p align="center">
  <a href="README.md">English</a> · <b>Español</b>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-111111?style=for-the-badge&logo=react&logoColor=61DAFB">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-111111?style=for-the-badge&logo=typescript&logoColor=3178C6">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-111111?style=for-the-badge&logo=vite&logoColor=646CFF">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-111111?style=for-the-badge&logo=tailwindcss&logoColor=06B6D4">
  <img alt="Python" src="https://img.shields.io/badge/Python-111111?style=for-the-badge&logo=python&logoColor=3776AB">
  <img alt="pywebview" src="https://img.shields.io/badge/pywebview-111111?style=for-the-badge&logo=python&logoColor=FFD43B">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-111111?style=for-the-badge&logo=sqlite&logoColor=74C0FC">
  <img alt="SQLAlchemy" src="https://img.shields.io/badge/SQLAlchemy-111111?style=for-the-badge&logo=sqlalchemy&logoColor=D71F00">
</p>

<p align="center">
  <img src=".github/preview.png" alt="Vista previa de Creeky"/>
</p>

Creeky es una aplicación de escritorio para Windows de productividad personal que reúne tareas, tiempo y hábitos en un solo lugar. Todo funciona en local, sin servidores: tus datos viven en una base de datos SQLite en tu equipo y cada cuenta tiene los suyos.

---

## Funcionalidades

- **Tareas y listas** con prioridad, fecha, duración, repetición semanal, etiquetas y descripción. Vista de lista y tablero Kanban con arrastrar y soltar.
- **Calendario** con vistas de año, mes, semana, día y lista, conectado a las tareas por fecha y repetición.
- **Pomodoro** 25/5/15 con anillo de progreso, historial filtrable y reserva de sesiones por tarea.
- **Matriz Eisenhower** Q1–Q4 vinculada a la prioridad; arrastra para cambiarla.
- **Hábitos** con tabla semanal, racha y mejor racha, y recordatorio diario.
- **Cuenta regresiva** para eventos manuales y automática para tareas con fecha.
- **Búsqueda** en vivo por título, descripción y etiquetas, con filtros por lista, prioridad y estado.
- **Notificaciones** dentro de la app y como notificaciones nativas de Windows para alarmas de tareas y hábitos.
- **Integración con la UNAD** que inicia sesión en el Campus Virtual, muestra tu perfil del campus y sincroniza las agendas de tus cursos en el calendario, con avisos cuando una actividad abre o está por cerrar.
- **Copias cifradas** exportadas a un archivo `.dat` con una clave de recuperación de un solo uso, importables en cualquier cuenta.
- **Perfil** con estadísticas por lista y prioridad, racha y foco.
- **Configuración** de idioma (español e inglés), tamaño de ventana, inicio con Windows y repetición del tutorial.
- **Tutorial guiado** para usuarios nuevos que recorre cada sección.

---

## Arquitectura

El frontend es React + TypeScript + Tailwind CSS, organizado por funcionalidad en `app/src/features/`. El backend es Python sobre pywebview y es el dueño de todos los datos:

- **Almacenamiento**: SQLite mediante SQLAlchemy en `%APPDATA%\Creeky\user\creeky.db`, con tablas relacionales separadas por cuenta.
- **Credenciales**: los hashes de contraseña (PBKDF2) y la sesión activa se guardan en el Administrador de credenciales de Windows mediante `keyring`; la base de datos nunca guarda contraseñas.
- **Puente**: el frontend llama a un método de la API por entidad y mantiene en memoria la última instantánea.
- **Eventos**: el backend nunca llama a la página. Publica eventos en el estado compartido de pywebview y el frontend los escucha.
- **Recordatorios**: un planificador en segundo plano dispara los recordatorios de tareas y hábitos y los muestra con `desktop-notifier`.
- **Copias**: AES-256-GCM con una clave derivada por scrypt a partir de una clave de recuperación generada en cada exportación.

---

## Requisitos

- Windows 10 o posterior
- Node 18+
- Python 3.12+

---

## Instalación

```bash
git clone https://github.com/Zerik-Official/Creeky
cd Creeky
```

### Backend

```bash
python -m venv venv
venv\Scripts\activate
pip install -r app\requirements.txt
```

### Frontend

```bash
cd app
npm install
copy .env.example .env
```

---

## Ejecución

La ventana de escritorio necesita el backend, así que la app se usa a través de pywebview y no directamente en un navegador.

Inicia el servidor de desarrollo de Vite:

```bash
cd app
npm run dev
```

Después, en otra terminal, inicia la ventana de escritorio:

```bash
venv\Scripts\activate
python app\desktop\main.py
```

Con `DEBUG=true` en `app/.env` la ventana carga el servidor de Vite. Sin él, carga el build de producción de `app/dist`.

---

## Compilar el ejecutable

```powershell
.\tools\build.ps1
```

El script compila el frontend y empaqueta la app con PyInstaller en modo carpeta, sin ventana de consola y con el icono de la aplicación. El resultado es `build\Creeky\Creeky.exe`. Al terminar pregunta si quieres instalar la app en una carpeta de tu elección y si quieres crear un acceso directo en el escritorio, que reemplaza al que ya exista.

| Parámetro | Efecto |
| --- | --- |
| `-SkipFrontend` | Reutiliza el `app/dist` existente. |
| `-Console` | Mantiene la consola para leer los registros. |
| `-Clean` | Elimina primero la salida del build anterior. |
| `-InstallDir <ruta>` | Instala en esa carpeta sin preguntar. |
| `-Shortcut` / `-NoShortcut` | Crea u omite el acceso directo sin preguntar. |
| `-NoPrompt` | No pregunta nada; deja el build donde está. |

---

## Estructura del proyecto

```
Creeky/
├── tools/
│   └── build.ps1
└── app/
    ├── desktop/
    │   ├── main.py
    │   ├── bootstrap.py
    │   ├── config.py
    │   ├── api/
    │   ├── core/
    │   ├── database/
    │   └── utills/
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── components/
    │   ├── features/
    │   ├── hooks/
    │   ├── i18n/
    │   ├── services/
    │   ├── styles/
    │   ├── types/
    │   └── utils/
    ├── index.html
    ├── package.json
    └── requirements.txt
```
