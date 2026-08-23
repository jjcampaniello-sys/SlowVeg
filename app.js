const gCO2ParKwh = 60;
let active = false, inter = null, wakeLock = null;
let currentPhase = 0, phases = [];
let endTimestamp = null, sec = 0;
let sessionWh = 0, sessionEur = 0;
let recipeType = 'mono';

function setRecipeType(type) {
    recipeType = type;
    document.getElementById('btnMono').classList.toggle('active', type === 'mono');
    document.getElementById('btnMulti').classList.toggle('active', type === 'multi');
    document.getElementById('mono-options').style.display = type === 'mono' ? 'block' : 'none';
    document.getElementById('multi-options').style.display = type === 'multi' ? 'block' : 'none';
    calculer();
}

function calculer() {
    const methode = document.getElementById('methode').value;
    const decoupe = document.getElementById('decoupe').value;
    const poids = Math.max(50, parseFloat(document.getElementById('poids').value) || 500);
    const stepList = document.getElementById('prepSteps');
    
    let coefDecoupe = decoupe === 'fin' ? 0.7 : (decoupe === 'gros' ? 1.4 : 1.0);
    phases = [];
    stepList.innerHTML = "";
    let whSaved = Math.round((poids / 500) * 180);

    if (recipeType === 'mono') {
        const cat = document.getElementById('catLegume').value;
        let tActif = 0, tPassif = 0;

        // Base de temps (en secondes) selon le légume
        if (cat === 'feuilles') { tActif = 60; tPassif = 180; }
        else if (cat === 'fruits') { tActif = 180; tPassif = 600; }
        else if (cat === 'racines') { tActif = 300; tPassif = 900; }
        else if (cat === 'legumineuses') { tActif = 600; tPassif = 1800; whSaved += 200; }

        tActif = Math.round(tActif * coefDecoupe);
        tPassif = Math.round(tPassif * coefDecoupe);

        // Traitement selon le mode de cuisson
        if (methode === 'microonde') {
            // Micro-ondes : temps d'onde très court + repos sous cloche
            tActif = Math.max(30, Math.round(tActif * 0.5)); 
            tPassif = Math.round(tPassif * 0.6); 

            stepList.innerHTML += `<li>Placer les légumes dans un plat adapté avec 2-3 c.à.s d'eau.</li>`;
            stepList.innerHTML += `<li>Couvrir impérativement avec une cloche ou un couvercle micro-ondes.</li>`;
            stepList.innerHTML += `<li>Chauffer à pleine puissance pendant ${Math.floor(tActif/60)} min ${tActif%60} s.</li>`;
            stepList.innerHTML += `<li><strong>LAISSER REPOSER SANS OUVRIR</strong> (la vapeur piégée termine la cuisson).</li>`;

            phases.push({ name: "Phase 1 : Émission d'ondes (Chauffe)", dur: tActif, activeHeat: true });
            phases.push({ name: "Phase 2 : Repos sous cloche (Cuisson passive)", dur: tPassif, activeHeat: false });

        } else if (methode === 'four') {
            tActif = 900; tPassif = 1200;
            stepList.innerHTML += `<li>Enfourner dans un plat couvert à 200°C.</li>`;
            stepList.innerHTML += `<li>Chauffer ${Math.round(tActif/60)} min puis <strong>ÉTEINDRE LE FOUR</strong> sans l'ouvrir.</li>`;
            
            phases.push({ name: "Cuisson Active (Four allumé)", dur: tActif, activeHeat: true });
            phases.push({ name: "Cuisson Passive (Four éteint)", dur: tPassif, activeHeat: false });

        } else if (methode === 'poele') {
            stepList.innerHTML += `<li>Saisir les légumes avec un filet d'huile 1 à 2 min.</li>`;
            stepList.innerHTML += `<li>Ajouter 3 cuillères à soupe d'eau pour créer un flash de vapeur.</li>`;
            stepList.innerHTML += `<li>Mettre le couvercle et <strong>COUPER LE FEU</strong>.</li>`;
            
            phases.push({ name: "Cuisson Active (Feu allumé)", dur: tActif, activeHeat: true });
            phases.push({ name: "Cuisson Passive (Feu coupé)", dur: tPassif, activeHeat: false });

        } else if (methode === 'soupe') {
            tPassif += 300;
            stepList.innerHTML += `<li>Porter le bouillon à ébullition sous couvercle.</li>`;
            stepList.innerHTML += `<li><strong>COUPEZ LE FEU</strong>. L'inertie du liquide cuit les légumes à cœur avant de mixer.</li>`;
            
            phases.push({ name: "Cuisson Active (Ébullition)", dur: tActif, activeHeat: true });
            phases.push({ name: "Cuisson Passive (Masse chaude)", dur: tPassif, activeHeat: false });

        } else {
            // Eau / Vapeur standard
            stepList.innerHTML += `<li>Placer les légumes avec un fond d'eau (vapeur) et porter à ébullition.</li>`;
            stepList.innerHTML += `<li>Maintenir l'ébullition douce ${Math.round(tActif/60)} min sous couvercle.</li>`;
            stepList.innerHTML += `<li><strong>COUPEZ LE FEU</strong> et laissez étouffer.</li>`;
            
            phases.push({ name: "Cuisson Active (Feu allumé)", dur: tActif, activeHeat: true });
            phases.push({ name: "Cuisson Passive (Feu coupé)", dur: tPassif, activeHeat: false });
        }

    } else {
        // Mode Échelonné (Recette mixte)
        const hasRacines = document.getElementById('hasRacines').checked;
        const hasFruits = document.getElementById('hasFruits').checked;
        const hasFeuilles = document.getElementById('hasFeuilles').checked;

        if (methode === 'microonde') {
            stepList.innerHTML += `<li>Utiliser un plat adapté au micro-ondes avec cloche.</li>`;
            if (hasRacines) {
                phases.push({ name: "Phase 1 : Mettre RACINES (Micro-ondes)", dur: Math.round(180 * coefDecoupe), activeHeat: true });
                stepList.innerHTML += `<li>Étape 1 : Passer les racines au micro-ondes avec un fond d'eau.</li>`;
            }
            if (hasFruits) {
                phases.push({ name: "Phase 2 : Ajouter FRUITS (Micro-ondes)", dur: Math.round(120 * coefDecoupe), activeHeat: true });
                stepList.innerHTML += `<li>Étape 2 : Ajouter les fruits et relancer la chauffe sous cloche.</li>`;
            }
            stepList.innerHTML += `<li>Étape 3 : Ajouter les feuilles si présent, <strong>STOPPER LE MICRO-ONDES</strong> et laisser reposer sous cloche.</li>`;
            phases.push({ name: "Phase Finale : Repos hermétique sous cloche", dur: Math.round(360 * coefDecoupe), activeHeat: false });

        } else {
            stepList.innerHTML += `<li>Utiliser le récipient en inox à fond épais avec son couvercle.</li>`;
            if (hasRacines) {
                phases.push({ name: "Phase 1 : Mettre les RACINES", dur: Math.round(240 * coefDecoupe), activeHeat: true });
                stepList.innerHTML += `<li>Étape 1 : Mettre les racines/patates, démarrer à ébullition.</li>`;
            }
            if (hasFruits) {
                phases.push({ name: "Phase 2 : Ajouter les FRUITS (Poivrons/Courgettes)", dur: Math.round(120 * coefDecoupe), activeHeat: true });
                stepList.innerHTML += `<li>Étape 2 : Au signal, ajouter les fruits/chairs, maintenir le feu.</li>`;
            }
            if (hasFeuilles) {
                stepList.innerHTML += `<li>Étape 3 : Ajouter les feuilles/herbes, <strong>COUPER LE FEU</strong> et couvrir.</li>`;
            } else {
                stepList.innerHTML += `<li>Étape 3 : <strong>COUPER LE FEU</strong> et fermer hermétiquement.</li>`;
            }

            phases.push({ name: "Phase Finale : Repos à l'étouffée (Feu coupé)", dur: Math.round(720 * coefDecoupe), activeHeat: false });
        }
    }

    document.getElementById('ecoWh').innerText = whSaved;
    document.getElementById('ecoEur').innerText = (whSaved * 0.00025).toFixed(2);

    if (!active) {
        currentPhase = 0;
        sec = phases[0] ? phases[0].dur : 0;
        updateUI();
    }
}

