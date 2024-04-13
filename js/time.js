//import {placeEvent} from '../js/renderHome.js'

var date = new Date(Date.now())
var timezone = "America/NewYork"//faire une fonction serveur pour retreive dans la BD 

document.getElementById('today-date').textContent = numToDay(date.getDay()) + ', ' + date.getDate() + " " + numToMonth(date.getMonth()) + " " + date.getFullYear()
var hoursSlider = document.getElementById('hours-slider')
var hoursContainer = document.getElementById('hours-container')
export var hoursHeight = 0
const numHours = 24
var prevMouseY

for(var i = 0; i < numHours; i++){
    var div = document.createElement('div')
    var line = document.createElement('hr')
    div.classList.add('hour')
    div.id = `h${i}`
    line.id = `line${i}`
    div.textContent = `${i}:00`
    hoursSlider.append(div)
    //document.getElementById('friends-calendar-slider').appendChild(line)
    div.style.top = div.getBoundingClientRect().height*i +'px'
    line.style.top = div.style.top
    div.style.paddingBottom = `${60 - div.getBoundingClientRect().height}px`
    hoursHeight += div.getBoundingClientRect().height
}
hoursSlider.style.top = `-${hoursHeight/3.3}px`
export var hoursWidth = hoursSlider.getBoundingClientRect().width
//console.log(hoursContainer.style.top)

let horloge = document.createElement('div')
horloge.id = 'horloge'
hoursSlider.append(horloge)

function updateClock() {
    var now = new Date();
    var heures = now.getHours()
    var iStart = 1
    var minutes = now.getMinutes();

    // Mettre à jour l'affichage de l'heure
    //console.log() H:M:S
    if(heures > 9){
        iStart = 0
    }
    var time = now.toLocaleTimeString()
    horloge.textContent = time.substring(iStart, time.lastIndexOf(':'))

    // Calculer la position en fonction des minutes
    var topPosition = minutes;
    horloge.style.top = `${topPosition + (60 * heures)}px`

    //Faire un fonction qui change le rapport px/min (info dans BD) 

    // Planifier la prochaine mise à jour
    requestAnimationFrame(updateClock);
}

// Lancer la première mise à jour de l'horloge
updateClock();


var isMouseDown
window.addEventListener('mousedown', function(e){
    e.preventDefault()
    isMouseDown = true
    prevMouseY = e.clientY
})
window.addEventListener('mouseup', function(e){
    isMouseDown = false
})



function numToMonth(num){
    switch(num){
        case 0:
            return "Janvier"
        case 1:
            return "Février"
        case 2:
            return "Mars"
        case 3: 
            return "Avril"
        case 4: 
            return "Mai"
        case 5:
            return "Juin"
        case 6:
            return "Juillet"
        case 7:
            return "Août"
        case 8:
            return "Septembre"
        case 9:
            return "Octobre"
        case 10:
            return "Novembre"
        case 11:
            return "Decembre"
    }
}

function numToDay(num){
    switch(num){
        case 0:
            return 'Dimanche'
        case 1:
            return 'Lundi'
        case 2:
            return 'Mardi'
        case 3:
            return 'Mercredi'
        case 4:
            return 'Jeudi'
        case 5:
            return 'Vendredi'
        case 6:
            return 'Samedi'
    }
} 