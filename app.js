const gCO2ParKwh = 60;
let active = false, inter = null, wakeLock = null;
let currentPhase = 0, phases = [];
let endTimestamp = null, sec = 0;
let recipeType = 'mono';

// Durées de base (secondes), centralisées pour être partagées entre mode mono et multi
const dureesBase = {
    racines:      { actif: 300, passif: 900 },
    fruits:       { actif: 180, passif: 600 },
    feuilles:     { actif: 60,  passif: 180 },
    legumineuses: { actif: 600, passif: 1800 },
    surgeles:     { actif: 120, passif: 240 }
};
const coefMethodeWh  = { four:1.4, soupe: 1.1, poele: 0.9, microonde: 0.6, vapeur: 1.0, eau: 1.0};
function setRecipeType(type) {
    recipeType = type;
    document.getElementById('btnMono').classList.toggle('active', type === 'mono');
    document.getElementById('btnMulti').classList.toggle('active', type === 'multi');
    document.getElementById('mono-options').style.display = type === 'mono' ? 'block' : 'none';
    document.getElementById('multi-options').style.display = type === 'multi' ? 'block' : 'none';
    calculer();
}

function calculer() {
    const methodeSelect = document.getElementById('methode');
    const methode = methodeSelect ? methodeSelect.value : 'vapeur';
    const decoupe = document.getElementById('decoupe').value;
    const poids = Math.max(50, parseFloat(document.getElementById('poids').value) || 500);
    const stepList = document.getElementById('prepSteps');

    let coefDecoupe = decoupe === 'fin' ? 0.7 : (decoupe === 'gros' ? 1.4 : 1.0);
    let coefMasse = Math.pow(poids / 500, 0.3);//référence 500g, croissance douce
       let whSaved = Math.round((poids / 500) * 180 * (coefMethodeWh[methode] || 1.0) * coefDecoupe); // référence 500g, croissance douce

    phases = [];
    stepList.innerHTML = "";


    if (recipeType === 'mono') {
        const cat = document.getElementById('catLegume').value;
        let base = dureesBase[cat] || dureesBase.feuilles;
        let tActif = base.actif, tPassif = base.passif;
        if (cat === 'legumineuses') whSaved += 200;

        if (cat === 'surgeles') {
            stepList.innerHTML += `<li>💡 <strong>Conseil :</strong> ne pas décongeler au préalable. La vapeur ou le micro-ondes donnent les meilleurs résultats pour les surgelés${methode === 'four' ? ' — le four est peu adapté ici (préchauffe énergivore pour un temps de cuisson court)' : ''}.</li>`;
        }

        tActif = Math.round(tActif * coefDecoupe * coefMasse);
        tPassif = Math.round(tPassif * coefDecoupe);

        if (methode === 'microonde') {
            tActif = Math.max(30, Math.round(tActif * 0.5));
            tPassif = Math.round(tPassif * 0.6);

            stepList.innerHTML += `<li>Placer les légumes dans un plat en VERRE ou CÉRAMIQUE (sans métal) avec 2-3 c.à.s d'eau.</li>`;
            stepList.innerHTML += `<li>Couvrir impérativement avec une cloche plastique.</li>`;
            stepList.innerHTML += `<li>⚡ Puissance requise : <strong>800W</strong> (durées calibrées pour cette puissance — ajustez le temps si votre micro-ondes est différent).</li>`;
            stepList.innerHTML += `<li>Chauffer à 800W pendant ${Math.floor(tActif/60)} min ${tActif%60} s.</li>`;
            stepList.innerHTML += `<li><strong>LAISSER REPOSER SANS OUVRIR</strong> (la vapeur piégée termine la cuisson).</li>`;

            phases.push({ name: "Phase 1 : Émission d'ondes (Chauffe)", dur: tActif, activeHeat: true });
            phases.push({ name: "Phase 2 : Repos sous cloche (Cuisson passive)", dur: tPassif, activeHeat: false });

        } else if (methode === 'four') {
            // Base four + variation selon découpe/masse (le four demande une inertie de préchauffe fixe)
            tActif = Math.round(tActif) + 600;
            tPassif = Math.round(tPassif) + 600;

            stepList.innerHTML += `<li>Enfourner dans un plat couvert à 200°C.</li>`;
            stepList.innerHTML += `<li>Chauffer ${Math.round(tActif/60)} min puis <strong>ÉTEINDRE LE FOUR</strong> sans l'ouvrir.</li>`;

            phases.push({ name: "Cuisson Active (Four allumé)", dur: tActif, activeHeat: true });
            phases.push({ name: "Cuisson Passive (Four éteint)", dur: tPassif, activeHeat: false });

        } else if (methode === 'poele') {
            stepList.innerHTML += `<li>Saisir les légumes dans une poêle/wok avec un filet d'huile (${Math.floor(tActif/60)} min ${tActif%60} s).</li>`;
            stepList.innerHTML += `<li>Ajouter 3 cuillères à soupe d'eau pour créer un flash de vapeur.</li>`;
            stepList.innerHTML += `<li>Mettre le couvercle et <strong>COUPER LE FEU</strong>.</li>`;

            phases.push({ name: "Cuisson Active (Feu allumé)", dur: tActif, activeHeat: true });
            phases.push({ name: "Cuisson Passive (Feu coupé)", dur: tPassif, activeHeat: false });

        } else if (methode === 'soupe') {
            tPassif += 300;
            stepList.innerHTML += `<li>Porter le bouillon à ébullition dans votre faitout inox sous couvercle (${Math.floor(tActif/60)} min ${tActif%60} s).</li>`;
            stepList.innerHTML += `<li><strong>COUPEZ LE FEU</strong>. L'inertie du liquide cuit les légumes à cœur avant de mixer.</li>`;

            phases.push({ name: "Cuisson Active (Ébullition)", dur: tActif, activeHeat: true });
            phases.push({ name: "Cuisson Passive (Masse chaude)", dur: tPassif, activeHeat: false });

        } else if (methode === 'eau') {
            // Calcul d'un volume d'eau optimisé (ex: 2 fois le volume/poids des légumes, minimum 500ml)
            const volEauMl = Math.max(500, poids * 2); 
            const volEauL = (volEauMl / 1000).toFixed(1);

            stepList.innerHTML += `<li>Verser environ <strong>${volEauL} L</strong> d'eau dans la casserole (juste assez pour couvrir les légumes).</li>`;
            stepList.innerHTML += `<li>Maintenir l'ébullition ${Math.round(tActif/60)} min sous couvercle.</li>`;
            stepList.innerHTML += `<li><strong>COUPEZ LE FEU et égouttez rapidement</strong> pour limiter la perte de vitamines hydrosolubles.</li>`;

            phases.push({ name: "Cuisson Active (Eau bouillante)", dur: tActif, activeHeat: true });
            phases.push({ name: "Cuisson Passive (Repos avant égouttage)", dur: tPassif, activeHeat: false });

        } else {
            // Vapeur / fond d'eau étouffé (défaut)
            stepList.innerHTML += `<li>Placer les légumes dans une casserole inox à fond épais avec un fond d'eau (1-2 cm).</li>`;
            stepList.innerHTML += `<li>Maintenir l'ébullition douce ${Math.round(tActif/60)} min sous couvercle.</li>`;
            stepList.innerHTML += `<li><strong>COUPEZ LE FEU</strong> et laissez étouffer.</li>`;

            phases.push({ name: "Cuisson Active (Feu allumé)", dur: tActif, activeHeat: true });
            phases.push({ name: "Cuisson Passive (Feu coupé)", dur: tPassif, activeHeat: false });
        }

    } else {
        // Mode Échelonné (Mélange de légumes)
        const hasRacines = document.getElementById('hasRacines').checked;
        const hasFruits = document.getElementById('hasFruits').checked;
        const hasFeuilles = document.getElementById('hasFeuilles').checked;

        if (methode === 'microonde') {
            stepList.innerHTML += `<li>Placer les légumes dans un plat en VERRE ou CÉRAMIQUE (jamais de métal) muni d'une cloche.</li>`;
            stepList.innerHTML += `<li>⚡ Puissance requise : <strong>800W</strong> (durées calibrées pour cette puissance — ajustez le temps si votre micro-ondes est différent).</li>`;

            if (hasRacines) {
                phases.push({ name: "Phase 1 : Mettre RACINES (Micro-ondes)", dur: Math.round(dureesBase.racines.actif * coefDecoupe * coefMasse * 0.5), activeHeat: true });
                stepList.innerHTML += `<li>Étape 1 : Passer les racines au micro-ondes avec 2 c.à.s d'eau sous cloche.</li>`;
            }
            if (hasFruits) {
                phases.push({ name: "Phase 2 : Ajouter FRUITS / CHAIRS", dur: Math.round(dureesBase.fruits.actif * coefDecoupe * coefMasse * 0.5), activeHeat: true });
                stepList.innerHTML += `<li>Étape 2 : Ajouter les légumes de densité moyenne et relancer la chauffe sous cloche.</li>`;
            }
            if (hasFeuilles) {
                stepList.innerHTML += `<li>Étape 3 : Ajouter les légumes fragiles / feuilles, <strong>ARRÊTER LE MICRO-ONDES</strong> et fermer la cloche.</li>`;
            } else {
                stepList.innerHTML += `<li>Étape 3 : <strong>ARRÊTER LE MICRO-ONDES</strong> et laisser fermé sous cloche.</li>`;
            }

            phases.push({ name: "Phase Finale : Repos hermétique sous cloche", dur: Math.round(360 * coefDecoupe), activeHeat: false });

        } else if (methode === 'four') {
            stepList.innerHTML += `<li>Utiliser un plat allant au four muni d'un couvercle ou papier d'aluminium.</li>`;
            if (hasRacines) {
                phases.push({ name: "Phase 1 : Racines au four", dur: Math.round(dureesBase.racines.actif * coefDecoupe * coefMasse) + 300, activeHeat: true });
                stepList.innerHTML += `<li>Étape 1 : Enfourner les racines à 200°C dans le plat couvert.</li>`;
            }
            if (hasFruits || hasFeuilles) {
                phases.push({ name: "Phase 2 : Ajouter le reste des légumes", dur: Math.round(dureesBase.fruits.actif * coefDecoupe * coefMasse) + 300, activeHeat: true });
                stepList.innerHTML += `<li>Étape 2 : Ajouter les autres légumes, re-couvrir et <strong>ÉTEINDRE LE FOUR</strong>.</li>`;
            }
            phases.push({ name: "Phase Finale : Repos four éteint", dur: Math.round(900 * coefDecoupe), activeHeat: false });

        } else if (methode === 'poele') {
            stepList.innerHTML += `<li>Utiliser une poêle ou un wok avec un filet d'huile.</li>`;
            if (hasRacines) {
                phases.push({ name: "Phase 1 : Saisir les RACINES", dur: Math.round(180 * coefDecoupe * coefMasse), activeHeat: true });
                stepList.innerHTML += `<li>Étape 1 : Saisir les racines/patates 2-3 min à feu vif.</li>`;
            }
            if (hasFruits) {
                phases.push({ name: "Phase 2 : Ajouter les FRUITS / CHAIRS", dur: Math.round(90 * coefDecoupe * coefMasse), activeHeat: true });
                stepList.innerHTML += `<li>Étape 2 : Ajouter les poivrons/courgettes, poursuivre la saisie.</li>`;
            }
            if (hasFeuilles) {
                stepList.innerHTML += `<li>Étape 3 : Ajouter les feuilles/herbes et un filet d'eau, <strong>COUPER LE FEU</strong> et couvrir.</li>`;
            } else {
                stepList.innerHTML += `<li>Étape 3 : Ajouter un filet d'eau, <strong>COUPER LE FEU</strong> et couvrir.</li>`;
            }
            phases.push({ name: "Phase Finale : Repos à l'étouffée (Feu coupé)", dur: Math.round(480 * coefDecoupe), activeHeat: false });

        } else if (methode === 'soupe') {
            stepList.innerHTML += `<li>Utiliser un faitout avec le bouillon.</li>`;
            if (hasRacines) {
                phases.push({ name: "Phase 1 : Mettre les RACINES", dur: Math.round(dureesBase.racines.actif * coefDecoupe * coefMasse), activeHeat: true });
                stepList.innerHTML += `<li>Étape 1 : Mettre les racines dans le bouillon, porter à ébullition.</li>`;
            }
            if (hasFruits) {
                phases.push({ name: "Phase 2 : Ajouter les FRUITS / CHAIRS", dur: Math.round(dureesBase.fruits.actif * coefDecoupe * coefMasse * 0.67), activeHeat: true });
                stepList.innerHTML += `<li>Étape 2 : Ajouter les légumes de densité moyenne.</li>`;
            }
            if (hasFeuilles) {
                stepList.innerHTML += `<li>Étape 3 : Ajouter les feuilles/herbes, <strong>COUPER LE FEU</strong> et couvrir.</li>`;
            } else {
                stepList.innerHTML += `<li>Étape 3 : <strong>COUPER LE FEU</strong> et couvrir.</li>`;
            }
            phases.push({ name: "Phase Finale : Repos (Masse chaude)", dur: Math.round(900 * coefDecoupe), activeHeat: false });

                } else if (methode === 'eau') {
            // Calcul d'un volume d'eau optimisé (ex: 2 fois le volume/poids des légumes, minimum 500ml)
            const volEauMl = Math.max(500, poids * 2); 
            const volEauL = (volEauMl / 1000).toFixed(1);

            stepList.innerHTML += `<li>Verser environ <strong>${volEauL} L</strong> d'eau dans la casserole (juste assez pour couvrir les légumes).</li>`;
            stepList.innerHTML += `<li>Utiliser une grande casserole d'eau bouillante salée.</li>`;
            if (hasRacines) {
                phases.push({ name: "Phase 1 : Mettre les RACINES", dur: Math.round(dureesBase.racines.actif * coefDecoupe * coefMasse * 0.8), activeHeat: true });
                stepList.innerHTML += `<li>Étape 1 : Plonger les racines/patates dans l'eau bouillante.</li>`;
            }
            if (hasFruits) {
                phases.push({ name: "Phase 2 : Ajouter les FRUITS / CHAIRS", dur: Math.round(dureesBase.fruits.actif * coefDecoupe * coefMasse * 0.67), activeHeat: true });
                stepList.innerHTML += `<li>Étape 2 : Ajouter les poivrons/courgettes.</li>`;
            }
            if (hasFeuilles) {
                stepList.innerHTML += `<li>Étape 3 : Ajouter les haricots/épinards, <strong>COUPER LE FEU et égoutter rapidement</strong>.</li>`;
            } else {
                stepList.innerHTML += `<li>Étape 3 : <strong>COUPER LE FEU et égoutter rapidement</strong>.</li>`;
            }
            phases.push({ name: "Phase Finale : Repos avant égouttage", dur: Math.round(300 * coefDecoupe), activeHeat: false });

        } else {
            // Vapeur / Casserole (défaut)
            stepList.innerHTML += `<li>Utiliser un faitout ou une casserole en inox à fond épais avec son couvercle.</li>`;
            if (hasRacines) {
                phases.push({ name: "Phase 1 : Mettre les RACINES", dur: Math.round(dureesBase.racines.actif * coefDecoupe * coefMasse * 0.8), activeHeat: true });
                stepList.innerHTML += `<li>Étape 1 : Mettre les racines/patates avec un fond d'eau, démarrer l'ébullition.</li>`;
            }
            if (hasFruits) {
                phases.push({ name: "Phase 2 : Ajouter les FRUITS / CHAIRS", dur: Math.round(dureesBase.fruits.actif * coefDecoupe * coefMasse * 0.67), activeHeat: true });
                stepList.innerHTML += `<li>Étape 2 : Au signal, ajouter les poivrons/courgettes, maintenir le feu doux.</li>`;
            }
            if (hasFeuilles) {
                stepList.innerHTML += `<li>Étape 3 : Ajouter les haricots/épinards, <strong>COUPER LE FEU</strong> et mettre le couvercle.</li>`;
            } else {
                stepList.innerHTML += `<li>Étape 3 : <strong>COUPER LE FEU</strong> et fermer hermétiquement.</li>`;
            }
            phases.push({ name: "Phase Finale : Repos à l'étouffée (Feu coupé)", dur: Math.round(720 * coefDecoupe), activeHeat: false });
        }
    }

    const tarifKwh = parseFloat(document.getElementById('tarifKwh').value) || 0.25;
    document.getElementById('ecoWh').innerText = whSaved;
    document.getElementById('ecoEur').innerText = (whSaved * (tarifKwh / 1000)).toFixed(2);
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
// Fonction asynchrone pour demander le blocage de la mise en veille
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log("Wake Lock activé : l'écran restera allumé.");
        } catch (err) {
            console.error(`Impossible d'activer le Wake Lock : ${err.name}, ${err.message}`);
        }
    }
}

// Réactivation automatique si l'utilisateur change d'onglet et revient sur l'app
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible' && active) {
        await requestWakeLock();
    }
});

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
function resetTotals() {
    if (confirm("Réinitialiser l'historique d'économies ?")) {
        localStorage.removeItem('slowveg_totals'); // Clé d'origine préservée
        afficherTotals();
    }
}

window.onload = () => { afficherTotals(); calculer(); };
