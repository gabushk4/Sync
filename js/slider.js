document.addEventListener('DOMContentLoaded', (e) => {
    var slider = document.getElementById('friends-calendar-slider')
    var blocks = document.querySelectorAll('.block')
    var container = document.getElementById('friends-calendar-container')
    var time = document.getElementById('hours-slider')
    var headers = document.getElementById('headers')
    var events = document.getElementsByClassName('events')


    container.addEventListener('mouseenter', function(e){
        document.getElementById('friends-calendar-container').style.backgroundColor = "rgba(255, 255, 255, .05)" 
    })
    container.addEventListener('mouseleave', function(e){
        document.getElementById('friends-calendar-container').style.backgroundColor = "rgba(255, 255, 255, .0)"
    })

    var isMouseDown = false
    var prevMouseX
    var prevMouseY
    const rapport = 50

    window.addEventListener('mousedown', function(e){
        e.preventDefault()
        isMouseDown = true
        prevMouseX = e.clientX
        prevMouseY = e.clientY
    })

    window.addEventListener('mouseup', function(){
        isMouseDown = false
    })

    var isMouseOnHours
    const minTop = 60
    const maxTop = -1400
    var hours = document.getElementById('hours-slider')
    hours.addEventListener('mouseenter', function(e){
        for (const div of document.querySelectorAll('.hour')) {
            e.preventDefault()
            isMouseOnHours = true
            div.classList.add('mouseenter')
        }
    })
    hours.addEventListener('mouseleave', function(){
        for (const div of document.querySelectorAll('.hour')) {
            isMouseOnHours = false
            div.classList.remove('mouseenter')
        }
    })

    hours.addEventListener('mousemove', function(e){
        e.preventDefault()
        if(isMouseOnHours && isMouseDown){
            var deltaY = (e.clientY - prevMouseY) / rapport            
            var top = parseInt(hours.style.top)
            var newTop = top + deltaY
            if(newTop <= maxTop){
                hours.style.top = maxTop + 'px'
                slider.style.top = minTop + 'px'
            }
            else if(newTop >= minTop){
                hours.style.top = minTop + 'px'
                slider.style.top = minTop + 'px'
            }
            else{
                hours.style.top = newTop + 'px'
                slider.style.top = newTop + 'px'
            }
        }
    })

    var prevTop = parseInt(hours.style.top)

    hours.addEventListener('scroll', function(e){
        var delta = prevTop - parseInt(hours.style.top)
        console.log(delta)
    })

    const sliderWidth = slider.offsetWidth
    const containerWidth = slider.parentElement.offsetWidth
    const sliderHeight = time.offsetHeight
    const containerHeight = slider.parentElement.offsetHeightà
    const minLeft = 0
    const maxLeft = containerWidth - sliderWidth - 20

    container.addEventListener('mousemove', function(e){
        if(isMouseDown ){
            var deltaX = (e.clientX - prevMouseX) / rapport

            var left = parseInt(slider.style.left || 0)
            
            var newLeft = left + deltaX

            // Limiter le mouvement du slider sur l'axe X
            if (newLeft > minLeft) {
                slider.style.left = minLeft + "px"
                headers.style.left = minLeft + "px"
            } else if (newLeft < maxLeft) {
                slider.style.left = maxLeft + "px"
                headers.style.left = maxLeft + "px"
            } else {
                slider.style.left = newLeft + "px"
                headers.style.left = newLeft + "px"
            }
        }
    })
    
    document.querySelector('#right-arrow').addEventListener('click', function(e){
        var left = parseInt(slider.style.left || 0)
        var newLeft = left - blocks[0].offsetWidth - 20
        if(newLeft < maxLeft){
            slider.style.left = `${maxLeft}px`
            headers.style.left = `${maxLeft}px`
        }
        else{
            slider.style.left = `${newLeft}px`
            headers.style.left = `${newLeft}px`
        }
    })
    document.querySelector('#left-arrow').addEventListener('click', function(e){
        var left = parseInt(slider.style.left || 0)
        var newLeft = left + blocks[0].offsetWidth + 20
        if (newLeft > minLeft){
            slider.style.left = `${minLeft}px`
            headers.style.left = `${minLeft}px`
        }
            
        else{
            slider.style.left = `${newLeft}px`
            headers.style.left = `${newLeft}px`
        }
            
        console.log(slider.style.left)
    })
    
})
