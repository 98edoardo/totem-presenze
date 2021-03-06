window.addEventListener('load', function () {
    var orologio = document.getElementById('ora')

    setInterval(function () {
        orologio.innerText = new Date().toLocaleTimeString()
    }, 500)

    const N_MAX_RILEVAZIONI_ELENCO = 10
    const TIMEOUT_SCREENSAVER = 300000 // 5 minuti

    var rilevazioni = []

    var codice = ''
    var invioInCorso = false
    var avvio = true

    var result = document.getElementById('result')
    var nome = document.getElementById('nome')
    var badge = document.getElementById('badge')
    var ultimi = document.getElementById('ultimi')

    var msInizio = document.getElementById('msInizio')
    var msFine = document.getElementById('msFine')
    var oraInizio = document.getElementById('oraInizio')
    var oraFine = document.getElementById('oraFine')
    var durata = document.getElementById('durata')
    var lineaIndicatore = document.getElementById('lineaIndicatore')
    var pallinoFine = document.getElementById('pallinoFine')
    var timeline = document.getElementById('timeline')
    var qrContainer = document.getElementById('qr-container')
    var qrParent = document.getElementById('qr')
    var qrInfo = document.getElementById('qr-info')
    var slideContainer = document.getElementById('slideshow')
    var slideQrInfo = document.getElementById('slide-qr-info')
    var slideshow = document.getElementById('wv-slideshow')
    var txtSlideShowQr = document.getElementById('slide-qr-info')

    var qrcode = new QRCode(qrContainer, {
        text: 'NON DISPONIBILE',
        width: qrContainer.clientWidth,
        height: qrContainer.clientHeight,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
    })

    var inizioConteggio = null

    window.addEventListener('keypress', function (e) {

        if (e.key !== 'Enter')
            codice += e.key

        else {

            if(codice.match(/^[0-9]{10}$/))
                elabora(codice)

            codice = ''
        }
    })

    var to = null
    var last = Date.now()
    var slide_last = null

    function elabora (codice) {

        if (invioInCorso || avvio)
            return

        invioInCorso = true

        if (to !== null) {
            clearTimeout(to)
            to = null
        }

        last = Date.now()

        inizioConteggio = null

        if(slide_last !== null)
            chiudi_slideshow()

        ripristinaInterfaccia()
        badge.innerText = codice
        result.innerHTML = '<span class="wait">ATTENDI</span>'
        qrParent.classList.add('nascondi-qr')

        rilevazioni.unshift({
            nome: '',
            badge: codice,
            ora: Date.now(),
            stato: 2
        })

        disegna()

        invia(function () {
            disegna()

            invioInCorso = false
            last = Date.now()

            to = setTimeout(ripristinaInterfaccia, 15000)
        })
    }

    var template = '<div class="box">' +
        '<div class="{classe}">{stato}</div>' +
        '<div>' +
        '<p>{nome}</p>\n' +
        '<p>{badgeEOra}</p>\n' +
        '</div>\n' +
        '</div>'

    function disegna () {
        var html = ''

        var max = rilevazioni.length > N_MAX_RILEVAZIONI_ELENCO ? N_MAX_RILEVAZIONI_ELENCO : rilevazioni.length

        for (var i = 0; i < max; i++) {
            var tmp = template

            var classe
            var stato

            if (rilevazioni[i].stato === 0) {
                classe = 'failed'
                stato = 'X'

            } else if (rilevazioni[i].stato === 1) {
                classe = 'ok'
                stato = 'OK'

            } else {
                classe = 'wait'
                stato = '?'
            }

            if (rilevazioni[i].nome === '') {

                tmp = tmp.replace('{nome}', rilevazioni[i].badge)
                tmp = tmp.replace('{classe}', classe)
                tmp = tmp.replace('{stato}', stato)
                tmp = tmp.replace('{badgeEOra}', new Date(rilevazioni[i].ora).toLocaleTimeString())

            } else {

                tmp = tmp.replace('{nome}', rilevazioni[i].nome)
                tmp = tmp.replace('{classe}', classe)
                tmp = tmp.replace('{stato}', stato)
                tmp = tmp.replace('{badgeEOra}', rilevazioni[i].badge + ' - ' + new Date(rilevazioni[i].ora).toLocaleTimeString())
            }

            html += tmp
        }

        ultimi.innerHTML = html
    }

    function invia (callback) {
        var rilevazione = rilevazioni[0]

        var xhr = new XMLHttpRequest()
        xhr.open('POST', '/totem/check', true)
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.send(JSON.stringify(rilevazione))

        xhr.onreadystatechange = function () {

            last = Date.now()

            if (xhr.status === 200 && xhr.readyState === XMLHttpRequest.DONE) {

                var json = JSON.parse(xhr.responseText)

                rilevazioni[0] = json

                nome.innerText = json.nome
                badge.innerText = json.badge

                if (json.stato === 0) {
                    result.innerHTML = '<span class="failed">ERRORE</span>'

                } else {
                    result.innerHTML = '<span class="ok">OK</span>'

                    timeline.style.display = 'block'
                    msInizio.innerText = json.inizio.makerspace
                    oraInizio.innerText = (new Date(json.inizio.orario * 1000)).toLocaleString()

                    if (json.fine !== null) {
                        msFine.innerText = json.fine.makerspace
                        oraFine.innerText = (new Date(json.fine.orario * 1000)).toLocaleString()

                        lineaIndicatore.classList.remove('in-progress')
                        pallinoFine.classList.remove('in-progress')
                    }

                    inizioConteggio = null

                    if (json.durata !== null)
                        durata.innerText = json.durata

                    else
                        inizioConteggio = Date.now()
                }

                callback()
            } else if (xhr.readyState === XMLHttpRequest.DONE) {
                result.innerHTML = '<span class="failed">ERRORE</span>'
                rilevazioni[0].stato = 0
                callback()
            }
        }
    }

    function conteggio () {
        if (inizioConteggio !== null)
            durata.innerText = Math.floor((Date.now() - inizioConteggio) / 1000) + 's'
    }

    function ripristinaInterfaccia () {

        to = null
        inizioConteggio = null

        if (avvio)
            return

        nome.innerText = ''
        badge.innerText = ''
        result.innerHTML = '<span class="ok">avvicina il badge al lettore</span>'

        timeline.style.display = 'none'
        oraInizio.innerText = ''
        oraFine.innerText = ''
        msInizio.innerText = ''
        msFine.innerText = ''
        durata.innerText = ''

        if (!pallinoFine.classList.contains('in-progress'))
            pallinoFine.classList.add('in-progress')

        if (!lineaIndicatore.classList.contains('in-progress'))
            lineaIndicatore.classList.add('in-progress')


        qrParent.classList.remove('nascondi-qr')
    }

    function avvioTotem () {

        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/totem/config', true)
        xhr.send()

        xhr.onreadystatechange = function () {

            if (xhr.status === 200 && xhr.readyState === XMLHttpRequest.DONE) {

                var json = JSON.parse(xhr.responseText)

                if (json.enabled === false) {
                    if (avvio === false)
                        avvio = true

                    nome.innerText = ''
                    badge.innerText = ''
                    result.innerHTML = '<span class="wait">TOTEM DISABILITATO</span>'

                } else if (avvio) {
                    avvio = false
                    ripristinaInterfaccia()
                }

                document.getElementById('marquee').innerText = json.marquee
            } else if (xhr.readyState === XMLHttpRequest.DONE) {

                if (avvio === false)
                    avvio = true

                nome.innerText = ''
                badge.innerText = ''
                result.innerHTML = '<span class="failed">DISCONNESSO</span>'
            }
        }
    }

    function richiedi_qr () {
        qrcode.clear()

        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/qr', true)
        xhr.send()

        xhr.onreadystatechange = function () {

            if (xhr.status === 200 && xhr.readyState === XMLHttpRequest.DONE) {

                var json = JSON.parse(xhr.responseText)

                if (json.code !== null) {
                    qrContainer.style.visibility = 'visible'
                    qrInfo.style.visibility = 'visible'
                    txtSlideShowQr.style.display = 'inline'

                    qrcode.clear()
                    qrcode.makeCode(json.code)
                } else {
                    qrContainer.style.visibility = 'hidden'
                    qrInfo.style.visibility = 'hidden'
                    txtSlideShowQr.style.display = 'none'
                }

            } else if (xhr.readyState === XMLHttpRequest.DONE) {
                qrParent.style.visibility = 'hidden'
                qrSlideContainer.style.visibility = 'hidden'
            }
        }
    }

    function avvia_slideshow() {
        if(last + TIMEOUT_SCREENSAVER > Date.now() || invioInCorso)
            return

        if(slide_last !== null)
            return

        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/slideshow', true)
        xhr.send()

        slide_last = Date.now()

        xhr.onreadystatechange = function () {

            if (xhr.status === 200 && xhr.readyState === XMLHttpRequest.DONE) {

                slide_last = Date.now()

                var json = JSON.parse(xhr.responseText)

                if (json.slideshow !== null) {
                    slide_last = Date.now()

                    slideshow.src = json.slideshow

                    slideContainer.style.display = 'block'

                    qrParent.classList.add('qr-slide')

                    setTimeout(function() {
                        chiudi_slideshow()
                    }, TIMEOUT_SCREENSAVER)
                } else {
                    chiudi_slideshow()
                }

            } else if (xhr.readyState === XMLHttpRequest.DONE) {
                chiudi_slideshow()
            }
        }
    }

    function chiudi_slideshow() {
        slideContainer.style.display = 'none'
        slide_last = null
        last = Date.now()
        qrParent.classList.remove('qr-slide')
    }

    richiedi_qr()
    avvioTotem()
    setInterval(avvioTotem, 2000)
    setInterval(conteggio, 500)
    setInterval(richiedi_qr, 5000)
    setInterval(avvia_slideshow, 1000)
})