function updateUI() {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    document.getElementById('disp').innerText = `${m}:${s}`;
    if (phases[currentPhase]) {
        document.getElementById('stepBanner').innerText = phases[currentPhase].name;
    }
}

function tick() {
    const remaining = Math.round((endTimestamp - Date.now()) / 1000);
    sec = Math.max(0, remaining);
    updateUI();

    if (remaining <= 0) {
        currentPhase++;
        if (currentPhase < phases.length) {
            declencherSignalSonore(phases[currentPhase].name);
            sec = phases[currentPhase].dur;
            endTimestamp = Date.now() + sec * 1000;
        } else {
            clearInterval(inter);
            active = false;
            document.getElementById('btn').innerText = "Cuisson Terminée !";
            document.getElementById('btn').style.background = "#34495e";
            declencherSignalSonore("Cuisson terminée ! Vos légumes sont prêts.");
            enregistrerEconomies();
        }
    }
}

function toggle() {
    const b = document.getElementById('btn');
    if (active) {
        clearInterval(inter);
        active = false;
        b.innerText = "Reprendre";
        b.style.background = "var(--primary)";
    } else {
        active = true;
        b.innerText = "PAUSE";
        b.style.background = "var(--red)";
        endTimestamp = Date.now() + sec * 1000;
        inter = setInterval(tick, 1000);
    }
}

function declencherSignalSonore(txt) {
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(txt);
        msg.lang = 'fr-FR';
        window.speechSynthesis.speak(msg);
    }
}

function enregistrerEconomies() {
    const wh = parseFloat(document.getElementById('ecoWh').innerText) || 0;
    const eur = parseFloat(document.getElementById('ecoEur').innerText) || 0;
    const totals = JSON.parse(localStorage.getItem('slowveg_totals') || '{"wh":0,"eur":0,"co2":0}');
    totals.wh += wh; totals.eur += eur; totals.co2 += (wh * gCO2ParKwh / 1000);
    localStorage.setItem('slowveg_totals', JSON.stringify(totals));
    afficherTotals();
}

function afficherTotals() {
    const totals = JSON.parse(localStorage.getItem('slowveg_totals') || '{"wh":0,"eur":0,"co2":0}');
    document.getElementById('totalWh').innerText = Math.round(totals.wh);
    document.getElementById('totalEur').innerText = totals.eur.toFixed(2);
    document.getElementById('totalCo2').innerText = Math.round(totals.co2);
}

window.onload = () => { afficherTotals(); calculer(); };
