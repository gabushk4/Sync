import { hoursHeight, hoursWidth } from "./time.js"

var calendars = document.getElementById("calendars")

var users = ['gabushka', 'yassikpoke'] 

var event1 = ['gabushka', 'Rendez-Vous', '12 March 2024', 8, 9, 60, 'Bring back tesaurus', false]

var event2 = ['yassikpoke', 'cours', '12 March 2024', 12, 14, 120, "Don't be like me", true]

let events = [event1, event2]

const indexId = 0
const indexTitle = 1
const indexDate = 2
const indexDTime = 3
const indexETime = 4
const indexDuration = 5
const indexDesc = 6
const indexPrivate = 7

document.addEventListener('DOMContentLoaded', function(){
    //Setting up the home page
    sizeContent()   
    //Créer les amis du user (un algorithme qui rend seulement à 6 user de loin de la position du premier block)
    for (var i = 0; i < users.length; i++) {
        CreateFriend(users[i])
    }
    for(var i = 0; i < events.length; i++){
        var event = events[i]
        console.log(event)
        var ev = createEvent(event)
        if(document.contains(document.getElementById(event[indexId])))
            document.getElementById(event[indexId]).append(ev)
        else
            console.log(event[indexId] + ' doesnt exist')
    }
})

function CreateFriend(username){
    var slider = document.getElementById('friends-calendar-slider')
    var block = document.createElement("div")
    var header = document.createElement("div")
    header.classList.add('header')
    block.classList.add("block")
    block.id = username
    header.id = 'header-' + username
    events.id = 'events-' + username
    header.textContent = username
    slider.append(block)
    document.getElementById('headers').append(header)
}

function createEvent(event/* title, date, begin, duration, timezone, private */){
    var eventBlock = document.createElement('div')
    var debut = document.createElement('div')
    var main = document.createElement('div')
    var end = document.createElement('div')
    eventBlock.classList.add('event-block')
    debut.classList.add('event-start-time')
    main.classList.add('event-main')
    end.classList.add('event-end-time')
    main.textContent = event[indexTitle]
    debut.textContent = document.getElementById(`h${event[indexDTime]}`).textContent
    end.textContent = document.getElementById(`h${event[indexETime]}`).textContent
    eventBlock.style.top = hoursHeight/document.querySelectorAll('.hour').length * event[indexDTime] + 'px'
    eventBlock.style.height = event[indexDuration] + 'px'
    eventBlock.append(debut)
    eventBlock.append(main)
    eventBlock.append(end)
    return eventBlock
}

function sizeContent(){
    var content = document.getElementById('content')

    var slider = document.querySelector('#friends-calendar-slider')
    content.style.height = `${(window.innerHeight - (document.getElementById('header').clientHeight + document.getElementById('footer').clientHeight))}px`
    content.style.left = hoursWidth + 'px'
    slider.style.top = -(hoursHeight/3.3) + 'px'
}