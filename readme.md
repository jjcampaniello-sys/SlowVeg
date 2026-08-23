# 🥦 SlowVeg — Assistant de Cuisson Éco-Légumes

SlowVeg est une application web PWA légère conçue pour optimiser la cuisson des **légumes** (seuls ou en mélanges/recettes échelonnées) en tirant parti de la chaleur résiduelle des ustensiles en inox à fond épais et de l'inertie des plaques à induction.

---

## 🔬 Fondements Biochimiques et Thermiques

### 1. Dégradation des Pectines & Ramollissement Cellulaire
- **Parois cellulaires (Pectines & Protopectines) :** La rupture de la structure cellulaire des légumes s'effectue entre 80°C et 85°C. La cuisson passive maintient le récipient au-dessus de cette plage critique pendant 15 à 30 minutes sans consommer d'électricité.
- **Rôle de l'Amidon (Tubercules & Légumineuses) :** La gélatinisation de l'amidon (entre 60°C et 75°C) se poursuit idéalement à l'étouffée, rendant les patates, carottes et légumineuses parfaitement digestes sans surcuisson superficielle.

### 2. Préservation Nutritionnelle
- **Vitamines Thermolabil (Vitamine C & B9) :** La réduction du temps d'ébullition active limite la destruction par oxydation thermique.
- **Rétention des Minéraux & Saveurs :** La cuisson à l'étouffée sous couvercle fermé (vapeur saturée) empêche la fuite des sels minéraux et des arômes volatils dans l'eau d'égouttage.

---

## ⚙️ Méthode d'Échelonnage & Algorithme

SlowVeg synchronise la cuisson des mélanges (ex: ratatouille, poêlées, potées) :
1. **Étape 1 (Racines & Tubercules) :** Démarrage actif (carottes, navets, pommes de terre).
2. **Étape 2 (Fruits & Chairs) :** Ajout des légumes de densité moyenne (poivrons, courgettes).
3. **Étape 3 (Feuilles & Coupure) :** Ajout des éléments fragiles (épinards, herbes) et **coupure immédiate du feu**.
4. **Phase Finale :** Maintien hermétique pour une fin de cuisson douce par inertie.

---

## 🛠️ Fichiers du Projet

- `index.html` : Interface et sélection dynamique des modes.
- `app.js` : Moteur de calcul, minuteur multi-étapes et synthèse vocale.
- `sw.js` : Service Worker pour le fonctionnement hors-ligne PWA.
- `manifest.json` : Déclaration PWA pour installation mobile/desktop.
- `readme.html` & `readme.md` : Documentation technique et nutritionnelle.

---

🌱 **SlowVeg** — *Réduire la facture énergétique en maîtrisant la chimie des légumes.*
