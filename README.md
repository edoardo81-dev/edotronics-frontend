# Edotronics — Frontend (React + Vite)

Frontend della demo **Edotronics**, un e-commerce/gestionale didattico per articoli di elettronica.

🌐 **Live App (Render):** https://edotronics-frontend.onrender.com  
🔗 **Backend (Render):** https://edotronics-backend.onrender.com  

---

## Descrizione

Esercizio didattico sulle **relazioni bidirezionali tra entità** che ho implementato realizzando un e-commerce/gestionale per una piattaforma di articoli di elettronica.
Puoi entrare nella piattaforma come **ospite** e consultare il catalogo cliccando il tasto **"Entra nel catalogo senza credenziali"**, ma per fare acquisti
devi effettuare la **registrazione** e inserire le tue credenziali.

✅ Per consultare gli ordini di prova del cliente fittizio "Mario Rossi":
usa:
- Username: user
- Password: user

✅ Per entrare come **amministratore** ed avere pieno controllo su:
- gestione ordini
- gestione prodotti (CRUD completo)
- statistiche vendite
- creazione promozioni
- inserimento nuovi prodotti
- gestione **Stock Alerts** (avvisi automatici quando rimane 1 solo prodotto in magazzino, eccetto i prodotti della sezione “usato”)

usa:
- **Username:** `admin`
- **Password:** `admin`

---

## Funzionalità principali

### Modalità Ospite
- Accesso al catalogo senza login
- Ricerca e navigazione categorie

### Area Utente (USER)
- Carrello e creazione ordine
- Pagina profilo
- “I miei ordini” (`/me/orders`)
- Gestione password / dati profilo (area personale)

### Area Admin (ADMIN)
- Dashboard prodotti (CRUD completo)
- Gestione ordini
- Gestione promozioni
- Stock alerts
- Aggiornamenti in tempo reale inventario (SSE)

---

## Stack Tecnologico

- **React + TypeScript**
- **Vite**
- **React Router**
- **Axios** (interceptors con gestione token)
- UI custom **Black & Gold** (CSS + inline styles)
- **SSE (Server-Sent Events)** lato client per aggiornamenti realtime inventario

---

## Configurazione ambiente

Il frontend legge la URL del backend da variabile:

- `VITE_API_URL`

Esempio (`.env` in locale):

```env
VITE_API_URL=http://localhost:8080
Su Render va configurata in Environment Variables:

VITE_API_URL = https://edotronics-backend.onrender.com

Avvio in locale
npm install
npm run dev
Build:

npm run build
npm run preview
Note Deploy (Render)
Progetto deployato come Static Site

Rewrites configurati per SPA routing (refresh su /me/orders ecc.)

Link utili
Frontend (live): https://edotronics-frontend.onrender.com

Backend (live): https://edotronics-backend.onrender.com
