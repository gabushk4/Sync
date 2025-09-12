const {DateTime} = require('luxon')

function formaterDateVersClient(dateSQL){
    const dt = DateTime.fromSQL(dateSQL, {zone:'utc'}).toISO({includeOffset:false, })
    //console.log('date formatée vers client', dateSQL, '->', DateTime.fromISO(dt).toISO({includeOffset:false}))
    return dt
}

module.exports = {formaterDateVersClient}