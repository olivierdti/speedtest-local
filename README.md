# 🚀 Speedtest Local

Application web moderne de test de vitesse réseau pour environnements locaux (LAN/Gigabit). Interface style Speedtest.net avec jauge animée, thème sombre et mesures en temps réel.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Fonctionnalités

- 🎯 **Test de vitesse complet** : Download, Upload et Ping
- 🌊 **Connexions parallèles** : 4 connexions simultanées pour saturer la bande passante
- 📊 **Interface moderne** : Jauge circulaire animée avec aiguille en temps réel
- 🌙 **Thème sombre** : Design noir épuré avec Tailwind CSS
- 🔒 **Protection locale** : Bloque les tests depuis le même PC pour éviter les faux résultats
- 📱 **Responsive** : Fonctionne sur mobile, tablette et desktop
- ⚡ **Optimisé Gigabit** : Chunks 1MB et streaming pour atteindre 800-950 Mbps

## 📋 Prérequis

- **Node.js** 14.0+ ([télécharger](https://nodejs.org/))
- **NPM** (inclus avec Node.js)
- **Navigateur moderne** (Chrome, Firefox, Edge, Safari)

## 🛠️ Installation

```powershell
cd speedtest-local
npm install
npm start
```

Le serveur affichera :
```
╔════════════════════════════════════════════════════════╗
║  Speedtest Local Server                                ║
╠════════════════════════════════════════════════════════╣
║  Local:   http://localhost:3000                        ║
║  Network: http://192.168.1.100:3000                    ║
╚════════════════════════════════════════════════════════╝
```

## 🎮 Utilisation

### Test depuis un autre appareil (recommandé)

1. Démarrez le serveur sur votre PC
2. Notez l'URL **Network** affichée (ex: `http://192.168.1.100:3000`)
3. Ouvrez cette URL depuis un **autre appareil** du réseau (téléphone, tablette, autre PC)
4. Cliquez sur le bouton **GO**
5. Attendez 20-25 secondes (Ping → Download → Upload)

### Pourquoi pas depuis le même PC ?

L'application **bloque** automatiquement les tests depuis localhost pour éviter :
- ❌ Mesures faussées (boucle interne, pas de réseau)
- ❌ Résultats irréalistes (>10 Gbps)
- ❌ Tests inutiles (pas de passage par le switch/routeur)

Si vous accédez depuis le même PC, vous verrez un **avertissement jaune** et le bouton sera **désactivé**.

## 📊 Comprendre les résultats

| Métrique | Description | Valeurs typiques (Gigabit) |
|----------|-------------|----------------------------|
| **Ping** | Latence réseau (aller-retour) | 1-5 ms (LAN filaire)<br>5-20 ms (WiFi) |
| **Download** | Vitesse de réception | 800-950 Mbps (Gigabit)<br>200-400 Mbps (WiFi 5Ghz) |
| **Upload** | Vitesse d'envoi | 800-950 Mbps (Gigabit)<br>150-300 Mbps (WiFi 5Ghz) |

### Facteurs impactant les résultats

- **Câble Ethernet** : Cat5e minimum (Cat6 recommandé)
- **Carte réseau** : Gigabit (1000 Mbps)
- **Switch/Routeur** : Ports Gigabit
- **WiFi** : 802.11ac (WiFi 5) ou 802.11ax (WiFi 6)
- **CPU** : Charge élevée = résultats plus faibles
- **Autres appareils** : Partage de bande passante

## 🏗️ Architecture technique

### Stack

- **Backend** : Express.js (Node.js)
- **Frontend** : EJS (templates), Vanilla JavaScript
- **Styling** : Tailwind CSS (CDN)
- **Icônes** : Font Awesome 6

### Endpoints API

| Route | Méthode | Description |
|-------|---------|-------------|
| `/` | GET | Page principale |
| `/ping` | GET | Endpoint latence (retourne timestamp) |
| `/download-stream` | GET | Stream continu de chunks 1MB |
| `/upload` | POST | Reçoit et compte les octets uploadés |

## 📁 Structure du projet

```
speedtest-local/
├── server.js              # Serveur Express
├── package.json           # Dépendances npm
├── views/
│   └── index.ejs         # Template HTML principal
├── public/
│   └── js/
│       └── client.js     # Logique client (tests, UI)
├── .gitignore
└── README.md             # Cette documentation
```
## ⚙️ Personnalisation

### Modifier la durée des tests

```javascript
// public/js/client.js fonctions measureDownloadStream et measureUploadStream
const durationMs = 10000; // 10 secondes (modifier à votre convenance)
```

### Ajuster le nombre de connexions

```javascript
// public/js/client.js ligne 82 et 176
const numConnections = 4; // Passer à 6 ou 8 pour plus de débit
```

## 🐛 Dépannage

### Le serveur ne démarre pas

```powershell
# Vérifier que le port n'est pas déjà utilisé
netstat -ano | findstr :3000

# Tuer le processus si nécessaire
taskkill /PID <PID> /F
```

### Résultats trop faibles

1. ✅ Vérifier que vous testez depuis **un autre appareil**
2. ✅ Utiliser un **câble Ethernet** (pas WiFi)
3. ✅ Fermer les autres applications réseau (torrents, streaming)
4. ✅ Vérifier que votre carte réseau est Gigabit
5. ✅ Augmenter le nombre de connexions à 6-8

### L'upload ne fonctionne pas

- **Navigateur ancien** : Mettre à jour Chrome/Firefox/Edge
- **Pare-feu** : Autoriser le port 3000
- **Limite mémoire** : L'upload utilise 1MB chunks × 4 connexions = 4MB RAM minimum

## 📝 License

MIT © 2025

---

**Note** : Cette application est conçue pour tester des réseaux **locaux** (LAN). Pour tester votre connexion Internet, utilisez [Speedtest.net](https://www.speedtest.net/).
