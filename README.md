# 🥗 Freshly

A modern mobile-first app for predicting fruit/food freshness and managing your kitchen inventory, built with Expo, React Native, and a robust Python/Node backend.

---

## ✨ Features
- **AI Freshness Prediction**: Instantly predict the condition of fruits (banana, orange, pineapple, tomato) using sensor-style inputs (temperature, humidity, light, CO₂).
- **Real-Time Chat**: Message other users with smooth, mobile-optimized chat UX.
- **Profile & Photo Upload**: Edit your profile and upload an avatar directly from your device.
- **Modern Mobile UI**: Beautiful, dark/light adaptive design with keyboard-aware forms and fast navigation.
- **Inventory & Posting**: List, search, and manage food items with ease.
- **Cloud-Hosted Backend**: Node.js/Express API with ML model proxy and fallback, deployed on Render.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (18+ recommended)
- Python 3.9+
- Expo CLI (`npm install -g expo-cli`)

### 2. Clone & Install
```sh
git clone https://github.com/Nishanbhattarai498/Freshly.git
cd Freshly

# Install backend dependencies
cd backend
npm install

# (Optional) Set up Python venv and install ML requirements
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r ml/service/requirements.txt

# Install frontend dependencies
cd ../frontend/freshly
npm install
```

### 3. Run the App
- **Backend**: In `/backend`, run:
  ```sh
  npm start
  ```
- **Frontend (Expo)**: In `/frontend/freshly`, run:
  ```sh
  npx expo start
  ```
  Scan the QR code with Expo Go or run on an emulator.

---

## 📱 App Branding
- **App Icon & Splash**: Place your logo as `assets/images/logo.png` (used for both icon and splash).
- **Config**: See `app.json` for icon/splash settings.

---

## 🧠 ML Model
- Trained on real sensor data (`backend/ml/data/Dataset_deduplicated.csv`).
- Supports: banana, orange, pineapple, tomato.
- Predicts: `Good` or `Bad` condition.

---

## 🛠️ Project Structure
```
Freshly/
  backend/         # Node.js API, ML proxy, Python model
  frontend/
    freshly/       # Expo React Native app
      assets/images/  # Place logo.png here
      app.json     # Expo config (icon, splash)
```

---

## 🤝 Contributing
Pull requests welcome! Please open issues for bugs or feature requests.

---

## 📄 License
MIT

---

## 👤 Author
[Nishan Bhattarai](https://github.com/Nishanbhattarai498)
